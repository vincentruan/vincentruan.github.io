---
title: "LangGraph 结构化输出详解：让智能体返回格式化数据"
date: 2025-09-07 00:00:00
categories: AI
tags:
- LangGraph
- 结构化输出
- Pydantic
- 数据验证
- JSON格式
- TypedDict
- 智能体开发
- Python
- Agent智能体
- Agent开发
description: "本文详细讲解LangGraph中结构化输出的实现方法，重点介绍.with_structured_output()方法的三种实现方式：Pydantic类（支持数据验证）、TypedDict（支持流式输出）和JSON Schema。通过完整代码示例展示如何在LangGraph工作流中使用结构化输出，以及多模式选择、流式输出、原始输出处理等高级技巧，帮助开发者构建更可靠的AI应用系统。"
---

## **引言**

在使用大语言模型进行开发时，我们经常需要模型返回特定格式的数据，而不是纯文本。比如在构建 AI 应用时，我们可能需要模型返回 JSON 格式的数据用于后续处理，或者返回符合特定数据结构的对象。这就是结构化输出的价值所在。

<!-- more -->

本文将深入探讨 LangGraph 中的结构化输出功能，重点介绍`.with_structured_output()`方法的使用，并通过实际代码示例展示如何在项目中应用这一技术。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255914226.png)

## **什么是结构化输出？**

结构化输出是指 LLM（或 LangGraph 工作流中的其他节点）返回的输出被格式化为明确定义的、机器可读的对象，如字典、列表、自定义类或 JSON 对象，而不是纯文本。

**对比示例：**

*   非结构化输出：`"答案是北京。"`
    
*   结构化输出：`{"城市": "北京", "国家": "中国", "人口": 2154}`
    

## **为什么需要结构化输出？**

在 LangGraph 中，一个节点的输出通常作为另一个节点的输入。如果输出是结构化的，下一步就能准确知道期望什么字段 / 数据以及如何访问它们。这大大提高了系统的可靠性和可维护性。

## **核心技术：.with_structured_output() 方法**

`.with_structured_output()`是获得结构化输出的最简单、最可靠的方法。它专为那些原生支持结构化输出 API（如工具 / 函数调用或 JSON 模式）的模型实现，并在后台使用这些功能。

### **基本工作原理**

该方法接受一个模式作为输入，指定所需输出属性的名称、类型和描述。它返回一个类似于模型的 Runnable，但输出的不是字符串或消息，而是对应于给定模式的对象。

## **实现方式详解**

### **方式一：使用 Pydantic 类**

使用 Pydantic 的主要优点是模型生成的输出将被验证。如果任何必需的字段缺失或任何字段的类型错误，Pydantic 将抛出错误。

```python
from pydantic import BaseModel, Field
from langchain_deepseek import ChatDeepSeek
from typing import Optional

# 定义Pydantic模型
class ProductInfo(BaseModel):
    """产品基本信息"""
    
    name: str = Field(description="产品名称")
    price: float = Field(description="产品价格，单位为元")
    category: str = Field(description="产品所属类别")
    rating: Optional[int] = Field(
        default=None, description="产品评分，1-10分"
    )

# 初始化模型
llm = ChatDeepSeek(model="deepseek-chat")
structured_llm = llm.with_structured_output(ProductInfo)

# 调用示例
result = structured_llm.invoke("帮我分析一下iPhone 15这款手机")
print(result)
# 输出: ProductInfo(name='iPhone 15', price=5999.0, category='智能手机', rating=9)


```

### **方式二：使用 TypedDict**

如果您不想使用 Pydantic 验证，或者希望能够流式输出模型结果，可以使用 TypedDict 类定义模式。

```python
from typing import Optional
from typing_extensions import Annotated, TypedDict

# 使用TypedDict定义模式
class StudentInfo(TypedDict):
    """学生基本信息"""
    
    name: Annotated[str, ..., "学生姓名"]
    age: Annotated[int, ..., "学生年龄"]
    major: Annotated[str, ..., "所学专业"]
    score: Annotated[Optional[float], None, "平均成绩，0-100分"]

structured_llm = llm.with_structured_output(StudentInfo)

result = structured_llm.invoke("张明，20岁，计算机科学专业，平均成绩85分")
print(result)
# 输出: {'name': '张明', 'age': 20, 'major': '计算机科学', 'score': 85.0}


```

### **方式三：使用 JSON Schema**

您也可以直接传入 JSON Schema 字典，这种方式不需要导入额外的类，但代码会更冗长一些。

```python
json_schema = {
    "title": "公司信息",
    "description": "公司基本信息",
    "type": "object",
    "properties": {
        "company_name": {
            "type": "string",
            "description": "公司名称",
        },
        "industry": {
            "type": "string", 
            "description": "所属行业",
        },
        "employee_count": {
            "type": "integer",
            "description": "员工总数",
            "default": None,
        },
    },
    "required": ["company_name", "industry"],
}

structured_llm = llm.with_structured_output(json_schema)
result = structured_llm.invoke("分析一下腾讯公司")
print(result)
# 输出: {'company_name': '腾讯', 'industry': '互联网科技', 'employee_count': 110715}


```

## **LangGraph 中的完整应用示例**

下面是一个完整的 LangGraph 应用示例，展示如何在工作流中使用结构化输出：

