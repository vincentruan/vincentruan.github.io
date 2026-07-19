---
title: "动手学 Agent：Agent 设计模式 (2)——构建有效 Agent 的 7 种模型"
date: 2025-10-11 00:00:00
categories: AI
tags:
- Agent工作流
- 编排模式
- 并行处理
- 评估优化
- 增强型LLM
- Anthropic
- 实践指南
- Agent智能体
- Agent开发
- 动手学Agent
description: "本文解读Anthropic的《Building Effective Agents》，系统介绍七种Agent设计模式：增强型LLM、链式调用、路由模式、并行化、编排器-工作者、评估-优化模式和自主Agent。文章区分了Workflow（预定义代码路径）与Agent（动态指导流程）的概念，通过Dify平台搭建的反思翻译案例展示评估-优化模式的实际效果，强调寻找尽可能简单解决方案的务实原则。"
---

在 2024 年底，Anthropic 发布了文章 Building  effective agents，从实际落地的角度，梳理了目前主流的一些 Agent 设计模式。

<!-- more -->

从严格意义上来讲，上一篇文章动手学 Agent 02：Agent 设计模式 (1)所介绍的 Agent，更贴近 Agent 的概念，但正如我们在动手学 Agent 01：基础概念中所介绍的，Agent 本身的定义也不是绝对的，从 LLM 到最高等级的 Agent，中间是有大量灰度地带的，在 Anthropic 看来，Agent 可以以多种方式定义，有些人将完全自主系统定义为 Agent，而另一些团队则将预定义的工作流程定义为 Agent。在 Anthropic，所有这些变种都定义为 Agent 系统（Agentic System）。

Workflow 和 Agents 的区别：

*   Workflow：LLMs 和工具通过预定义的代码路径编排的系统，也就是用户输入后，它的执行路径，是能够提前预料的，是有人工构建的，像基于 Coze、Dify、n8n 等平台搭建的应用，绝大多数属于这一类
    
*   Agents：LLMs 动态指导自己的流程和工具使用，典型的，比如 Cursor、Windsur、Claude Code 这种编程智能体，你发送指令后，后续它会先向你做一些澄清、帮你开始编写一份技术文档还是调用 MCP 工具来获取一些 API 使用说明等，没人能确切地知道其执行路径
    

为什么上一篇介绍完 “正统” 的 Agent 设计模式后，这一篇还要介绍一些 Workflow 呢？这是因为当前落地的绝大多数 Agent 仍以 Workflow 形式为主，它有三大显著的优势：

*   上手很快，门槛比较低，即使没有学过编程，也能拖拽出一个可以用的应用
    
*   不同场景有自己固定的成熟流程，使用 Workflow 是将这些流程融入 AI 非常低成本的方式
    
*   试错成本低，熟悉基本概念后，对于一个不太复杂的场景，一两天就能用 Coze、Dify 之类的搭建出看起来像样的应用，而构建高度自主化的 Agent，则周期长、成本高
    

Anthropic 在原文的多个地方强调寻找尽可能简单的解决方案，这也确实是一个非常务实的建议，毕竟，在没有清晰实现路径的情况下，小步快跑才是更优选择。

# 1 何时该使用与不该使用 Agents

使用 LLMs 构建应用程序时，建议尽可能找简单的解决方案，仅在需要时增加复杂性。这意味着可能根本不需要构建 Agent。**Agent 系统通常以高延迟和高成本为代价**来获得更好的任务性能。

当需要更高的复杂性时，Workflow 为定义明确的任务提供可预测性和一致性，当需要大规模的灵活性和模型驱动的决策时，Agents 是更好的选择。但是，对于大多数应用，使用检索和 In-Context 样例优化单个 LLM 就足够了。

# 2 代理系统的常见模式

这部分从基础构建块——增强 LLM 开始，逐步增加复杂性，从简单组合的工作流到自主代理。

## 2.1 增强 LLM

通过检索、工具、记忆等模块来增强 LLM

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/f31b060458f1938eb99dc9e96f3f26299b138e17.png)
## 2.2 链式调用

这种模式由一系列 Prompt + LLM 串联成链式结构组成，链可以将任务分解为一系列步骤，每个 LLM 调用都会处理前一个调用的输出，可以对任何中间步骤添加检查（下图中的 Gate）

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/3fa87d27b3dbb5c8c54a33778876f5aa0476e316.png)

适用模式的样例：

*   生成营销副本，然后将其翻译为不同的语言
    
*   编写文档的大纲，检查大纲是否满足特定条件，然后根据大纲编写文档
    

## 2.3 路由模式

将输入分类，然后将其定向到后续的任务。

对于有些输入，优化一种类型的输入可能会损害其他输入的性能（跷跷板），这种情况适合使用这种模式。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/41bd449314d638cef7f0ea3e13707d2a50dd139c.png)

适用这种模式的样例：

*   将不同类型的客户服务查询（一般问题、退款请求、技术支持）引导到不同的下游流程、提示和工具中
    
*   将简单 / 常见问题路由到较小的模型，将困难 / 不寻常的问题路由到更强大的模型，以优化成本和速度
    

## 2.4 并行化

这种模式适合同时处理多个任务，并以编程方式聚合其输出。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/93756ac27b5e51df30246550328f49ab5bc1c2cb.png)

当任务可以并行以提高速度时，或者需要多个视角或尝试以更高的置信度结果时，这种方式比较有效。

对于有多个考虑因素的复杂任务，将每个考虑因素都由单独的 LLM 处理时，通常效果会更好。

适用这种模式的样例：

*   聚合
    
*   实施查询护栏，其中一个模型实例处理用户查询，另一个检查用户输入是否存在不当内容
    
*   自动化评估，每个 LLM 调用评估模型在给定 Prompt 下性能的区别
    
