---
title: "硬核，40 张图全面拆解 AI Agents 全栈技术框架！"
date: 2025-09-11 16:25:13
categories: AI
tags:
- Agent智能体
description: "本文通过40多张图解系统性地拆解了LLM Agents的全栈技术框架，深入讲解了Agent的三大核心组件：记忆（短期记忆与长期记忆）、工具（Toolformer与MCP协议）和规划（推理与行动ReAct框架）。文章详细介绍了单智能体如何扩展到多智能体协作系统，涵盖了协调器-工作者模式、智能体初始化与协调机制等关键内容，为开发者构建AI Agent应用提供了全面的技术视角。"
---

LLM Agents 正在变得广泛传播，但它们并非轻易就能创造出来，需要许多组件协同工作。以 **40+ 张图解**，探索 **LLM Agents** 的**主要组件**、**Multi-Agent 框架**、以及 [MCP](https://zhida.zhihu.com/search?content_id=255468385&content_type=Article&match_order=1&q=MCP&zhida_source=entity) 等全栈技术要点，比如：

<!-- more -->

*   Agent 如何从失败 Plan 中学习经验？
*   LLM、MCP、Tool 交互细节？
*   几十种 Multi-Agent 架构，核心组件是？

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579113984.png)

## **什么是 LLM Agent？**

**AI Agent 是任何可以通过传感器感知其环境并通过执行器对环境采取行动的东西。**

——罗素和诺维格，《人工智能：一种现代方法》（2016 年）

Agents 与环境互动，通常包括几个重要组件：

*   • **环境** —— 代理互动的世界
*   • **传感器** —— 用于观察环境
*   • **执行器** —— 用于与环境互动的工具
*   • **效应器** —— 决定如何从观察到行动的 “大脑” 或规则

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579114096.png)

这个框架适用于所有与各种环境互动的代理，比如与物理环境互动的机器人或与软件互动的 AI Agents。

可以稍微扩展这个框架，使其适用于 “增强型 LLM”。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579114191.png)

使用 “增强型”LLM，Agent 可以通过文本输入观察环境，并通过使用工具执行某些行动。

为了选择要采取哪些行动，LLM Agent 有一个关键组件：**它的计划能力**。为此，LLM 需要能够通过链式思考等方法进行 “推理” 和“思考”。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579114307.png)

利用这种推理行为，LLM Agent 将计划出要采取的必要行动。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579114406.png)

这种计划行为使 Agent 能够理解情况（LLM）、计划下一步（计划）、采取行动（工具）并跟踪已采取的行动（记忆）。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579114530.png)

根据系统，你可以拥有不同程度自主性的 LLM Agents。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579114646.png)

一个系统越 “**agentic**”，LLM 就越能决定系统的行动方式。

将通过 LLM Agent 的三个主要组件：**记忆、工具和计划**，来探索各种自主行为的方法。

## **记忆**

LLM 是健忘的系统，或者更准确地说，在与它们互动时，它们根本不进行任何记忆。

例如，当你问 LLM 一个问题，然后又接着问另一个问题时，它不会记得前者。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579114729.png)

我们通常将其称为短期记忆，也称为工作记忆，它作为（近乎）即时上下文的缓冲区。这包括 LLM 代理最近采取的行动。

然而，LLM 代理还需要跟踪可能多达数十步的行动，而不仅仅是最近的行动。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579114869.png)

这被称为长期记忆，因为 LLM 代理理论上可能需要记住多达数十步甚至数百步。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579115011.png)

### **短期记忆**

实现短期记忆最直接的方法是使用模型的上下文窗口，这本质上是 LLM 可以处理的 token 数量。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579115118.png)

较大的上下文窗口可以用来跟踪完整的对话历史，作为输入提示的一部分。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579115214.png)

对于上下文窗口较小的模型，或者当对话历史较大时，可以改用另一个 LLM 来总结到目前为止发生的对话。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579115309.png)

