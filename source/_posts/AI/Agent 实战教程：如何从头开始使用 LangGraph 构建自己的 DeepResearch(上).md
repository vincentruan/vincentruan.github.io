---
disableNunjucks: true
title: "Agent 实战教程：如何从头开始使用 LangGraph 构建自己的 DeepResearch(上)"
date: 2025-09-07 00:00:00
categories: AI
tags:
- LangGraph
- 智能体开发
- DeepResearch
- 研究助手
- 多智能体
- 状态管理
- 搜索工具
- 工作流设计
- Agent智能体
- Agent开发
description: "本文手把手教你使用LangGraph构建深度研究智能体DeepResearch。文章介绍研究型智能体为什么适合Agent架构：需要高自主性和决策能力、主题和信息源事先未知、可灵活运用不同策略。教程展示如何实现范围明确、研究执行、报告生成三步流程，以及多智能体架构和提示工程技术的应用。"
---

有了前几天对于 LangGraph 的基础学习，今天我们尝试大家一个搜索研究智能体

<!-- more -->

## **DeepResearch 背景介绍**

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255885327.png)

总所周知，DeepResearch（深度研究）已经成为最受欢迎的智能体应用之一，很多大厂以及 Ai Lab 都有自己的深度研究产品，这些产品使用各种上下文来源生成全面的报告，并且我们看到很多公司内部也开始构建自己的深度研究智能体。

这些智能体通常会自动搜索和生成报告，涵盖各种潜在的上下文来源，可能是内部文件，也可能是开放的网络资源，他们可以通过多种方式引导生成不同类型的报告。研究的挑战在于根据不同的请求，研究需要不同的搜索策略或者搜索深度，这与也是智能体为什么被用于这项任务的原因，这是因为智能体简单地在循环中调用工具，它们可以指导自己的过程，也可以回溯，可以根据例如前一步搜索的结果来决定下一步的工作，因此代理非常灵活，非常适合这项研究任务。

Research 本身就是一个智能体很好的用例，因为事先不知道主题以及信息来源，所以要求程序需要具备比较高的自主性以及决策能力，但是 DeepResearch 能在一定结构的情况下效果表现算是最好的。首先与用户进行交流，了解他们具体需要什么, 然后再开始研究这样会帮助系统更好的完成任务，使用上下文工程技术也可以提高结果的质量。例如，让多个研究人员各自专注于一个特定领域，可以使他们处理更相关的信息，而不被无关的内容分散注意力或感到困惑。

笔者在学习完这个教程之后，深有启发，尤其对一些核心组件以及智能体构建有了进一步认识，因为之前看到的知识以及笔记比较零零散散，这个课程比较系统性了介绍如何构建 DeepResearch，建议大家也可以观看这个教程

课程链接： https://academy.langchain.com/courses/take/deep-research-with-langgraph
**项目链接**： https://github.com/langchain-ai/deep_research_from_scratch


通过这个案例，我们会掌握如何使用多智能体架构，并探索提示工程技术，例如如何添加思考步骤，来提高性能并提供对模型决策的见解。

LangGraph 使构建智能体应用变得容易，并且在这种结构化工作流程中表现不错，它内置的持久化层非常适合跟踪多个智能体在长时间内记录研究结果的进展。

智能体非常适合研究，因为它们可以灵活地运用不同的策略，并使用中间结果来指导其探索。开放式深度研究使用智能体进行研究，该研究分为三个步骤：

*   范围——明确研究范围
    
*   研究——进行研究
    
*   撰写——制作最终报告
    

接下来我们使用 LangGraph 来构建 DeepResearch

## **研究范围界定（Scope）**

研究范围界定是 DeepResearch 一个关键环节，通常在任务执行的开始，本质只是一个从与用户进行开放式对话来收集请求的背景信息到生成一个研究简报的过程，这个简报可以被我们的智能体用来指导和引导整个研究过程，这只包含两个简单的步骤：

*   第一步是与用户对话，收集他们请求的背景信息
    
*   第二步是生成一个研究简报，清晰地描述研究的目标
    

### **用户澄清和简报生成**

范围界定的目标是收集研究所需的用户上下文。 以下是我们的整体研究流程：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255885403.png)

我们将分两个阶段确定研究范围：

*   用户澄清 - 确定是否需要用户提供额外澄清
    
*   简报生成 - 将对话转换为详细的研究简报
    
    ![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255885497.png)
    

### **提示语设计**

深度研究工作流程中的一个常见挑战是用户在初始请求中很少提供足够的上下文。请求往往缺乏重要细节，例如：

*   范围和边界：应该包括或排除什么？
    
*   受众和目的：这项研究是为谁做的，为什么？
    
*   具体要求：是否有特定的来源、时间框架或限制？
    
*   术语澄清：领域特定术语或缩略词的含义是什么？ 我们不会做出假设，而是通过有针对性的澄清问题来收集额外的上下文，这确保我们在投入时间进行可能偏离目标的研究之前理解用户的真实意图。
    

下面是研究范围界定的提示语：

````markdown

