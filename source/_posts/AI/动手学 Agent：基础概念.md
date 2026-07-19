---
title: "动手学 Agent：基础概念"
date: 2025-10-10 00:00:00
categories: AI
tags:
- Agent概念
- 智能体定义
- 大模型
- 规划
- 记忆
- 工具使用
- 自主决策
- Agent智能体
- Agent开发
- 动手学Agent
description: "本文系统梳理了Agent概念从前大模型时代到当今LLM时代的演变。文章汇集了Marvin Minsky、Russell & Norvig、复旦综述论文等多方定义，提炼出Agent的核心特性：感知环境、自主决策、执行任务。同时阐明AI Agent = LLM + 角色定义 + 规划 + 工具使用 + 记忆的公式，并解释了为何需要Agent来解决环境隔离、执行能力、任务拆解和状态维持四大问题。"
---

# Agent 的概念

虽然大家都在说 2025 年是 Agent 的元年，但如此高频的一个词，就跟好多计算机里面的概念一样，也是没有严格定义的。

<!-- more -->

我将整理一些不同时期的定义，好让大家更好地理解这个概念的内涵。

## 前大模型时代

在大模型兴起之前，在不少地方也有 Agent 的定义。

Marvin Minsky 在《思维的社会》中最早提出：社会个体通过协商求解问题的思想，这些具备**社会交互性**和**智能性**的个体即为 Agent。

《人工智能：一种现代方法》（Artificial Intelligence: A Modern Approach, Stuart Russell & Peter Norvig）：Agent 是任何能通过传感器**感知环境**，并通过**执行器**作用于**环境**的实体。

《强化学习》（Richard S. Sutton, Andrew G. Barto ）：进行**学习**及**实施决策**的机器被称为智能体（Agent），智能体之外所有与其**相互作用**的事物都被称为环境（environment）。

《多智能体系统导论》（An Introduction to MultiAgent Systems，Michael Wooldridge ）强调**自主性**、**环境感知**和**动态交互**三大特性。

这些定义虽然各部相同，但大致都强调了 Agent 的几个特点：与环境交互、智能、感知环境、执行

## 大模型时代

现在大家引用比较多的关于 Agent 的定义，是前 OpenAI 安全副总裁 Lilian Weng 在其博客 LLM Powered Autonomous Agents 中给出的，如下图所示，虽然也没有定义什么是 Agent，但给出了 Agent 的三个关键组件。这个定义，虽然更多的是从实现的角度考虑的，但如果你看 Agent 相关的研究会发现，他们基本上都是在围绕这三个点在开展。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/75b4944e00e0dda55ebd98db28befe2dc64d5c40.png)

基于 LLM 的 Agent 系统，LLM 在其中扮演大脑的角色。在考虑 Agent 实现时，通常参照上图，认为 Agent 有如下三个关键组件：

*   规划
*   记忆
*   工具使用

而另一个公认的定义，来自复旦大学的综述论文 The Rise and Potential of Large Language Model Based Agents: A Survey：基于大型语言模型（LLM）的 AI 智能体（LLM-based AI Agent）是指利用大型语言模型作为核心组件，具备**感知环境**、**自主决策**和**执行任务**能力的人工智能系统。这些智能体通过结合**规划**、**记忆**和**工具**使用等模块，使其能够在**动态环境**中完成复杂任务。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/faa1a1c06e75f650ce59b210beabad346243e12a.png)

# Agent 和大模型的关系是什么

看了上面这么多的定义，可能还是无法理解什么是大模型，什么是 Agent，他们之间的关系，可以认为是下面这样的：

> **Note:** > AI Agent = LLM + 角色定义 + 规划 + 工具使用 + 记忆


其中的规划、工具使用、记忆在上文已经提到了，而角色定义，更多的是在多智能体系统下才有的。

那么问题来了，像常用的 ChatGPT、豆包、元宝这些软件，究竟是什么？

虽然上面 AI Agent 和 LLM 的关系里面，右边有好多项，但按照当前的业界共识，具备工具使用或记忆，或者多个不同角色的 LLM 之间进行交互，就称得上是 Agent 了，并不是需要都具备。从这个角度来讲，只要在 ChatGPT、豆包这些 App 中打开了联网搜索，就称得上是 Agent 了（虽然大家一般不这样说），因为联网搜索相当于是 Agent 借助 LLM 在使用工具，而关闭联网搜索时，如果这些 App 本身不结合用户偏好（ChatGPT 比较新的版本中会结合用户偏好回答问题），而是纯基于模型回答的话，则不能称之为 Agent 了。

# 为什么需要 Agent

在理清了 LLM 和 Agent 的关系之后，我们再来看一下在 LLM 本身已经具有超越人类的答题、写作能力后，为社么还需要 Agent。

大致有如下 4 类原因：

*   **环境隔离**：LLM 无法感知实时数据，如股价、新闻、时间、公司内部的文档
*   **缺乏执行能力**：缺乏 API 调用和软件操作能力，如下单、浏览器控制
*   **任务拆解**：难以自动拆解多步骤任务，如 “收集 Agent 资料并生成报告发送指定人”
*   **状态维持**：需要长期记忆用户偏好，如咖啡订单的 “去冰无糖”，没这个能力的就会每次都当你第一次点一样

# 预告

接下来对后续内容也做个预告。在介绍完 Agent 的一些核心组件后，我会带大家实现一个完整的 MCP Server，然后借助所实现的这个 MCP Server，通过 Cherry Studio 实现一个数据洞察 Agent，通过输入一个 Excel 文件路径，能够调用工具自动预览数据，并根据数据本身的特点，来拆解要分析的问题，然后分别调用 ChatBI 工具和可视化工具完成数据分析，最终生成一份完整的数据洞察报告。再之后我们还会通过写代码的方式，来实现与 Cherry Studio 类似的功能，以便深入理解细节。

虽然这种做数据分析 Agent 的 Demo 已经很多了，但不少都只是使用了 Excel 读取工具，分析交给了大模型，这样做有两个弊端：

*   数据分析通常需要进行复杂的运算，大模型本身并不擅长的，很容易出现大家常说的幻觉
*   受限于大模型上下文长度限制，使用大模型直接分析数据，不能支持比较大的文件，上下文会爆

业界通常都是通过生成代码（像 ChatGPT、Claude、豆包、元宝等），或者调用现成的数据分析工具来实现的。

使用 Cherry Studio 的实现的效果如下：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/5831acd41bf861035d3e855ef189154c527f2af1.png)

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/7b4f24159335dae8a8d5f9f7aa706179a4f4ab86.png)

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/f94c69a4b9cc2ee1bf816331e920db39af981b1d.png)