### **长期记忆**

LLM Agents 的长期记忆包括需要长期保留的 Agents 过去的行动空间。

实现长期记忆的一个常见技术是将所有之前的互动、行动和对话存储在一个外部向量数据库中。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579115448.png)

在构建数据库之后，可以通过 **RAG** 方式检索相关信息。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579115528.png)

## **工具**

工具允许给定的 LLM 要么与外部环境（如数据库）互动，要么使用外部应用程序（如运行自定义代码）。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579115632.png)

工具通常有两种用例：获取数据以检索最新信息和采取行动，比如安排会议或点餐。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579115720.png)

要实际使用一个工具，LLM 必须生成适合给定工具的 API 的文本。我们通常期望的是可以格式化为 JSON 的字符串，以便可以轻松地输入到代码解释器中。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579115792.png)

## **Toolformer**

工具使用是一种强大的技术，可以增强 LLM 的能力并弥补它们的不足。因此，关于工具使用和学习的研究在过去几年中迅速增加。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579115915.png)

最早实现这一目标的技术之一被称为 Toolformer，这是一个训练用于决定调用哪些 API 以及如何调用的模型。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579115993.png)

## **模型上下文协议（MCP）**

工具是具代理性框架的重要组成部分，允许 LLM 与世界互动并扩展其能力。然而，当你有许多不同的 API 时，启用工具使用变得很麻烦，因为任何工具都需要：

*   • 手动跟踪并输入给 LLM
*   • 手动描述（包括其预期的 JSON 模式）
*   • 每当其 API 发生变化时手动更新

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116088.png)

为了使工具更容易在任何给定的具代理性框架中实现，Anthropic 开发了模型上下文协议（MCP）。MCP 为天气应用和 GitHub 等服务标准化了 API 访问。

它由三个组件组成：

*   • **MCP 主机** —— LLM 应用程序（例如 Cursor），管理连接
*   • **MCP 客户端** —— 与 MCP 服务器保持一对一连接
*   • **MCP 服务器** —— 为 LLM 提供上下文、工具和能力

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116157.png)

例如，假设你希望某个 LLM 应用程序总结你仓库中的最新 5 次提交。

MCP 主机（与客户端一起）将首先调用 MCP 服务器，询问有哪些工具可用。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116232.png)

LLM 收到信息后，可能会选择使用某个工具。它通过主机向 MCP 服务器发送请求，然后接收结果，包括所使用的工具。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116311.png)

最后，LLM 收到结果，并可以向用户解析答案。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116377.png)

## **计划**

工具使用使 LLM 能够增强其能力。它们通常通过类似 JSON 的请求调用。

但是，LLM 在具代理性的系统中如何决定使用哪个工具以及何时使用呢？

这就是计划的作用。LLM 代理中的计划涉及将给定任务分解为可操作的步骤。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116457.png)

### **推理**

计划可操作步骤需要复杂的推理行为。因此，LLM 必须能够在规划任务的下一步之前展示这种行为。

“推理型”LLM 是那些倾向于在回答问题之前 “思考” 的 LLM。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116540.png)

这种推理行为可以通过大致两种选择来实现：微调 LLM 或特定的提示工程。

通过提示工程，可以创建 LLM 应该遵循的推理过程的例子。提供例子是引导 LLM 行为的好方法。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116638.png)

在训练 LLM 时，可以给它足够数量包含类似思维的例子的数据集，或者 LLM 可以发现自己的思考过程。例如 **DeepSeek-R1**，其中使用奖励来引导使用思考过程。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116713.png)

### **推理与行动**

在 LLM 中启用推理行为很好，但并不一定使其能够规划可操作的步骤。

到目前为止关注的技术要么展示推理行为，要么通过工具与环境互动。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116786.png)

例如，链式思考纯粹关注推理。