clarify_with_user_instructions="""以下是用户请求报告时到目前为止交换的消息：
<Messages>
{messages}
</Messages>

今天的日期是 {date}。

评估您是否需要询问澄清问题，或者用户是否已经提供了足够的信息让您开始研究。
重要提示：如果您在消息历史中看到您已经询问过澄清问题，几乎总是不需要再问另一个问题。只有在绝对必要时才询问另一个问题。

如果有缩写词、简称或未知术语，请要求用户澄清。
如果您需要提问，请遵循以下准则：
- 在收集所有必要信息的同时保持简洁
- 确保以简洁、结构良好的方式收集执行研究任务所需的所有信息
- 适当时使用项目符号或编号列表以提高清晰度。确保使用markdown格式，如果字符串输出传递给markdown渲染器，将正确渲染
- 不要询问不必要的信息，或用户已经提供的信息。如果您看到用户已经提供了信息，请不要再次询问

以有效的JSON格式响应，使用以下确切的键：
"need_clarification": boolean,
"question": "<询问用户澄清报告范围的问题>",
"verification": "<我们将开始研究的验证消息>"

如果您需要询问澄清问题，返回：
"need_clarification": true,
"question": "<您的澄清问题>",
"verification": ""

如果您不需要询问澄清问题，返回：
"need_clarification": false,
"question": "",
"verification": "<确认消息，表示您现在将基于提供的信息开始研究>"

对于不需要澄清时的验证消息：
- 确认您有足够的信息继续进行
- 简要总结您从他们的请求中理解的关键方面
- 确认您现在将开始研究过程
- 保持消息简洁和专业
"""


````

````markdown
transform_messages_into_research_topic_prompt = """您将获得到目前为止您和用户之间交换的一组消息。
您的工作是将这些消息转换为更详细和具体的研究问题，用于指导研究。

到目前为止您和用户之间交换的消息是：
<Messages>
{messages}
</Messages>

今天的日期是 {date}。

您将返回一个用于指导研究的单一研究问题。

准则：
1. 最大化具体性和细节
- 包括所有已知的用户偏好，并明确列出要考虑的关键属性或维度
- 重要的是，用户的所有细节都包含在说明中

2. 谨慎处理未说明的维度
- 当研究质量需要考虑用户未指定的其他维度时，将它们确认为开放考虑而不是假设的偏好
- 示例：不要假设"预算友好的选项"，而是说"考虑所有价格范围，除非指定了成本约束"
- 只提及在该领域进行全面研究真正必要的维度

3. 避免无根据的假设
- 永远不要编造用户未说明的具体偏好、约束或要求
- 如果用户没有提供特定细节，明确注明这种缺乏规范
- 指导研究人员将未指定的方面视为灵活的，而不是做出假设

4. 区分研究范围和用户偏好
- 研究范围：应该调查什么主题/维度（可以比用户明确提及的更广泛）
- 用户偏好：具体的约束、要求或偏好（必须只包括用户说明的内容）
- 示例："研究旧金山咖啡店的咖啡质量因素（包括豆类采购、烘焙方法、冲泡技术），主要关注用户指定的口味"

5. 使用第一人称
- 从用户的角度表达请求

6. 来源
- 如果应该优先考虑特定来源，在研究问题中指定它们
- 对于产品和旅行研究，优先直接链接到官方或主要网站（例如，官方品牌网站、制造商页面或亚马逊等信誉良好的电子商务平台用于用户评论），而不是聚合网站或SEO重的博客
- 对于学术或科学查询，优先直接链接到原始论文或官方期刊出版物，而不是调查论文或二次摘要
- 对于人物，尝试直接链接到他们的LinkedIn个人资料，或者如果他们有个人网站的话
- 如果查询是特定语言，优先考虑以该语言发布的来源
"""

````

这两个提示语的输出对应了下面`ClarifyWithUser`和`ResearchQuestion`

### **状态和架构**

首先，我们将为研究过程定义状态对象和架构。

状态对象作为我们在研究工作流程的不同阶段之间存储和传递上下文的主要机制。

我们创建一个 state_scope.py，可以使用它来写入和选择将用于指导研究的上下文。

```python
# state_scope.py
"""研究范围界定的状态定义和Pydantic架构。
这定义了研究代理范围界定工作流程使用的状态对象和结构化架构，
包括研究人员状态管理和输出架构。
"""

import operator
from typing_extensions import Optional, Annotated, List, Sequence

from langchain_core.messages import BaseMessage
from langgraph.graph import MessagesState
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field

# ===== 状态定义 =====

class AgentInputState(MessagesState):
    """完整代理的输入状态 - 仅包含来自用户输入的消息。"""
    pass

class AgentState(MessagesState):
    """
    完整多代理研究系统的主状态。
    
    使用额外的字段扩展MessagesState以进行研究协调。
    注意：某些字段在不同状态类之间重复，以便在子图和主工作流程之间
    进行适当的状态管理。
    """

    # 从用户对话历史生成的研究简报
    research_brief: Optional[str]
    # 与监督代理交换的协调消息
    supervisor_messages: Annotated[Sequence[BaseMessage], add_messages]
    # 在研究阶段收集的原始未处理研究笔记
    raw_notes: Annotated[list[str], operator.add] = []
    # 为报告生成准备的已处理和结构化笔记
    notes: Annotated[list[str], operator.add] = []
    # 最终格式化的研究报告
    final_report: str

# ===== 结构化输出架构 =====

class ClarifyWithUser(BaseModel):
    """用户澄清决策和问题的架构。"""
    
    need_clarification: bool = Field(
        description="是否需要向用户询问澄清问题。",
    )
    question: str = Field(
        description="询问用户澄清报告范围的问题",
    )
    verification: str = Field(
        description="用户提供必要信息后我们将开始研究的验证消息。",
    )

class ResearchQuestion(BaseModel):
    """结构化研究简报生成的架构。"""
    
    research_brief: str = Field(
        description="将用于指导研究的研究问题。",
    )

```

