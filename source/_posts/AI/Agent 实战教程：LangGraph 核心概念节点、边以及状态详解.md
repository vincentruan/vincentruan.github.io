---
title: "Agent 实战教程：LangGraph 核心概念节点、边以及状态详解"
date: 2025-09-07 00:00:00
categories: AI
tags:
- LangGraph
- 节点与边
- 状态管理
- 图结构
- StateGraph
- 核心概念
- Agent实战
- Agent智能体
- Agent开发
description: "本文详细讲解LangGraph的三大核心概念：状态（State）、节点（Nodes）和边（Edges）。状态是共享的数据结构，节点是包含智能体逻辑的函数，边是决定执行路径的函数。文章通过构建包含3个节点和条件边的简单图结构实例，深入浅出地介绍了超步骤、消息传递、图构建和调用等核心机制，为LangGraph智能体开发奠定坚实基础。"
---

# **图结构（Graphs）**

**LangGraph 的核心是将智能体工作流建模为图结构**。你可以通过三个关键组件来定义智能体的行为：

<!-- more -->

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256119278.png)

## **状态（State）**

这是一个共享的数据结构，代表你应用程序的当前快照。它可以是任何数据类型，但通常使用共享状态模式来定义。

简单理解：就像是一个 "记事本"，记录着当前程序运行到什么状态了。

## **节点（Nodes）**

这些是包含智能体逻辑的函数。它们接收当前状态作为输入，执行一些计算或操作，然后返回更新后的状态。

简单理解：就像是 "工作站"，负责干活，处理数据，完成具体任务。

## **边（Edges）**

这些函数决定接下来要执行哪个节点，基于当前状态来判断。它们可以是条件分支或固定的转换路径。

简单理解：就像是 "交通指挥员"，告诉程序下一步该去哪里。

## **核心思想**

通过组合节点和边，你可以创建复杂的、循环的工作流，让状态随时间不断演化。LangGraph 的真正优势来自于它如何管理这些状态。需要强调的是：节点和边本质上就是函数 - 它们可以包含大语言模型，也可以只是普通的代码。

**简而言之：节点负责干活，边负责指路。**

## **运行机制**

LangGraph 的底层图算法使用消息传递来定义通用程序。当一个节点完成操作后，它会沿着一条或多条边向其他节点发送消息。接收消息的节点然后执行自己的函数，将结果消息传递给下一组节点，这个过程持续进行。这个设计灵感来自 Google 的 Pregel 系统，程序以离散的 "超步骤" 进行。

## **超步骤 (super-step) 的概念**

*   一个超步骤可以看作是对图节点的一次完整迭代
    
*   并行运行的节点属于同一个超步骤
    
*   顺序运行的节点属于不同的超步骤
    

## **执行流程**

1.  图执行开始时，所有节点都处于`非活跃`状态
    
2.  当节点在任何传入边（或 "通道"）上收到新消息（状态）时，它变为`活跃`状态
    
3.  活跃节点运行其函数并返回更新结果
    
4.  在每个超步骤结束时，没有收到传入消息的节点会 "投票停止"，将自己标记为`非活跃`
    
5.  当所有节点都是非活跃状态且没有消息在传输时，图执行终止
    

这就像是一个智能的流水线系统，每个工作站（节点）完成任务后，会自动将结果传递给下一个需要工作的站点，直到整个任务完成。

# **构建一个最简单的图结构**

让我们构建一个包含 3 个节点和一个条件边的简单图。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256119417.png)

# **状态（State）**

首先，定义图的状态。

状态模式作为图中所有节点和边的输入模式。

我们使用 Python typing 模块中的 **TypedDict** 类作为模式，它为键提供类型提示。

```python
import random
from typing import Literal
from typing import TypedDict

from langgraph.graph import StateGraph, END, START


# 定义状态 State
class State(TypedDict):
    graph_state: str



```

# **节点（Nodes）**

**节点就是 Python 函数。**

