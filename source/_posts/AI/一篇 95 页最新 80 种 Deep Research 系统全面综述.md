---
title: "一篇 95 页最新 80 种 Deep Research 系统全面综述"
date: 2025-07-14 00:00:00
categories: AI
tags:
- Deep Research
- 系统架构
- 多智能体
- 综述
- 大模型
- 知识检索
- 任务规划
description: "浙江大学发布的 Deep Research 系统综述，分析了 2023 年以来出现的 80 多个商业和非商业实现。提出四维分层分类法，涵盖基础模型与推理引擎、工具利用与环境交互、任务规划与执行控制、知识综合与输出生成。详细解析了单体架构、流水线架构、多智能体架构和混合架构四种实现方式。讨论了上下文理解与记忆机制、推理能力增强、多智能体协作框架、报告生成技术等关键技术进展，为理解和构建深度研究系统提供全面参考。"
---

浙大研究了快速发展的深度研究系统领域（Deep Research）——AI 驱动的应用通过整合 LLM、高级信息检索和自主推理能力，自动化复杂的科研工作流程。

<!-- more -->

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752456284273.png)

分析了自 2023 年以来出现的 80 多个商业和非商业实现，包括 OpenAI、Gemini、Perplexity/ DeepResearch 以及众多开源替代方案。提出了一个新颖的 4 个维度的分层分类法：基础模型和推理引擎、工具利用与环境交互、任务规划与执行控制，以及知识综合与输出生成。并且，全面分析了 4 种 Deep Research 系统实现架构。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752456284365.png)

# 1 基础模型与推理引擎：演变与进步

*   **上下文理解和记忆机制**：现代实现采用了复杂记忆管理技术，如情景缓冲区、层次化压缩和基于注意力的检索机制，有效扩展了系统的上下文处理能力。例如，Grok 3 和 Gemini 2.5 Pro 等模型拥有百万级的上下文窗口，显著提升了信息处理能力。
    
*   **推理能力的增强**：现代深度研究系统通过明确的推理框架（如链式推理、树状推理和基于图的推理架构）显著提升了推理能力。例如，OpenAI 的 o3 模型通过自我批评、不确定性估计和递归推理改进等技术，增强了对复杂研究任务的处理能力。
    


![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752456284431.png)

# 2 工具利用与环境交互：演变与进步

*   **内容处理技术的进步**：OpenAI 的 o3 模型能够从非结构化内容中提取语义结构，识别关键信息，并在不同模态之间整合见解。
    
*   **专用工具集成的进展**：通过工具集成框架，深度研究系统能够掌握超过 16,000 个真实世界的 API，显著扩展了与外部环境的交互能力。例如，AssistGPT 展示了如何通过多模态交互框架，规划、执行、检查和学习跨多样环境的任务。
    

# 3 任务规划与执行控制：演变与进步

*   **研究任务规划的发展**：OpenAI 的 Agents SDK 提供了全面的研究任务规划框架，支持目标分解、执行跟踪和自适应细化。
    
*   **多智能体协作框架的发展**：复杂研究任务往往受益于专门的智能体角色和协作方法。现代系统通过明确的协调机制和信息共享协议，实现了多智能体协作，显著提升了处理复杂任务的能力。例如，smolagents/open_deep_research 框架通过模块化智能体架构和明确的协调机制，实现了有效的多智能体协作。
    

# 4 知识综合与输出生成：演变与进步

*   **报告生成技术的进步**：mshumer/OpenDeepResearcher 项目通过结构化输出框架和证据整合机制，生成高质量的研究报告。
    
*   **交互式呈现技术的发展**：HKUDS/Auto-Deep-Research 通过动态界面实现交互式结果探索，允许用户通过迭代交互细化分析。
    

# Deep Research 系统实现架构

包括单体架构、流水线架构、多智能体架构和混合架构：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752456284519.png)

*   **单体架构**：将所有深度研究功能集成在一个统一的框架中，以中心推理引擎为核心。其特点是集中式控制流、紧密耦合的组件和共享内存系统。优点是推理一致性和实现简单性，但扩展性和并行化能力有限。例如，OpenAI/DeepResearch 和 grapeot/deep_research_agent 采用这种架构。
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752456284596.png)

*   **流水线架构**：将研究流程分解为一系列专门的处理阶段，每个阶段负责特定的数据转换任务。其特点是顺序组件组织、标准化接口和可重用性。这种架构适合需要定制化工作流的场景，但可能在复杂推理任务中表现不佳。例如，n8n 和 dzhng/deep-research 采用这种架构。
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752456284678.png)

*   **多智能体架构**：通过多个专门的智能体协作完成研究任务，每个智能体负责特定的角色和任务。其特点是分布式功能分解、明确的协调机制和自主决策逻辑。这种架构在需要多样化专业能力和并行处理的复杂研究任务中表现出色，但需要解决整体一致性和推理透明性的问题。例如，smolagents/open_deep_research 和 TARS 采用这种架构。
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752456284756.png)

*   **混合架构**：结合了上述多种架构的优点，以适应不同的研究需求。其特点是分层组织、领域特定优化和灵活的集成机制。这种架构提供了最大的灵活性，但也增加了实现的复杂性。例如，Perplexity/DeepResearch 和 Camel-AI/OWL 采用这种架构。
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752456284826.png)

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752456284913.png)

```txt

https://arxiv.org/pdf/2506.12594
A Comprehensive Survey of Deep Research: Systems, Methodologies, andApplications
https://github.com/scienceaix/deepresearch.

```

推荐阅读

*   • [动手设计 AI Agents：（编排、记忆、插件、workflow、协作）](https://mp.weixin.qq.com/s?__biz=Mzk0MTYzMzMxMA==&mid=2247492838&idx=2&sn=1e25832e7300ef312721325d0def30b4&scene=21#wechat_redirect)
    
*   • [DeepSeek R1 + Agent 的下半场](https://mp.weixin.qq.com/s?__biz=Mzk0MTYzMzMxMA==&mid=2247492838&idx=1&sn=9b9bf873261c9b2239b97b70effc441f&scene=21#wechat_redirect)
    
*   • [单智能体（Agent）：企业员工 AI 助理](https://mp.weixin.qq.com/s?__biz=Mzk0MTYzMzMxMA==&mid=2247493278&idx=2&sn=ab698d56a22b8f70f6c8ad1db7495e4c&scene=21#wechat_redirect)
    
*   • [Agent 到多模态 Agent 再到多模态 Multi-Agents 系统的发展与案例讲解（1.2 万字，20 + 文献，27 张图）](http://mp.weixin.qq.com/s?__biz=Mzk0MTYzMzMxMA==&mid=2247485322&idx=1&sn=71ffb345fca514aa5ce2848cb2c9f071&chksm=c2ce3dfbf5b9b4edd5b98e45c6179890bdea748fb5220636d25f42006954ea5c81afa8735725&scene=21#wechat_redirect)
    

* * *

欢迎关注我的公众号 “**PaperAgent**”，每天一篇大模型（LLM）文章来锻炼我们的思维，简单的例子，不简单的方法，提升自己。