```python
# research_agent_scope.py

"""用户澄清和研究简报生成。

此模块实现研究工作流程的范围界定阶段，我们：
1. 评估用户的请求是否需要澄清
2. 从对话中生成详细的研究简报

工作流程使用结构化输出来做出关于是否存在足够上下文
以继续研究的确定性决策。
"""

from datetime import datetime
from typing_extensions import Literal

from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, AIMessage, get_buffer_string
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

from deep_research_from_scratch.prompts import clarify_with_user_instructions, transform_messages_into_research_topic_prompt
from deep_research_from_scratch.state_scope import AgentState, ClarifyWithUser, ResearchQuestion, AgentInputState

# ===== 实用函数 =====

def get_today_str() -> str:
    """获取人类可读格式的当前日期。"""
    return datetime.now().strftime("%a %b %-d, %Y")

# ===== 配置 =====

# 初始化模型
model = init_chat_model(model="openai:gpt-4.1", temperature=0.0)

# ===== 工作流程节点 =====

def clarify_with_user(state: AgentState) -> Command[Literal["write_research_brief", "__end__"]]:
    """
    确定用户的请求是否包含足够的信息以继续研究。
    
    使用结构化输出做出确定性决策并避免幻觉。
    路由到研究简报生成或以澄清问题结束。
    """
    # 设置结构化输出模型
    structured_output_model = model.with_structured_output(ClarifyWithUser)

    # 使用澄清指令调用模型
    response = structured_output_model.invoke([
        HumanMessage(content=clarify_with_user_instructions.format(
            messages=get_buffer_string(messages=state["messages"]), 
            date=get_today_str()
        ))
    ])
    
    # 基于澄清需求进行路由
    if response.need_clarification:
        return Command(
            goto=END, 
            update={"messages": [AIMessage(content=response.question)]}
        )
    else:
        return Command(
            goto="write_research_brief", 
            update={"messages": [AIMessage(content=response.verification)]}
        )

def write_research_brief(state: AgentState):
    """
    将对话历史转换为全面的研究简报。
    
    使用结构化输出确保简报遵循所需格式
    并包含有效研究的所有必要细节。
    """
    # 设置结构化输出模型
    structured_output_model = model.with_structured_output(ResearchQuestion)
    
    # 从对话历史生成研究简报
    response = structured_output_model.invoke([
        HumanMessage(content=transform_messages_into_research_topic_prompt.format(
            messages=get_buffer_string(state.get("messages", [])),
            date=get_today_str()
        ))
    ])
    
    # 使用生成的研究简报更新状态并将其传递给监督者
    return {
        "research_brief": response.research_brief,
        "supervisor_messages": [HumanMessage(content=f"{response.research_brief}。")]
    }

# ===== 图构建 =====

# 构建范围界定工作流程
deep_researcher_builder = StateGraph(AgentState, input_schema=AgentInputState)

# 添加工作流程节点
deep_researcher_builder.add_node("clarify_with_user", clarify_with_user)
deep_researcher_builder.add_node("write_research_brief", write_research_brief)

# 添加工作流程边
deep_researcher_builder.add_edge(START, "clarify_with_user")
deep_researcher_builder.add_edge("write_research_brief", END)

```

```python
# 编译工作流程
scope_research = deep_researcher_builder.compile()
png_data=scope_research.get_graph(xray=True).draw_mermaid_png()
with open("scope_research.png", "wb") as f:
    f.write(png_data)

```

可以看到流程图如下：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255885581.png)

```python
from utils import format_messages
from langchain_core.messages import HumanMessage
thread = {"configurable": {"thread_id": "1"}}
result = scope_research.invoke({"messages": [HumanMessage(content="我想调研北京市最好的咖啡店。")]}, config=thread)
format_messages(result['messages'])

```

输出如下：

```txt
┌────────────────────────────────── 🧑 人类 ──────────────────────────────────┐ │ 我想调研北京市最好的咖啡店。                                                │ └─────────────────────────────────────────────────────────────────────────────┘ ┌─────────────────────────────────── 📝 AI ───────────────────────────────────┐ │ 为了帮您调研北京市最好的咖啡店，我需要了解一些具体信息：                    │ │                                                                             │ │ 1.                                                                          │ │ **评价标准**：您认为"最好"的标准是什么？（例如：咖啡品质、环境氛围、服务体  │ │ 验、价格水平、地理位置等）                                                  │ │                                                                             │ │ 2.                                                                          │ │ **区域范围**：您希望调研北京市的特定区域吗？（如朝阳区、海淀区、东城区等）  │ │ ，还是全市范围？                                                            │ │                                                                             │ │ 3.                                                                          │ │ **咖啡店类型**：您偏好什么类型的咖啡店？（连锁品牌如星巴克、瑞幸，还是独立  │ │ 精品咖啡馆？）                                                              │ │                                                                             │ │ 4. **预算范围**：您期望的人均消费水平是多少？                               │ │                                                                             │ │ 请提供这些信息，我将为您进行详细的调研分析。                                │ └─────────────────────────────────────────────────────────────────────────────┘

```

```python
#result = scope.invoke({"messages": [HumanMessage(content="让我们通过咖啡质量来评估旧金山最好的咖啡店。")]}, config=thread)
result = scope_research.invoke({"messages": [HumanMessage(content="让我们通过咖啡的质量来评估北京最好的咖啡店，质量的标准有价格、环境、服务、位置，这些信息你来不确定，不用询问我,评估10家就行，其他因素不用考虑了")]}, config=thread)

format_messages(result['messages'])

```

输出如下：