将这两个过程结合起来的最早技术之一被称为 [ReAct](https://zhida.zhihu.com/search?content_id=255468385&content_type=Article&match_order=1&q=ReAct&zhida_source=entity)（推理与行动）。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116871.png)

ReAct 通过精心设计的提示来实现这一点。ReAct 提示描述了三个步骤：

*   • **思考** —— 关于当前情况的推理步骤
*   • **行动** —— 要执行的一系列行动（例如，工具）
*   • **观察** —— 关于行动结果的推理步骤

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579116938.png)

LLM 使用这个提示来引导其行为以循环的方式进行思考、行动和观察。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579117043.png)

### **反思**

没有人，即使是具有 ReAct 的 LLM，也并非每个任务都能完美完成。失败是过程的一部分，只要你能反思这个过程就行。

这个过程在 ReAct 中缺失，而 Reflexion 正是填补这一空白的地方， 利用 verbal reinforcement 帮助代理从之前的失败中学习的技术。

假设了三个 LLM 角色：

*   • **行动者** —— 根据状态观察选择并执行行动。
*   • **评估者** —— 对行动者产生的输出进行评分。
*   • **自我反思** —— 对行动者采取的行动和评估者生成的评分进行反思。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579117144.png)

## **Multi-Agent 协作**

探索的 Single-Agent 存在几个问题：工具太多可能会使选择复杂化，上下文变得过于复杂，任务可能需要专业化。

相反，可以转向 **Multi-Agents**，即多个 Agents 相互互动以及与它们的环境互动的框架：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579117253.png)

这些 Multi-Agent 系统通常由专业化的代理组成，每个 Agent 都配备了自己的一套工具，并由一个主管监督。主管管理 Agent 之间的通信，并可以为专业化的代理分配特定的任务。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579117346.png)

每个 Agent 可能有不同的工具类型可用，也可能有不同的记忆系统。

在实践中，有几十种 Multi-Agent 架构，其核心有两个组成部分：

*   • **Agent 初始化** —— 如何创建各个（专业化的）代理？
*   • **Agent 协调** —— 如何协调所有代理？

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579117437.png)

### **人类行为的交互式仿真**

可以说最具影响力且坦率地说非常酷的多代理论文之一是 “Generative agents: Interactive simulacra of human behavior”。创建了可以模拟可信人类行为的计算软件代理，他们将其称为生成性代理。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579117502.png)

每个生成性代理被赋予的档案使它们以独特的方式行事，并有助于创造更有趣和动态的行为。

**每个 Agent 都用三个模块（记忆、计划和反思）初始化**，非常类似于我们之前看到的 ReAct 和 Reflexion 的核心组件。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579117595.png)

它们共同允许代理自由地进行行为并相互互动。因此，**Agent 之间几乎没有协调**，因为它们没有特定的目标需要努力实现。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579117666.png)

### **模块化框架**

无论你选择哪种框架来创建 Multi-Agent 系统，它们通常由几个要素组成，包括其**档案、对环境的感知、记忆、计划和可用行动**。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579117770.png)

流行框架是 [AutoGen](https://zhida.zhihu.com/search?content_id=255468385&content_type=Article&match_order=1&q=AutoGen&zhida_source=entity)、MetaGPT 和 [CAMEL](https://zhida.zhihu.com/search?content_id=255468385&content_type=Article&match_order=1&q=CAMEL&zhida_source=entity)。每个框架在 Agent 之间的通信方式上略有不同。但归根结底，它们都依赖于这种**协作性的沟通**。Agent 有机会相互交流，以更新它们的当前状态、目标和下一步行动。

最近几周，这些框架的增长呈爆炸式增长。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757579117851.png)

2025 年将是令人兴奋的一年，AI Agents 将迎来更多的落地，什么时候入局 AI Agents 都不晚！[DeepSeek R1 + Agent 的下半场](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzk0MTYzMzMxMA%3D%3D%26mid%3D2247492838%26idx%3D1%26sn%3D9b9bf873261c9b2239b97b70effc441f%26scene%3D21%23wechat_redirect)
