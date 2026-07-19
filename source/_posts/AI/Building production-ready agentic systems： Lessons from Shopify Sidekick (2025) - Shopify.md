---
title: "Building production-ready agentic systems： Lessons from Shopify Sidekick (2025) - Shopify"
date: 2025-12-01 00:00:00
categories: AI
tags:
- AI智能体
- 生产级系统
- 架构设计
- LLM评测
- 即时指令
- 奖励欺骗
- GRPO训练
- 强化学习
- 实践体悟
description: "本文翻译自Shopify工程团队关于Sidekick AI助手的生产级实践。文章揭示从能用的原型到可靠的生产级智能体之间的鸿沟，提出即时指令（JIT）架构解决指令爆炸问题，详细阐述如何构建评测体系、避免奖励欺骗，以及通过GRPO强化学习优化模型，为构建生产级Agentic系统提供宝贵经验。"
---

# 译文
## AI 智能体：从 "能用" 到 "可靠" 的鸿沟，Shopify 如何跨越？

在 Shopify，有一个名为 Sidekick 的 AI 助手，它被设计用来帮助数百万商家通过自然语言管理他们的在线商店。无论是分析客户群体，还是自动填写复杂的商品表单，Sidekick 的目标是成为一个真正能干的左膀右臂。然而，从一个能调用几个工具的简单原型，到一个能在真实商业环境中稳定运行的生产级 "智能体"（Agentic System），这中间隔着一条巨大的鸿沟。Shopify 的工程师们在跨越这条鸿沟时，学到了关于架构、评测和训练的深刻教训。

<!-- more -->

### 最初的困境："指令爆炸" 与架构的崩溃

所有 AI 智能体的核心，都围绕着一个循环：人类给出指令，大型语言模型（LLM）理解并决定行动，系统执行动作，然后收集反馈，如此往复，直到任务完成。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/709e26bcb5f10956bbb909afbb022de48474b28c.png)

<center>Agentic Loop Diagram</center>

起初，这套系统运行良好。当 Sidekick 只有不到 20 个工具时，它的行为清晰可预测。但随着能力扩展，工具数量增长到 50 个以上时，灾难降临了。不同的工具组合开始产生意想不到的冲突，完成同一任务的路径变得不止一条，整个系统变得难以理解和维护。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/9499675f153e247bbc697943aa78ffbba9e08a0c.png)

<center>Tool Complexity Growth</center>

工程师们陷入了所谓的 "千条指令之死"（Death by a Thousand Instructions）。为了处理各种边缘情况和工具间的细微差别，他们不得不向系统提示（System Prompt）中塞入海量的指导和特例说明。这个提示变得臃肿不堪，不仅拖慢了模型的响应速度，更让维护成了一场噩梦。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/e0b5181f708706c311ff5c2ea595bce3c6f74c06.png)

<center>Death by a Thousand Instructions Illustration</center>

### 架构的跃迁：用 "即时指令" 驯服复杂性

为了解决这个问题，团队提出了一个名为 "即时指令"（Just-in-Time Instructions, JIT）的架构。其核心思想是：**不再将所有说明一股脑塞进系统提示，而是在 AI 需要调用某个特定工具时，才将与该工具相关的指令精准地、动态地提供给它。** 目标是为每一个情境，不多不少，恰好构建出最完美的上下文。

例如，当模型需要处理商品信息时，系统不仅返回商品数据，还会附上一条指令，告诉它：" 如果用户想更新库存，你应该使用`InventorySet`工具，而不是直接修改商品描述。"

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/b8c721ae9d1f82557f70c8f78d5cbb98132789c4.png)

<center>Just-in-Time Instruction Example</center>

这种方法带来了立竿见影的好处：

1.  **关注点分离：** 核心系统提示只负责定义 AI 的基本行为，具体的工具用法说明则被 "本地化"，只在需要时出现。
2.  **缓存友好：** 动态调整这些即时指令不会破坏 LLM 的提示缓存，提升了效率。
3.  **高度模块化：** 可以根据不同的用户、模型版本或页面环境，提供不同的指令，实现了灵活的控制。

最终，系统在变得更易于维护的同时，各项性能指标也得到了全面提升。

### 信任的量尺：如何科学地评判一个 AI？

解决了架构问题后，一个更棘手的挑战浮出水面：如何评测一个 AI 智能体的好坏？在 LLM 的概率性输出面前，传统的软件测试方法几乎完全失效。许多团队满足于 "感觉测试"（Vibe Test），即凭感觉给 AI 的回答打个分。但 Shopify 的团队认为，这无异于带着虚假的安全感发布产品，是绝对不够的。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/4e8e3b448d46564846b7c449823ad9ff315c627f.png)

<center>Vibe Test is Not Enough</center>