```
┌────────────────────────────────── 🧑 人类 ──────────────────────────────────┐
│ 让我们通过咖啡的质量来评估北京最好的咖啡店，质量的标准有价格、环境、服务、  │
│ 位置，这些信息你来不确定，不用询问我,评估10家就行，其他因素不用考虑了       │
└─────────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────── 📝 AI ───────────────────────────────────┐
│ 我理解您需要评估北京最好的10家咖啡店，基于咖啡质量的四个标准：价格、环境、  │
│ 服务、位置。我将开始研究这些信息，为您提供一份详细的评估报告。              │
└─────────────────────────────────────────────────────────────────────────────┘

```

这里发现如果用户描述的需求不清楚，大模型会一直询问清楚，比如我一开始的时候输入的查询是`让我们通过咖啡质量来评估旧金山最好的咖啡店。`, 如果大模型会询问质量的标准是什么，定义了标准又询问需要调研多少家等

```python
from rich.markdown import Markdown
Markdown(result["research_brief"])

```

输出的研目标的简要如下：

```
我需要研究北京最好的10家咖啡店，基于咖啡质量的四个核心标准：价格、环境、服务、位置。具体来说：  1. 价格维度：分析每家咖啡店的咖啡价格区间，包括不同饮品（如美式、拿铁、手冲等）的价格水平，但用户未指定具体的预算约束，因此考虑所有价格范围  2. 环境维度：评估咖啡店的装修风格、座位舒适度、空间布局、噪音水平、整体氛围等环境因素  3. 服务维度：考察员工专业程度、服务态度、出餐速度、个性化服务体验等服务质量指标  4. 位置维度：分析咖啡店的地理位置便利性，包括交通可达性、周边环境、是否靠近商业区或景点等  我需要收集这10家咖啡店的详细信息，包括但不限于： - 每家店的具体地址和联系方式 - 营业时间 - 价格菜单和饮品选择 - 环境照片或描述 - 顾客评价和评分 - 特色咖啡和服务  优先考虑来自官方咖啡店网站、大众点评、美团等本地生活平台，以及咖啡爱好者社区的真实评价和信息。研究应该基于2025年的最新数据，确保信息的时效性和准确性。

```

这个研究目标摘要报告会知道我们后续 Research 的过程，为了让生成的内容更加贴切用户需求，否则用户等待了一会生成不符合要求更浪费时间了。

## **研究（Research）**

研究的目标是收集研究简报所要求的上下文信息。

以下是我们的整体研究流程：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255885654.png)

研究是一个开放性的任务。回答用户请求的最佳策略无法轻易地预先确定。

请求可能需要不同的研究策略和不同级别的搜索深度。考虑这个请求：

"比较这两个产品"

比较通常需要对每个产品进行搜索，然后进行综合步骤来比较它们。现在，考虑这个请求：

"给我这个职位招聘的顶级候选人"

列表和排名请求通常需要开放式搜索，然后进行综合和排名。

智能体非常适合研究，因为它们可以灵活地应用不同的策略，使用中间结果来指导它们的探索。

**智能体遵循一个简单而有效的模式：**

*   LLM 决策节点：分析当前状态并决定是进行工具调用还是提供最终响应
    
*   工具执行节点：当 LLM 确定需要更多信息时执行搜索工具
    
*   研究压缩节点：总结和压缩研究发现以进行高效处理
    
*   路由逻辑：基于 LLM 决策确定工作流程的继续
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255885717.png)

### **提示词**

首先，我们将定义一个提示词，指导我们的智能体使用可用的搜索工具。

为了防止过度的工具调用并保持研究专注，我们为智能体使用了几种提示技术：

#### **1. 像智能体一样思考**

你会给新同事什么指导？

*   仔细阅读问题 - 用户需要什么具体信息？
    
*   从更广泛的搜索开始 - 首先使用广泛、全面的查询
    
*   每次搜索后暂停并评估 - 我是否有足够的信息来回答？还缺什么？
    
*   在收集信息时执行更窄的搜索 - 填补空白。
    

#### **2. 具体启发式（防止过度工具调用的 "空转"）**

使用硬限制来防止研究智能体过度调用工具：

*   当你能够自信地回答时就停止 - 不要为了完美而持续搜索。
    
*   给它预算 - 对简单查询使用 2-3 次搜索工具调用。对复杂查询最多使用 5 次。
    
*   限制 - 如果找不到正确的来源，在 5 次搜索工具调用后总是停止。
    

#### **3. 展示你的思考**

在每次搜索工具调用后，使用 think_tool 来分析结果：

*   我找到了什么关键信息？
    
*   还缺什么？
    
*   我是否有足够的信息来全面回答问题？
    
*   我应该继续搜索还是提供答案？
    

### **Research 的核心思路**

这些技术将原有直白的研究行为转变为：

从： "我想调研北京市最好的咖啡店。" → "北京市 Coffee 详情" → "Starbucks Coffee 详情" → "CostaCoffee 详情" → 等等（20 + 搜索）

转变为高效的模式： "我想调研北京市最好的咖啡店" → ThinkTool（分析结果）→ 北京市特色咖啡质量评级 " → ThinkTool（评估完整性）→ 提供答案（3-5 次搜索总计）

**思路的核心：像一个时间有限的人类研究者一样思考 - 这防止了智能体无限期搜索的 "空转问题"。**

**这个思路的核心是：像人一样抓重点。**

它避免了让 AI 像个无头苍蝇一样不停地搜索，而是让它先动脑子，像我们人类在时间紧张时那样：先想清楚要找什么、怎么找最有效，然后用最少的步骤直击目标。

### **研究智能体构建**

我们的研究智能体执行迭代工具调用来搜索信息。

智能体遵循一个简单而有效的模式：

*   **LLM 决策节点**：分析当前状态并决定是进行工具调用还是提供最终响应
    
*   **工具执行节点**：当 LLM 确定需要更多信息时执行搜索工具
    
