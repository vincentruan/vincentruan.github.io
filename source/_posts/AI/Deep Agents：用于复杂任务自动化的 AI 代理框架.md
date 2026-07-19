---
title: "Deep Agents：用于复杂任务自动化的 AI 代理框架"
date: 2025-09-07 00:00:00
categories: AI
tags:
- DeepAgents
- AI代理框架
- 复杂任务自动化
- 子智能体
- 规划工具
- Python框架
- 智能体开发
- Agent智能体
- Agent开发
description: "本文介绍deepagents——一个受Claude Code启发的深度智能体Python框架，旨在让普通开发者也能轻松构建处理复杂任务的智能体系统。框架封装了规划工具、子智能体、文件系统工具和详细提示词等核心技术，支持自定义工具、子智能体和模型配置，可配合MCP使用，帮助开发者快速搭建具备长期规划和多步骤执行能力的深度智能体。"
---

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255940350.png)

## **前言**

说起 AI 智能体，大家可能都不陌生。用大语言模型调用工具，让它循环执行任务，这是最简单的智能体架构。但是问题来了，这种简单的架构往往很 "浅"，碰到复杂的、需要长期规划的任务就歇菜了。

<!-- more -->

不过最近有几个厉害的应用，比如 "Deep Research"、"Manus"，还有 "Claude Code"，它们都成功突破了这个限制。怎么做到的？答案是组合拳：**规划工具**、**子智能体**、**文件系统**，还有**详细的提示词**。

今天要介绍的`deepagents`就是把这套组合拳封装成了一个通用的 Python 包，让大家也能轻松搭建自己的 "深度智能体"。

说句实话，这个项目主要受到 Claude Code 的启发。一开始就是想搞明白 Claude Code 为什么这么通用，然后把它做得更通用一些。

## **快速上手**

### **安装**

```sh

pip install deepagents

```

### **来个例子**

先来看看怎么创建一个研究型智能体（记得先装`pip install tavily-python`）：

```python

import os
from typing import Literal

from tavily import TavilyClient
from deepagents import create_deep_agent

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])

# 搜索工具，用来做调研
def internet_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news", "finance"] = "general",
    include_raw_content: bool = False,
):
    """执行网页搜索"""
    return tavily_client.search(
        query,
        max_results=max_results,
        include_raw_content=include_raw_content,
        topic=topic,
    )

# 给智能体设定角色和能力
research_instructions = """你是一个专业的研究员。你的任务是进行深入调研，然后写出高质量的研究报告。

你可以使用以下工具：

## `internet_search`

用这个工具可以针对特定查询进行网络搜索。你可以指定结果数量、主题类型，以及是否包含原始内容。
"""

# 创建智能体
agent = create_deep_agent(
    [internet_search],
    research_instructions,
)

# 开始使用
result = agent.invoke({"messages": [{"role": "user", "content": "langgraph是什么？"}]})

```

是不是很简单？这里创建的智能体其实就是一个 LangGraph 图，所以你可以像操作其他 LangGraph 智能体一样使用它（支持流式输出、人机交互、记忆功能、可视化调试等）。

## **深度定制你的智能体**

`create_deep_agent`函数有三个核心参数，让你可以打造专属的深度智能体。

### **工具集（必填）**

第一个参数是`tools`，传入一个工具列表。可以是普通函数，也可以是 LangChain 的`@tool`装饰器对象。主智能体和所有子智能体都能使用这些工具。

### **指令（必填）**

第二个参数是`instructions`，这会成为智能体提示词的一部分。不过别担心，框架本身已经内置了一套**系统提示词**，你的指令会和它组合使用。

### **子智能体（可选）**

通过`subagents`关键字参数，你可以定义自定义的子智能体。为什么需要子智能体？下面会详细说明。

`subagents`是一个字典列表，每个字典要包含：

```python
class SubAgent(TypedDict):
    name: str          # 子智能体的名称
    description: str   # 描述信息，主智能体会看到
    prompt: str        # 子智能体专用的提示词
    tools: NotRequired[list[str]]  # 可用的工具列表


```

使用例子：