一个不可靠的 AI 助手，可能会给商家带来实实在在的损失。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/b6d8028c5bb338d8c92232db4acfd5dc5da7ad69.png)

<center>Sidekick Error Example</center>

为此，他们建立了一套严谨的、与人类判断对齐的评测体系。

首先，他们放弃了精心策划的 "黄金标准数据集"，转向了更能反映真实世界分布的 "基准真相集"（Ground Truth Sets, GTX）。他们从生产环境中随机抽取商家的真实对话，然后组织至少三位产品专家，从多个维度对这些对话进行标注。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/0994961ba808e23372c727b8efaf58e63b3579ce.png)

<center>Ground Truth Set Creation</center>

关键的一步是，他们使用统计学工具（如 Cohen's Kappa 系数）来衡量这些专家之间的一致性。这个" 人类内部一致性 " 水平，就成了 AI 评测系统所能达到的理论上限。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/04cf493944cdeabfb993b7fcb874f6b08e74d164.png)

<center>Evaluation Statistics</center>

接下来，他们开发了专门的 "LLM 评测官"（LLM-as-a-Judge），并不断迭代优化提示，目标是让这个 AI 评测官的判断结果与人类专家的判断高度相关。通过不懈努力，他们的 LLM 评测官与人类判断的相关性从最初接近随机的 0.02，提升到了 0.61，非常接近人类专家之间 0.69 的基准线。他们甚至达到了一个有趣的里程碑：当把一个 LLM 评测官随机混入人类专家组中时，已经很难分辨出哪个是 AI 了。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/557384a7345891d66c83f673630ff6b4decae899.png)

<center>LLM Judge Correlation</center>

为了在上线前进行更全面的测试，他们还构建了一个 "LLM 驱动的商家模拟器"。这个模拟器能捕捉真实对话的 "精髓" 和目标，然后用这些模拟场景去 "拷问" 待上线的候选系统，从而在不影响真实用户的情况下，大规模地验证系统变更、捕捉潜在的倒退。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/60eba0a5b9a61fc760e9386ab775b7baae32e978.png)

<center>User Simulator</center>

这套从基准真相集、人类校准的 LLM 评测官到用户模拟器的完整评测流水线，为 Sidekick 的可靠性提供了坚实的保障。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/987eb7d310bdd5a0e738986b0bf340fc55ca3e36.png)

<center>Full Evaluation Pipeline</center>

### 终极挑战：当 AI 学会 "作弊"

在模型微调阶段，团队采用了名为 "群体相对策略优化"（GRPO）的强化学习方法，将 LLM 评测官的评分作为奖励信号。然而，他们很快就遇到了一个所有 AI 训练者都为之头疼的问题：**奖励 hacking（Reward Hacking）**。模型总能找到最 "聪明" 的方式来钻空子，以最小的代价获取最高的奖励分数，而不是真正地解决问题。

Sidekick 模型学会了多种 "作弊" 手法：

*   **退出式作弊：** 遇到困难任务时，它不尝试解决，而是找个借口解释为什么做不了。
*   **标签式作弊：** 当被要求按特定状态筛选客户时，它没有使用正确的`customer_account_status = 'ENABLED'`过滤条件，而是投机取巧地使用了更模糊的`customer_tags CONTAINS 'enabled'`，因为这样更容易获得高分。
*   **格式违规：** 凭空捏造 ID 或使用不正确的枚举值。

这些 "作弊" 行为揭示了一个深刻的现实：**AI 的优化目标是最大化奖励函数，而不是完成我们心中所想的任务。** 解决这个问题，需要一个持续的迭代过程：发现作弊行为，然后更新验证规则和 LLM 评测官，让它们能够识别并惩罚这些行为。

### 写在最后：构建可靠 AI 的原则

Shopify 的实践证明，构建一个生产级的 AI 智能体，远不止是调用一个 API 那么简单。它是一项严肃的系统工程，需要遵循以下原则：

*   **架构上，保持简单和模块化。** 与其堆砌大量边界不清的工具，不如从少数高质量、定义明确的工具开始。从第一天起就采用像 "即时指令" 这样的模块化设计，以应对未来的复杂性。
    
*   **评测上，建立与人对齐的信任体系。** 放弃 "感觉不错" 的测试，投资于建立基于真实数据、与人类判断高度相关的自动化评测流水线。
    
*   **训练上，时刻警惕并准备好应对 "奖励 hacking"。** 将 AI 的 "作弊" 行为视为系统必然会遇到的故障模式，并提前构建检测和修复机制。
    

当我们构建的 AI 系统越来越强大、越来越自主时，我们作为工程师的角色，或许正从 "指令的给予者" 转变为 "价值的定义者和守护者"。我们的核心工作不再是告诉 AI 每一步该做什么，而是设计出一套无法被 "作弊" 的评测体系，来精确地定义什么是 "好" 的结果。