*   **研究压缩节点**：总结和压缩研究发现以进行高效处理
    
*   **路由逻辑**：基于 LLM 决策确定工作流程的继续
    

我们在两个地方应用上下文工程，遵循智能体上下文工程中概述的原则：

#### **1. 网页内容摘要**

原始搜索结果经常包含过多的噪音（导航、广告、样板内容）。我们的`summarize_webpage_content()`函数：

*   使用结构化输出提取关键信息和相关摘录
    
*   过滤无关内容同时保留事实详情
    
*   将冗长的文章压缩为重点摘要
    
*   保持来源归属以确保可信度
    

#### **2. 研究结果压缩**

当智能体执行多次搜索时，对话上下文快速增长。我们的`compress_research()`函数：

*   将多次工具调用的发现综合为连贯的见解
    
*   提取原始笔记进行详细分析，同时保持压缩摘要
    
*   减少后续 LLM 调用的 token 使用
    
*   为报告写作保留基本信息
    

这种双层上下文工程使智能体能够高效处理大量信息，同时保持高质量的研究输出。

#### **3. 执行仔细的压缩**

压缩是有风险的！我们需要非常小心不要丢失有价值的信息。我们将使用 LLM 进行压缩，在系统提示中包含指令，该指令位于可能较长的、token 密集的多次工具调用轨迹之前。长上下文可能导致压缩 LLM 忽视任务指令，导致通用摘要丢失信息。因此，我们通过添加`compress_research_human_message`来强化压缩任务：

*   在压缩时明确重申原始研究主题
    
*   提醒模型保留与特定问题相关的所有信息
    
*   强调全面发现对最终报告生成至关重要
    
*   防止在压缩阶段的任务漂移
    

#### **4. 输出 Token 管理**

研究压缩可能生成长输出。我们需要确保它们不超过模型 token 限制，这可能导致被截断的响应，如 "**Sextant Coffee Ro" 被截断。例如，GPT-4.1 的输出限制高达 33k tokens，Claude4 sonnet 支持 64k。

模型 SDK / LangChain 集成可能会限制这一点（例如，在 Claude 的情况下限制为 1024 tokens）。只需确保设置 max tokens 以确保完整输出。这防止了不完整的压缩输出，并确保保留完整的研究发现。测试不同模型的压缩质量与延迟。例如：

*   Claude4-Sonnet 压缩延迟 99 秒（跟踪）
    
*   GPT-4.1 压缩延迟 38 秒（跟踪）
    

### **Research 智能体构建**

完整代码如下：

```
"""研究智能体实现。

此模块实现了一个研究智能体，可以执行迭代式网络搜索
和综合分析来回答复杂的研究问题。
"""
import getpass
import os

from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek
load_dotenv()
from deep_research_from_scratch.utils import format_messages
from typing_extensions import Literal

from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, filter_messages

from deep_research_from_scratch.state_research import ResearcherState, ResearcherOutputState
from deep_research_from_scratch.utils import tavily_search, get_today_str, think_tool
from deep_research_from_scratch.prompts_zh import research_agent_prompt, compress_research_system_prompt, \
    compress_research_human_message

# ===== 配置 =====

# 设置工具和模型绑定
tools = [tavily_search, think_tool]
tools_by_name = {tool.name: tool for tool in tools}


def _set_env(var: str):
    ifnot os.environ.get(var):
        os.environ[var] = getpass.getpass(f"{var}: ")


_set_env("DEEPSEEK_API_KEY")

model = ChatDeepSeek(model="deepseek-chat")

# 初始化模型
model = ChatDeepSeek(model="deepseek-chat")
model_with_tools = model.bind_tools(tools)
summarization_model = ChatDeepSeek(model="deepseek-chat")
compress_model = ChatDeepSeek(model="deepseek-chat", max_tokens=32000)


# ===== 智能体节点 =====

def llm_call(state: ResearcherState):
    """分析当前状态并决定下一步行动。

    模型分析当前对话状态并决定是否：
    1. 调用搜索工具收集更多信息
    2. 基于收集的信息提供最终答案

    返回包含模型响应的更新状态。
    """
    return {
        "researcher_messages": [
            model_with_tools.invoke(
                [SystemMessage(content=research_agent_prompt)] + state["researcher_messages"]
            )
        ]
    }


def tool_node(state: ResearcherState):
    """执行来自上一个LLM响应的所有工具调用。

    执行来自上一个LLM响应的所有工具调用。
    返回包含工具执行结果的更新状态。
    """
    tool_calls = state["researcher_messages"][-1].tool_calls

    # 执行所有工具调用
    observations = []
    for tool_call in tool_calls:
        tool = tools_by_name[tool_call["name"]]
        observations.append(tool.invoke(tool_call["args"]))

    # 创建工具消息输出
    tool_outputs = [
        ToolMessage(
            content=observation,
            name=tool_call["name"],
            tool_call_id=tool_call["id"]
        ) for observation, tool_call in zip(observations, tool_calls)
    ]

    return {"researcher_messages": tool_outputs}


def compress_research(state: ResearcherState) -> dict:
    """将founded发现压缩成简洁摘要。

    获取所有研究消息和工具输出，创建
    适合监督者决策的压缩摘要。
    """

    system_message = compress_research_system_prompt.format(date=get_today_str())
    messages = [SystemMessage(content=system_message)] + state.get("researcher_messages", []) + [
        HumanMessage(content=compress_research_human_message)]
    response = compress_model.invoke(messages)

    # 从工具和AI消息中提取原始笔记
    raw_notes = [
        str(m.content) for m in filter_messages(
            state["researcher_messages"],
            include_types=["tool", "ai"]
        )
    ]

    return {
        "compressed_research": str(response.content),
        "raw_notes": ["\n".join(raw_notes)]
    }


# ===== 路由逻辑 =====

def should_continue(state: ResearcherState) -> Literal["tool_node", "compress_research"]:
    """确定是否继续研究或提供最终答案。

    根据LLM是否进行了工具调用来确定智能体应该
    继续研究循环还是提供最终答案。

    返回:
        "tool_node": 继续工具执行
        "compress_research": 停止并压缩研究
    """
    messages = state["researcher_messages"]
    last_message = messages[-1]

    # 如果LLM进行了工具调用，继续工具执行
    if last_message.tool_calls:
        return"tool_node"
    # 否则，我们有了最终答案
    return"compress_research"


# ===== 图构建 =====

# 构建智能体工作流
agent_builder = StateGraph(ResearcherState, output_schema=ResearcherOutputState)

# 向图中添加节点
agent_builder.add_node("llm_call", llm_call)
agent_builder.add_node("tool_node", tool_node)
agent_builder.add_node("compress_research", compress_research)

# 添加边来连接节点
agent_builder.add_edge(START, "llm_call")
agent_builder.add_conditional_edges(
    "llm_call",
    should_continue,
    {
        "tool_node": "tool_node",  # 继续研究循环
        "compress_research": "compress_research",  # 提供最终答案
    },
)
agent_builder.add_edge("tool_node", "llm_call")  # 循环回去进行更多研究
agent_builder.add_edge("compress_research", END)

# 编译智能体
researcher_agent = agent_builder.compile()



```