*   投票
    
*   使用不同的 Prompt 检查代码是否存在漏洞
    
*   评估给定的内容是否不合适，不同的 Prompt 评估不同的方面或者要求不同的投票阈值来平衡误报和漏报
    

## 2.5 编排器 - Worker

在这种模式下，中央 LLM 会动态分解任务，然后将其委派给 worker LLMs，并合并结果。

这种 Workflow 适合无法预测所需子任务的复杂任务（例如，在编码过程中，需要修改的文件数量和每个文件要修改的内容很可能依赖于任务）。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/a3022b5bd59be0057715683cceb4f6fe5e5274cc.png)

**它和并行模式虽然在拓扑结构上类似，但主要的区别是灵活性——子任务不是预定义的，而是编排模块根据特定输入确定的。**

适用这种模式的样例：

*   每次对多个文件进行复杂更改的编码产品
    
*   涉及从多个来源收集和分析信息以查找可能的相关信息的搜索任务
    

## 2.6 评估 - 优化模式

在这种工作流中，一个 LLM 调用负责生成，而另一个 LLM 调用在循环中提供评估和反馈。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/5daf90dc29162dd80e74e72e699e4f3c9183b8e0.png)

当有明确的评估标准，并且迭代优化提供可衡量的价值时，此工作流特别有效，这种模式已经有自主 Agent 的雏形了，把 Evaluator 部分加上环境反馈，这基本上就跟上篇文章介绍的 ReAct 很像了。

适用这种模式有两个判断标准：

*   反馈可以由人类清晰表述时，LLM 的输出根据反馈可以明显得到改善
    
*   LLM 可以提供这样的反馈
    

这类似人类作家在制作精美的文档时可能经历的迭代协作过程。

适用这种模式的样例：

*   文学翻译，其中有细微的差别，翻译 LLM 最初可能无法捕获到，但评估 LLM 可以提供有用的批评
    
*   复杂的搜索任务，需要多轮搜索和分析以收集全面的信息，评估 LLM 可以决定是否需要进一步搜索
    

下面是使用 Dify 搭建的一个反思翻译的流程，也就是吴恩达之前开源的反思翻译项目的 Dify 实现：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/d47d61f1d52d4d214c8462b8f67b6fd9d8ca93b2.png)

下面是实际翻译效果，从翻译结果来看，反思翻译质量明显是高于初始翻译的。

<table><thead><tr><th><span cid="n102" mdtype="table_cell"><span md-inline="plain"><span leaf="">原文</span></span></span></th><th><span cid="n103" mdtype="table_cell"><span md-inline="plain"><span leaf="">初始翻译</span></span></span></th><th><span cid="n104" mdtype="table_cell"><span md-inline="plain"><span leaf="">反思翻译</span></span></span></th></tr></thead><tbody><tr><td><span cid="n106" mdtype="table_cell"><span md-inline="plain"><span leaf="">皮之不存，毛将焉附？</span></span></span></td><td><span cid="n107" mdtype="table_cell"><span md-inline="plain"><span leaf="">If the skin does not exist, where will the hair attach itself?</span></span></span></td><td><span cid="n108" mdtype="table_cell"><span md-inline="plain"><span leaf="">When the root is gone, how can the branches survive?</span></span></span></td></tr><tr><td><span cid="n110" mdtype="table_cell"><span md-inline="plain"><span leaf="">我命由我不由天。</span></span></span></td><td><span cid="n111" mdtype="table_cell"><span md-inline="plain"><span leaf="">My fate is controlled by me, not determined by heaven.</span></span></span></td><td><span cid="n112" mdtype="table_cell"><span md-inline="plain"><span leaf="">My fate is in my own hands.</span></span></span></td></tr></tbody></table>

## 2.7 Agents

随着 LLM 在关键能力（理解复杂输入、参与推理和规划、可靠地使用工具以及从错误中恢复）方面的成熟，人工智能正在生产中崭露头角。Agents 通过人类用户的命令或与人类用户的互动讨论开始工作。一旦任务明确，Agents 就会独立进行规划和操作，并有可能返回人类获取进一步的信息或判断。在执行过程中，Agents 从环境中获取每一步的 "基本事实"（如工具调用结果或代码执行情况）以评估其进度至关重要。然后，代理可以在检查点或遇到阻碍时暂停，以获得人工反馈。任务通常会在完成后终止，但通常也会包含停止条件（如迭代的最大次数）以保持控制。

代理可以处理复杂的任务，但它们的实现通常很简单。它们通常只是基于环境反馈循环使用工具的 LLM。因此，清晰周到地设计工具集及其文档至关重要。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/8c1c92d08267fa61c205ef1512446aa17bc72551.png)

何时使用 Agents：agents 通常用于难以或不可能预测所需步骤以及无法固定路径进行硬编码的开放问题。LLM 可能会运行多个回合，并且用户需要对其决策有一定程度的信任。Agents 的自主性使得它成为可信环境中扩展任务的理想选择。

agents 的自主性意味着更高的成本，并且可能会使错误复杂化。建议在沙盒环境中进行广泛测试，并使用适当的防护机制。

适用这种模式的样例：

（例来自 Anthropic）

*   解决 SWE-bench 任务，该任务涉及根据任务描述对许多文件进行编辑
    
*   computer use 参考实现，其中 Claude 使用计算机完成任务
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1e35e7a2c238ab6353f899236a955f08e9b0e47b.png)

# 3 模式的组合

上面这 7 种模式可以看作是原子模块，可以根据实际情况修改和组合以适应不同场景。

和任何 LLM 功能一样，成功的关键是衡量在实际场景中的效果，并要切记：只有在能够明显改善结果时才应考虑增加复杂性。