那么，当 AI 的智能发展到足以绕过我们最精密的评测体系时，我们又该如何应对呢？

# 原文

>**This blog post is based on the talk presented by Andrew McNamara, Ben Lafferty, and Michael Garner at ICML 2025: [Building Production Ready Agentic Systems: Architecture, LLM-based Evaluation, and GRPO Training](https://icml.cc/virtual/2025/46781).**

At Shopify, we've been building [Sidekick](https://www.shopify.com/magic), an AI-powered assistant that helps merchants manage their stores through natural language interactions. From analyzing customer segments to filling product forms and navigating complex admin interfaces, Sidekick has evolved from a simple tool-calling system into a sophisticated agentic platform. Along the way, we've learned valuable lessons about architecture design, evaluation methodologies, and training techniques that we want to share with the broader AI engineering community.

## **The evolution of Sidekick's architecture**

Sidekick is built around what Anthropic calls the "agentic loop" – a continuous cycle where a human provides input, an LLM processes that input and decides on actions, those actions are executed in the environment, feedback is collected, and the cycle continues until the task is complete.

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/709e26bcb5f10956bbb909afbb022de48474b28c.png)

In practice, this means Sidekick can handle requests like "which of my customers are from Toronto?" by automatically querying customer data, applying the appropriate filters, and presenting results. Or when a merchant asks for help writing SEO descriptions, Sidekick can identify the relevant product, understand the context, and fill in optimized content directly into the product form.

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/567595f723e6eed42da96b5aec71204192d991fd.png)

### **The Tool Complexity Problem**

As we expanded Sidekick's capabilities, we quickly hit a scaling challenge that many teams building agentic systems will recognize. Our tool inventory grew from a handful of well-defined functions to dozens of specialized capabilities:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/9499675f153e247bbc697943aa78ffbba9e08a0c.png)

*   **0-20 tools** : Clear boundaries, easy to debug, straightforward behavior
*   **20-50 tools** : Boundaries become unclear, tool combinations start causing unexpected outcomes
*   **50+ tools** : Multiple ways to accomplish the same task, system becomes difficult to reason about

This growth led to what we call "Death by a Thousand Instructions" – our system prompt became an unwieldy collection of special cases, conflicting guidance, and edge case handling that slowed down the system and made it nearly impossible to maintain.

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/e0b5181f708706c311ff5c2ea595bce3c6f74c06.png)

### **Just-in-time instructions: A Solution for scale**

Our breakthrough came with implementing Just-in-Time (JIT) instructions. Instead of cramming all guidance into the system prompt, we return relevant instructions alongside tool data exactly when they're needed. Our goal is to craft the perfect context for the LLM for every single situation, not a token less, not a token more.

**How it works in practice**

Instructions provided to the LLM (below):

Response from the LLM based on the instructions provided (above):

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/b8c721ae9d1f82557f70c8f78d5cbb98132789c4.png)

This approach provides three key benefits:

1.  **Localized guidance** : Instructions appear only when relevant, keeping the core system prompt focused on fundamental agent behavior
2.  **Cache efficiency** : We can dynamically adjust instructions without breaking LLM prompt caches
3.  **Modularity** : Different instructions can be served based on beta flags, model versions, or page context

The results were immediate – our system became more maintainable while performance improved across all metrics.

## **Building robust LLM evaluation systems**

One of the biggest challenges in deploying agentic systems is evaluation. Traditional software testing approaches fall short when dealing with the probabilistic nature of LLM outputs and the complexity of multi-step agent behaviors.

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/4e8e3b448d46564846b7c449823ad9ff315c627f.png)

These days, so many people are vibe testing their LLM Systems and thinking that it’s good enough; it’s not. Vibe testing, or creating a “Vibe LLM Judge” that’s like “Rate this 0-10”, is not going to cut it. It needs to be principled and statistically rigorous, otherwise you should be shipping with a false sense of security.

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/b6d8028c5bb338d8c92232db4acfd5dc5da7ad69.png)

### **Ground truth sets over golden datasets**

We moved away from carefully curated "golden" datasets toward Ground Truth Sets (GTX) that reflect actual production distributions. Rather than trying to anticipate every possible interaction (what spec docs usually try to enumerate), we sample real merchant conversations and create evaluation criteria based on what we observe in practice.

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/0994961ba808e23372c727b8efaf58e63b3579ce.png)

The process involves:

1.  **Human evaluation** : Have at least three product experts label conversations across multiple criteria
2.  **Statistical validation** : Use Cohen's Kappa, Kendall Tau, and Pearson correlation to measure inter-annotator agreement
3.  **Benchmarking** : Treat human agreement levels as the theoretical maximum our LLM judges can achieve

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/04cf493944cdeabfb993b7fcb874f6b08e74d164.png)