这里我们用之前用户需求范围明确的结果来作为研究的输入：

```
# 示例研究简报
research_brief = """我需要研究北京最好的10家咖啡店，基于咖啡质量的四个核心标准：价格、环境、服务、位置。具体来说：

1. 价格维度：分析每家咖啡店的咖啡价格区间，包括不同饮品（如美式、拿铁、手冲等）的价格水平，但用户未指定具体的预算约束，因此考虑所有价格范围

2. 环境维度：评估咖啡店的装修风格、座位舒适度、空间布局、噪音水平、整体氛围等环境因素

3. 服务维度：考察员工专业程度、服务态度、出餐速度、个性化服务体验等服务质量指标

4. 位置维度：分析咖啡店的地理位置便利性，包括交通可达性、周边环境、是否靠近商业区或景点等

我需要收集这10家咖啡店的详细信息，包括但不限于：
- 每家店的具体地址和联系方式
- 营业时间
- 价格菜单和饮品选择
- 环境照片或描述
- 顾客评价和评分
- 特色咖啡和服务

优先考虑来自官方咖啡店网站、大众点评、美团等本地生活平台，以及咖啡爱好者社区的真实评价和信息。研究应该基于2025年的最新数据，确保信息的时效性和准确性。"""

result = researcher_agent.invoke({"researcher_messages": [HumanMessage(content=f"{research_brief}.")]})
print(result)
format_messages(result['researcher_messages'])



```

完整代码可以查看：https://github.com/yanqiangmiffy/Agent-Tutorials-ZH/tree/main/deep_research_from_scratch

另外发现了一个 Langgraph 调试插件，推荐给大家：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255885793.png)

插件地址：https://plugins.jetbrains.com/plugin/26921-ai-agents-debugger

通过这个插件，我们可以看到中间一些结果状态，对于我们判断节点是否执行成功非常有帮助：

*   搜索结果
    
    ![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255885888.png)
    
*   模型反思结果：
    
    ![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255886016.png)
    

下面是研究智能体输出的部分结果：

```
┌──────────────────────────────── 🔧 工具输出 ────────────────────────────────┐
│ 反思已记录: 太好了！我获得了完整的2025年北京咖啡馆排行榜信息：              │
│                                                                             │
│ 1. 豆叔咖啡 - 人均¥37，排名第一                                             │
│ 2. Voyage coffee - 人均¥48，后海/南锣鼓巷                                   │
│ 3. METAL HANDS - 人均¥50，东直门/雍和宫                                     │
│ 4. Coffee Craft·CC咖啡馆 - 西直门，400平米超大空间                          │
│ 5. 我与地坛thecorner - 东直门，书香咖啡馆                                   │
│ 6. ON Emotions - 三里屯，前身为Ocean Grounds                                │
│ 7. CupOne - 望京，电视剧取景地                                              │
│ 8. 猫头鹰公社 - 咖啡与精酿啤酒双料小馆                                      │
│                                                                             │
│ 所有咖啡馆的口味、环境、服务评分均为4.5分（满分5分）。                      │
│                                                                             │
│ 我已经收集到了足够的信息来提供全面的回答。我有：                            │
│ - 完整的8家顶级咖啡馆列表（接近10家）                                       │
│ - 每家店的人均价格                                                          │
│ - 位置信息                                                                  │
│ - 环境特色描述                                                              │
│ - 评分信息                                                                  │
│ - 部分具体的地址信息                                                        │
│                                                                             │
│ 我可以基于这些信息提供详细的回答了。                                        │
└─────────────────────────────────────────────────────────────────────────────┘



```