```python
research_sub_agent = {
    "name": "research-agent",
    "description": "专门用来深度研究复杂问题",
    "prompt": sub_research_prompt,
}
subagents = [research_sub_agent]
agent = create_deep_agent(
    tools,
    prompt,
    subagents=subagents
)

```

### **自定义模型（可选）**

默认情况下，`deepagents`使用的是`"claude-sonnet-4-20250514"`。你也可以传入任何 **LangChain 支持的模型**。

比如想用 Ollama 的模型：

```python
from deepagents import create_deep_agent

# 需要先安装：pip install langchain langchain-ollama

model = init_chat_model(
    model="ollama:gpt-oss:20b",  
)
agent = create_deep_agent(
    tools=tools,
    instructions=instructions,
    model=model,
)

```

## **深度智能体的核心组件**

下面这些组件是`deepagents`内置的，正是它们让智能体能够处理复杂任务。

### **系统提示词**

框架内置了一套**详细的系统提示词**。这套提示词主要参考了一些尝试**复制** Claude Code **系统提示词**的工作，但做得更通用一些。

这套提示词详细说明了如何使用内置的规划工具、文件系统工具和子智能体。没有这套提示词，智能体根本不可能有现在这么好的表现。**好的提示词对于创建 "深度" 智能体来说，重要性怎么强调都不过分。**

### **规划工具**

内置了一个简单但有效的规划工具，灵感来自 Claude Code 的 TodoWrite 工具。这个工具本身不执行任何操作，它的作用是让智能体制定计划，然后把计划保留在上下文中，帮助智能体保持正确的执行轨迹。

### **文件系统工具**

提供了四个内置的文件系统工具：`ls`、`edit_file`、`read_file`、`write_file`。

这些工具不是真的在操作文件系统，而是通过 LangGraph 的 State 对象模拟的。这意味着你可以在同一台机器上运行多个智能体，不用担心它们会互相干扰。

目前的 "文件系统" 只支持一级目录（没有子目录）。

你可以通过 LangGraph 状态对象的`files`键来传入和获取文件：

```python

agent = create_deep_agent(...)

result = agent.invoke({
    "messages": ...,
    # 通过这个键传入文件
    # "files": {"foo.txt": "foo", ...}
})

# 处理完后获取文件
result["files"]

```

### **子智能体**

框架内置了子智能体调用能力（同样基于 Claude Code 的设计）。

默认情况下，每个智能体都有一个`general-purpose`子智能体，它使用和主智能体相同的指令和工具。你也可以定义**自定义子智能体**，给它们专门的指令和工具。

子智能体的好处主要有两个：

1.  **上下文隔离**：避免污染主智能体的上下文
    
2.  **专门指令**：针对特定任务使用专门的提示词
    

## **配合 MCP 使用**

`deepagents`还可以和 MCP 工具配合使用，通过 **Langchain MCP Adapter 库**实现。

```python
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from deepagents import create_deep_agent

asyncdef main():
    # 获取MCP工具
    mcp_client = MultiServerMCPClient(...)
    mcp_tools = await mcp_client.get_tools()

    # 创建智能体
    agent = create_deep_agent(tools=mcp_tools, ...)

    # 流式执行
    asyncfor chunk in agent.astream(
        {"messages": [{"role": "user", "content": "langgraph是什么？"}]},
        stream_mode="values"
    ):
        if"messages"in chunk:
            chunk["messages"][-1].pretty_print()

asyncio.run(main())

```

## **后续计划**

*   [ ] 允许用户完全自定义系统提示词
    
*   [ ] 代码优化（类型提示、文档字符串、格式化）
    
*   [ ] 更强大的虚拟文件系统
    
*   [ ] 创建基于这个框架的深度编程智能体示例
    
*   [ ] 对**深度研究智能体示例**进行基准测试
    
*   [ ] 为工具添加人机交互支持
    

## **结语**

总的来说，`deepagents`把一些高级智能体应用的核心技术民主化了，让普通开发者也能轻松构建出处理复杂任务的深度智能体。如果你正在寻找一个能够进行长期规划、多步骤执行的智能体框架，不妨试试这个项目。