第一个位置参数是状态，如上所定义。

因为状态是一个具有上述模式的 TypedDict，每个节点都可以通过`state['graph_state']`访问键`graph_state`。

每个节点返回状态键`graph_state`的新值。

默认情况下，每个节点返回的新值将覆盖之前的状态值。

```python

# 定义节点 None

def node_1(state: State):
    print("我在运行节点1的功能")
    return {"graph_state": state["graph_state"] + ",我的心情是:"}


def node_2(state: State):
    print("我在运行节点2的功能")
    return {"graph_state": state["graph_state"] + "开心的！"}


def node_3(state: State):
    print("我在运行节点3的功能")
    return {"graph_state": state["graph_state"] + "伤心的！"}def node_1(state):
    print("---节点 1---")
    return {"graph_state": state['graph_state'] + " 我是"}

def node_2(state):
    print("---节点 2---")
    return {"graph_state": state['graph_state'] + " 开心的！"}

def node_3(state):
    print("---节点 3---")
    return {"graph_state": state['graph_state'] + " 伤心的！"}

```

# **边（Edges）**

边连接节点。

**普通边**：如果你想要总是从 node_1 跳转到 node_2，可以使用普通边。

**条件边**：如果你想要在节点之间进行可选路由，可以使用条件边。

条件边被实现为函数，根据某些逻辑返回下一个要访问的节点。

```python

def decide_mood(state: State) -> Literal["node_2", "node_3"]:
    # 用户的输入决定了下一个访问节点
    user_input = state["graph_state"]

    if random.random() < 0.5:
        return "node_2"
    return "node_3"


```

# **图构建（Graph Construction）**

现在，我们从上面定义的组件构建图。

StateGraph 类是我们可以使用的图类。

首先，我们用上面定义的 State 类初始化一个 StateGraph。

然后，添加节点和边。

我们使用 START 节点（一个将用户输入发送到图的特殊节点）来指示图的起始位置。

END 节点是表示终端节点的特殊节点。

最后，我们编译图以对图结构执行一些基本检查。

我们可以将图可视化为 Mermaid 图表。

```python
# 构建图：基于节点+边
builder = StateGraph(State)
# 添加节点
builder.add_node("node_1", node_1)
builder.add_node("node_2", node_2)
builder.add_node("node_3", node_3)

# 添加边
builder.add_edge(START, "node_1")
builder.add_conditional_edges("node_1", decide_mood)
builder.add_edge("node_2", END)
builder.add_edge("node_3", END)

# 编译图
graph = builder.compile()
# 显示工作流
png_data = graph.get_graph().draw_mermaid_png()
with open("graph.png", "wb") as f:
    f.write(png_data)

```

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256119562.png)

# **图的调用（Graph Invocation）**

编译后的图实现了可运行协议。

这提供了执行 LangChain 组件的标准方式。

`invoke`是此接口中的标准方法之一。

输入是一个字典`{"graph_state": "你好，我是Lance。"}`，它为我们的图状态字典设置初始值。

当调用`invoke`时，图从 START 节点开始执行。

它按顺序通过定义的节点（node_1、node_2、node_3）进行。

条件边将使用 50/50 决策规则从节点 1 跳转到节点 2 或 3。

每个节点函数接收当前状态并返回一个新值，该值覆盖图状态。

执行持续到到达 END 节点。

```python
response = graph.invoke({"graph_state": "你好，我是小明"})
print(response)

```

输出：

```
我在运行节点1的功能
我在运行节点2的功能
{'graph_state': '你好，我是小明,我的心情是:开心的！'}

```

# **执行说明**

`invoke`同步运行整个图。

它等待每个步骤完成后再移动到下一个步骤。

它在所有节点执行完毕后返回图的最终状态。

在这个例子中，它返回 node_2 完成后的状态：

`{'graph_state': '你好，我是小明,我的心情是:开心的！'}`


>/ 作者：致 Great

 >/ 作者：欢迎转载，标注来源即可

  

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