```
┌─────────────────────────────────── 📝 AI ───────────────────────────────────┐
│ 基于我的研究，我为您整理了北京最好的8家精品咖啡店（基于2025年最新数据），按 │
│ 照咖啡质量的四个核心标准进行分析：                                          │
│                                                                             │
│ ## 北京顶级精品咖啡店排行榜（2025）                                         │
│                                                                             │
│ ### 1. 豆叔咖啡烘焙工坊                                                     │
│ **价格维度**：人均¥37，价格公道合理                                         │
│ **环境维度**：专注咖啡烘焙十几年的老店，在北京咖啡烘焙圈享有极高声誉        │
│ **服务维度**：专业度高，咖啡发烧友公认的北京最佳咖啡馆                      │
│ **位置维度**：具体地址需进一步确认，但在咖啡爱好者中知名度极高              │
│ **特色**：推荐手冲咖啡、美式、拿铁，自家烘焙咖啡豆                          │
│                                                                             │
│ ### 2. Voyage Coffee                                                        │
│ **价格维度**：人均¥48                                                       │
│ **环境维度**：双面透明落地玻璃窗，木质装修风格，与热闹的南锣鼓巷仅一街之隔  │
│ **服务维度**：Tripadvisor评分4.6分（19条评论）                              │
│ **位置维度**：后海/南锣鼓巷区域，交通便利                                   │
│ **特色**：通透的视觉体验，金黄的枯叶间若隐若现的招牌                        │
│                                                                             │
│ ### 3. METAL HANDS（五道营店）                                              │
│ **价格维度**：人均¥50                                                       │
│ **环境维度**：东城区五道营胡同61号，胡同老房子设计，透明玻璃天顶，水泥色石  │
│ 砖墙                                                                        │
│ **服务维度**：营业时间09:00-19:00，使用金巴利拉杆咖啡机                     │
│ **位置维度**：五道营胡同与箭厂胡同交叉口东50米                              │
│ **特色**：自家烘焙咖啡豆（7天内新鲜烘焙），专注于黑咖啡（美式、手冲）和白咖 │
│ 啡（拿铁、摩卡等）                                                          │
│                                                                             │
│ ### 4. Coffee Craft·CC咖啡馆                                                │
│ **价格维度**：具体价格待确认，但属于精品咖啡价位                            │
│ **环境维度**：400平米超大空间，由英国皇家建筑师协会特许资质的UUA建筑师事务  │
│ 所设计                                                                      │
│ **服务维度**：口味、环境、服务评分均为4.5分                                 │
│ **位置维度**：西直门/北京展览馆区域，高梁桥斜街59号长河湾小区               │
│ **特色**：莎翁咖啡的新店，极佳的空间体验                                    │
│                                                                             │
│ ### 5. 我与地坛thecorner                                                    │
│ **价格维度**：精品咖啡标准价格                                              │
│ **环境维度**：和平里南街西口甲8号，以史铁生《我与地坛》命名，自带安宁与书香 │
│ 气质                                                                        │
│ **服务维度**：评分4.5分，联系电话010-84216662                               │
│ **位置维度**：东直门/雍和宫区域，B汽车服务中心体验中心1层                   │
│ **特色**：文化氛围浓厚，宁静的阅读环境                                      │
│                                                                             │
│ ### 6. ON Emotions                                                          │
│ **价格维度**：精品咖啡价位                                                  │
│ **环境维度**：工体北路13号院1号楼海隆石油大厦北门1层105                     │
│ **服务维度**：联系电话010-57439548，前身为Ocean Grounds                     │
│ **位置维度**：三里屯/工人体育馆区域，时尚商圈                               │
│ **特色**：现代时尚风格，适合商务会谈                                        │
│                                                                             │
│ ### 7. CupOne                                                               │
│ **价格维度**：人均消费属于中高端                                            │
│ **环境维度**：阜安西路11号合生·麒麟新天地D座2层203，弧形外墙设计，极强的设  │
│ 计感                                                                        │
│ **服务维度**：联系电话010-53630599                                          │
│ **位置维度**：望京/798区域，与望京SOHO仅一路之隔                            │
│ **特色**：电视剧《咱们结婚吧》取景地，独特建筑设计                          │
│                                                                             │
│ ### 8. 猫头鹰公社Owlery cafe & brew                                         │
│ **价格维度**：综合价位                                                      │
│ **环境维度**：青年路29号院华纺易城22号楼15层                                │
│ **服务维度**：联系电话13810506081                                           │
│ **位置维度**：青年路区域                                                    │
│ **特色**：咖啡与精酿啤酒双料小馆，多元化的饮品选择                          │
│                                                                             │
│ ## 总结分析                                                                 │
│                                                                             │
│ **价格范围**：人均¥37-50，属于北京精品咖啡的标准价格区间                    │
│ **环境特色**：从胡同老房到现代设计，从书香文化到时尚商圈，多样性丰富        │
│ **服务质量**：所有上榜咖啡馆的口味、环境、服务评分均为4.5分（满分5分）      │
│ **位置分布**：覆盖东城、西城、朝阳等多个区域，交通便利性良好                │
│                                                                             │
│ 这些咖啡馆都代表了北京精品咖啡的最高水平，每家都有独特的特色和定位，能够满  │
│ 足不同消费者的需求。                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

```

>/ 作者：致 Great

 >/ 作者：欢迎转载，标注来源即可

--------------------- 更多资料 -------------------------