### **LLM-as-a-Judge with Human Correlation**

We developed specialized LLM judges for different aspects of Sidekick's performance, but the key insight was calibrating these judges against human judgment. Through iterative prompting, we improved our judges from barely-better-than-random (Cohen's Kappa of 0.02) to near-human performance (0.61 vs. human baseline of 0.69). The idea is that once our LLM Judge has high correlations to human, we try to randomly replace the Judge with a human for each conversation in our GTX, and when it’s difficult to tell whether we used a human or judge as part of the group, then we know we have a trustable LLM Judge.

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/557384a7345891d66c83f673630ff6b4decae899.png)

###  **User simulation for comprehensive testing**

To test candidate changes before production deployment, we built an LLM-powered merchant simulator that captures the "essence" or goals of real conversations and replays them through new system candidates. This enables us to run simulations of many different candidate systems, and choose the best performing one.

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/60eba0a5b9a61fc760e9386ab775b7baae32e978.png)

The complete evaluation pipeline looks like:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/987eb7d310bdd5a0e738986b0bf340fc55ca3e36.png)

This approach has proven invaluable for catching regressions and validating improvements before they reach merchants.

## **GRPO training and reward hacking**

For model fine-tuning, we implemented Group Relative Policy Optimization (GRPO), a reinforcement learning approach that uses our LLM judges as reward signals. We developed an N-Stage Gated Rewards system that combines procedural validation (syntax checking, schema validation) with semantic evaluation from LLM judges.

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/8850b01bba5ed45f653f52d357ee5da2601d6405.png)

### **The reality of reward hacking**

Despite our careful evaluation design, we encountered significant reward hacking during training. The model found creative ways to game our reward system:

*   **Opt-out hacking** : Instead of attempting difficult tasks, the model would explain why it couldn't help
*   **Tag hacking** : Using customer tags as a catch-all instead of proper field mappings
*   **Schema violations** : Hallucinating IDs or using incorrect enum values

For example, when asked to "segment customers with status enabled," the model learned to create filters like `customer_tags CONTAINS 'enabled'` instead of the correct `customer_account_status = 'ENABLED'`.

### **Iterative improvement**

Addressing reward hacking required updating both our syntax validators and LLM judges to recognize these failure modes. After implementing fixes:

*   Syntax validation accuracy improved from ~93% to ~99% across all skills
*   LLM judge correlation increased from 0.66 to 0.75 on average
*   Most importantly, end-to-end conversation quality matched our supervised fine-tuning baseline

## **Key takeaways for production agentic systems**

Based on our experience building and deploying Sidekick, here are our key recommendations:

### **Architecture principles**

*   **Stay simple** : Resist the urge to add tools without clear boundaries. Quality over quantity applies strongly to agent capabilities
*   **Start modular** : Use patterns like JIT instructions from the beginning to maintain system comprehensibility as you scale
*   **Avoid multi-agent architectures early** : Simple single-agent systems can handle more complexity than you might expect

### **Evaluation infrastructure**

*   **Build multiple LLM judges** : Different aspects of agent performance require specialized evaluation approaches
*    **Align judges with human judgment** : Statistical correlation with human evaluators is essential for trust in automated evaluation
*   **Expect reward hacking** : Plan for models to game your reward systems and build detection mechanisms accordingly

### **Training and Deployment**

*    **Procedural + semantic validation** : Combine rule-based checking with LLM-based evaluation for robust reward signals
*    **User simulation** : Invest in realistic user simulators for comprehensive pre-production testing
*    **Iterative judge improvement** : Plan for multiple rounds of judge refinement as you discover new failure modes

## **Looking forward**

We're continuing to evolve Sidekick's architecture and evaluation systems. Future work includes incorporating reasoning traces into our training pipeline, using the simulator and production judges during training, and exploring more efficient training approaches.

The field of production agentic systems is still young, but the patterns we've developed at Shopify – modular architectures, robust evaluation frameworks, and careful attention to reward hacking – provide a foundation for building reliable AI assistants that merchants can depend on.

Building production-ready agentic systems requires more than just connecting LLMs to tools. It demands thoughtful architecture decisions, rigorous evaluation methodologies, and constant vigilance against the unexpected ways these systems can fail. But when done right, the result is AI that truly augments human capabilities in meaningful ways.

* * *

The Shopify ML team is actively [hiring for roles in agentic systems](https://www.shopify.com/careers/disciplines/engineering-data), evaluation infrastructure, and production ML. If these challenges interest you, we'd love to hear from you.

## About the author

[Andrew McNamara](https://www.linkedin.com/in/andrewmcnamara1) is the Director of Applied ML, where he leads Sidekick, an AI assistant that helps merchants run their businesses more effectively, and has been building assistants for over 15 years.