```python
import json
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage
from langchain_deepseek import ChatDeepSeek
from langgraph.graph import StateGraph, MessagesState, END
from dotenv import load_dotenv

load_dotenv()

# 定义结构化输出模型
class AnalysisResult(BaseModel):
    """文本分析结果"""
    topic: str = Field(description="文本主要主题")
    summary: str = Field(description="内容摘要，不超过100字")
    keywords: list[str] = Field(description="提取的关键词列表")
    sentiment: str = Field(description="情感倾向：积极/消极/中性")

# 初始化模型
model = ChatDeepSeek(model="deepseek-chat")
structured_llm = model.with_structured_output(AnalysisResult).with_config(tags=["文本分析器"])

# 定义分析节点
def analysis_node(state: MessagesState):
    """对输入文本进行结构化分析"""
    result = structured_llm.invoke(state["messages"])
    print(f"分析结果: {result}")
    
    # 将分析结果转换为AIMessage
    response_content = f"""
📊 分析报告
主题: {result.topic}
摘要: {result.summary}
关键词: {', '.join(result.keywords)}
情感倾向: {result.sentiment}
    """.strip()
    
    return {"messages": [AIMessage(content=response_content)]}

# 构建LangGraph工作流
workflow = StateGraph(MessagesState)
workflow.add_node("分析", analysis_node)
workflow.set_entry_point("分析")
workflow.add_edge("分析", END)

# 编译图
graph = workflow.compile()

# 测试用例
def test_analysis():
    """测试文本分析功能"""
    test_text = """
    人工智能技术正在快速发展，特别是大语言模型的出现，
    为各个行业带来了前所未有的变革机会。从自动化客服到智能写作，
    从代码生成到数据分析，AI正在重塑我们的工作方式。
    虽然技术发展令人兴奋，但我们也需要关注AI伦理和安全性问题。
    """
    
    graph_input = {"messages": [HumanMessage(content=f"请分析以下文本：{test_text}")]}
    
    # 运行分析
    result = graph.invoke(graph_input)
    print("="*50)
    print("最终输出:")
    print(result["messages"][-1].content)

# 执行测试
if __name__ == "__main__":
    test_analysis()

```

## **多模式选择**

有时我们需要让模型在多个输出格式之间进行选择。最简单的方法是创建一个具有 Union 类型属性的父模式：

```python
from typing import Union
from pydantic import BaseModel, Field

class Joke(BaseModel):
    """笑话内容"""
    setup: str = Field(description="笑话的铺垫部分")
    punchline: str = Field(description="笑话的笑点部分")
    rating: Optional[int] = Field(default=None, description="有趣程度，1-10分")

class ConversationalResponse(BaseModel):
    """普通对话回应"""
    response: str = Field(description="对用户查询的对话式回应")

class FinalResponse(BaseModel):
    """最终输出，可以是笑话或普通回应"""
    final_output: Union[Joke, ConversationalResponse]

structured_llm = llm.with_structured_output(FinalResponse)

# 测试不同类型的输入
print("=" * 30)
print("请求笑话:")
result1 = structured_llm.invoke("给我讲个关于程序员的笑话")
print(result1)

print("=" * 30)
print("普通对话:")
result2 = structured_llm.invoke("你今天怎么样？")
print(result2)

```

## **流式输出支持**

当输出类型是字典时（使用 TypedDict 类或 JSON Schema 定义时），我们可以从结构化模型中进行流式输出：

```python
from typing_extensions import Annotated, TypedDict

class NewsSummary(TypedDict):
    """新闻摘要信息"""
    title: Annotated[str, ..., "新闻标题"]
    summary: Annotated[str, ..., "新闻摘要内容"]
    keywords: Annotated[list[str], ..., "新闻关键词"]

structured_llm = llm.with_structured_output(NewsSummary)

print("流式输出示例:")
for chunk in structured_llm.stream("总结今天的科技新闻"):
    print(chunk)

```

## **高级技巧**

### **1. 原始输出处理**

通过设置`include_raw=True`，可以获取原始输出，便于调试和错误处理：

```python
structured_llm = llm.with_structured_output(AnalysisResult, include_raw=True)

result = structured_llm.invoke("分析人工智能发展")
print("原始输出:", result['raw'])
print("解析结果:", result['parsed'])
print("解析错误:", result['parsing_error'])

```

### **2. 指定输出方法**

对于支持多种结构化输出方法的模型，可以通过`method`参数指定使用的方法：

```python
# 使用JSON模式
structured_llm = llm.with_structured_output(AnalysisResult, method="json_mode")

```

## **最佳实践**

1.  **选择合适的模式类型**：
    
2.  *   需要运行时验证 → 使用 Pydantic 的 BaseModel
        
    *   仅需静态类型检查 → 使用 TypedDict
        
    *   需要流式输出 → 使用 TypedDict 或 JSON Schema
        
    
3.  **提供清晰的字段描述**：字段的名称和描述对模型理解输出格式非常重要
    
4.  **使用中文字段名**：在中文应用场景中，使用中文字段名可以提高模型的理解准确性
    
5.  **合理设置可选字段**：使用 Optional 类型和默认值来处理不确定的信息
    

## **总结**

结构化输出是现代 AI 应用开发中的重要技术。通过 LangGraph 的`.with_structured_output()`方法，我们可以轻松让大语言模型返回格式化的数据，提高应用的可靠性和可维护性。

无论是使用 Pydantic 进行严格的数据验证，还是使用 TypedDict 进行灵活的字典操作，或是直接使用 JSON Schema，都能满足不同场景下的需求。关键是根据具体的应用场景选择最合适的实现方式。

在实际项目中，建议优先使用 Pydantic 方式，因为它提供了最好的类型安全和数据验证功能。对于需要流式输出的场景，则可以考虑使用 TypedDict 方式。

通过合理运用这些技术，我们可以构建更加健壮和高效的 AI 应用系统。

>/ 作者：致 Great

 >/ 作者：欢迎转载，标注来源即可