[LangGraph 结构化输出详解：让智能体返回格式化数据](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247495182&idx=1&sn=ab776caab4483b060caa2aec36ce3349&scene=21#wechat_redirect)

[Agent 实战教程：深度解析 async 异步编程在 Langgraph 中的性能优化](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247495169&idx=1&sn=b625be26a48722d64c58a6f4955ad9cb&scene=21#wechat_redirect)

[Agent 实战教程：Langgraph 的 StateGraph 以及 State 怎么用](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247495153&idx=1&sn=fddcd7bdaa2885774732520a3385753a&scene=21#wechat_redirect)

[Agent 实战教程：LangGraph 核心概念节点、边以及状态详解](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247495129&idx=1&sn=44409c4ca1e7d4db1a0ef8a83db21949&scene=21#wechat_redirect)

[Agent 实战教程：LangGraph 关于智能体的架构模式与核心概念](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247495134&idx=1&sn=3797452e6e5ed51e5de51f585402d0c5&scene=21#wechat_redirect)

[Agent 实战教程：LangGraph 中工作流与智能体区别与实现](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247495116&idx=1&sn=41efb6be3403424c3f4fc2da7f4410c0&scene=21#wechat_redirect)

[Agent 实战教程：LangGraph 相关概念介绍以及快速入门](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247495068&idx=1&sn=a1b85990ea29bb0c0f71e3786e6d58a3&scene=21#wechat_redirect)

[Deep Agents：用于复杂任务自动化的 AI 代理框架](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247495010&idx=1&sn=9315b7a5c66e6472e3386c0b077bbda5&scene=21#wechat_redirect)

[一图概览 2024 年到 2025 年 AI Agent 的发展趋势](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494998&idx=1&sn=5941cc9906ad8d4f083d72a754c5b6f0&scene=21#wechat_redirect)

[警惕 AI 智能体构建误区：生产级系统的实战经验分享](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494902&idx=1&sn=bbe7952784edb8087cc79cb3ac77fd76&scene=21#wechat_redirect)

[AI 代理的上下文工程：构建 Manus 的经验教训](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494870&idx=1&sn=063772116f0ea17ba1dd3a999643a242&scene=21#wechat_redirect)

[基于 Gemini API 进行大模型函数调用的指南与经验总结](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494741&idx=1&sn=61441837814ab027422db17f9466226a&scene=21#wechat_redirect)

[Kimi K2 智能体能力的技术突破：大规模数据合成 + 通用强化学习](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494722&idx=1&sn=b8868862267a8a08d2b72d1d9c72c382&scene=21#wechat_redirect)

[构建 AI Agent 的完整实战指南：从邮件助手案例看 6 步落地方法](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494713&idx=1&sn=cf29043ec6e2cd0a39dc11a34f8df330&scene=21#wechat_redirect)

[企业级 AI 智能体系统的 5 种核心工作流模式](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494708&idx=1&sn=adfddac739b76a7307b9495dbf63fec9&scene=21#wechat_redirect)

[Context Engineering：从 Prompt Engineering 到上下文工程的演进](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494673&idx=1&sn=655cb32b062d32c2df04b75b3fb03c18&scene=21#wechat_redirect)

[如何用 LangGraph 打造 Web Research 多智能体系统](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494600&idx=1&sn=13d9186e0feb80d4d8d09df14ff3474e&scene=21#wechat_redirect)

[智能体框架：11 个顶级 AI Agent 框架！](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494594&idx=1&sn=4bdd0b0bf64fa16b32b6b4b605c54256&scene=21#wechat_redirect)

[Anthropic 关于智能体的经验分享：如何构建高效的 Agent？](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494464&idx=1&sn=90cf04ad1824b9320fb394f97080205d&scene=21#wechat_redirect)

[AI 智能体框架对比表](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494325&idx=2&sn=57ee28c4a4e9373ac699ae0c82dff3c9&scene=21#wechat_redirect)

[Gemini 开源项目 DeepResearch：基于 LangGraph 的智能研究 Agent 技术原理与实现](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494255&idx=1&sn=f2a8db81e74d4d999f1f73b842951ddd&scene=21#wechat_redirect)

[智能体卷疯了，又一款 Agent 框架开源了 Lemon AI](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494229&idx=1&sn=2a6d2052af214a043f006c7c14062cb8&scene=21#wechat_redirect)

[大模型 Agent 就是文字艺术吗？](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494174&idx=1&sn=5e74db42c52096e1f6996e55d4c63d47&scene=21#wechat_redirect)

[xAI 把 Grok 的系统提示词全部公开了，我们看看 DeepResearch 的系统提示词怎么设计的?](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247494081&idx=1&sn=4e9eff8e847188bcaa15e165ca7a3d4f&scene=21#wechat_redirect)

[OpenAI API JSON 格式指南与 json_repair 错误修复](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247493958&idx=1&sn=7aa82040053d123a1776e18d0376b7fb&scene=21#wechat_redirect)

[txtai：全能 AI 框架](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247493760&idx=1&sn=3c7d07fecadc2ac1cff73c19300023ba&scene=21#wechat_redirect)

[Suna - 开源智能体助手](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247493697&idx=1&sn=625aac93b103d914d80b941900618266&scene=21#wechat_redirect)

[谷歌的 A2A 到底是什么东西？](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247493463&idx=2&sn=a5944a02d20c1eeeae8f6a6281c149f0&scene=21#wechat_redirect)

[如何在 Agent 中设置 Memory](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247493408&idx=1&sn=3813dbabe9082c4272f109487a800815&scene=21#wechat_redirect)

[体验智能体构建过程：从零开始构建 Agent](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247493390&idx=1&sn=3567bba8802a26f40648943fd4aa4c9e&scene=21#wechat_redirect)

[AI 代理是大模型实现可扩展智能自动化的关键](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247493371&idx=1&sn=83d9d413a1ec7d6d028cae73db9acd99&scene=21#wechat_redirect)

[Agent 系列教程 01 - 什么是 Agent？当今为什么这么重要？](https://mp.weixin.qq.com/s?__biz=MzAxOTU5NTU4MQ==&mid=2247493364&idx=1&sn=07e7f5da1f862fdd6e778d462cb2f4f6&scene=21#wechat_redirect)