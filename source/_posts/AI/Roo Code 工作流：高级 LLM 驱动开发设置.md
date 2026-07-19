---
title: "Roo Code 工作流：高级 LLM 驱动开发设置"
date: 2025-08-12 00:00:00
categories: AI
tags:
- Roo Code
- 工作流优化
- LLM开发
- 多模型协作
- 智能编程
- 开发工具
- 自动化开发
description: "文章介绍 Roo Code 的高级工作流配置，通过战略性地将不同大模型分配到专用模式实现性能、成本和特定任务的优化。核心架构包括 Orchestrator 模式负责任务分解与委托、Think 模式进行深度推理分析、Architect 模式负责系统设计、Code 模式生成代码、Debug 模式修复问题。配合 Roo Code Memory Bank 提供持久上下文。详细说明了各模式的配置方法、工作流程分解以及本地部署方案，适合追求低成本高效率的 AI 辅助开发实践。"
---

# Roo Code 工作流：高级 LLM 驱动开发设置

本要点概述了使用 Roo Code 进行软件开发的高效且成本优化的工作流程，该流程利用多模型方法和自定义的 “思考” 模式，以增强推理能力和令牌效率。此设置已成功用于构建复杂的应用程序，例如带有投注策略分析的百家乐游戏模拟。

<!-- more -->

* * *

## 核心组件和模型分配

此设置的强大之处在于战略性地将不同的 LLM（大型语言模型）分配到 Roo Code 中的专用 “模式”，从而优化性能、成本和特定任务要求。

*   • **Orchestrator Mode：
    
    *    中央协调器，负责分解复杂任务并将其委托给其他模式。
    
*    • **LLM：** **Gemini**（通过 Google AI Studio API 密钥）- 因其强大的推理能力和在编排角色中的成本效益而被选中。
    
*   • **Think Mode（自定义 - 来源于此 [Reddit 帖子] https://www.reddit.com/r/RooCode/comments/1k9hcmu/this_is_going_well_for_me_orchestrator_think/）：** 
    
*    一个专门的推理引擎，预处理复杂的子任务，提供详细计划并预测挑战。
    
*    • **LLM：** **Gemini**（通过 Google AI Studio API 密钥）- 利用 Gemini 强大的分析能力进行结构化思考。
    
*   • **Architect Mode：** 专注于高层设计、系统架构和模块定义。DeepSeek R1 0528 也是一个不错的选择。
    

*   • **LLM：** **DeepSeek R1 0528**（通过 OpenRouter）- 因其架构设计能力而被选中。
    

*   • **Code Mode：** 根据设计和计划生成实际代码。
    

*   • **LLM Pool：** **DeepSeek V3 0324、Qwen3 235B A22B**（或其他 Qwen 模型）、**Mistral: Devstral Small**（均通过 OpenRouter）- 在撰写本文时，这些模型都可以通过 OpenRouter 免费使用。DeepSeek V3 0324 对于简单或重复性任务可能有点慢或过于强大，因此如果不需要大量上下文，可以切换到 Qwen 模型。对于需要更多上下文的非常简单任务，Devstral 是一个非常好的选择。
    

*   • **Debug Mode：** 识别并解决生成代码中的问题。
    

*   • **LLM 池：** 与代码模式相同 - 切换模型的能力有助于解决不同类型的错误。
    

*   • **[Roo Code Memory Bank] https://github.com/GreatScottyMac/roo-code-memory-bank：** 提供持久上下文，并允许存储和检索计划、代码片段和其他相关信息。
    

*   • **Integration：** 计划主要从编排器模式触发和管理。
    

向 OpenRouter 充值 10 美元即可每天获得 1000 次免费请求。这很值得。我还没有达到限制。

* * *

## 详细工作流程分解

该工作流程旨在模拟一个高效的开发团队，每个 “模式” 都充当一个专业的团队成员。

1.  1. **初始任务接收（Orchestrator）：**
    

*   • 一个复杂的开发任务被交给 Orchestrator 模式。
    
*   • Orchestrator 的主要作用是理解任务并将其分解为可管理、逻辑性的子任务。
    
*   • 为此，稍微更新 Orchestrator 的提示可能会有帮助。除了提示的其余部分之外，还可以添加 “当给定一个复杂任务时，将其分解为可以委托给适当的专业模式的细粒度、逻辑性子任务。” 之类的语句。
    

3.  2. **“思考” 模式的战略推理：**
    

*   • 对于任何需要详细规划、分析或在执行之前预测边缘情况的复杂子任务，Orchestrator 首先委托给自定义的 “思考” 模式。
    
*   • **编排器的委托: 使用** 
    

`new_task` 工具将特定问题或子任务发送到 “思考” 模式。

*    • **思考模式的过程：**
    

*   • **Role Definition：** “您是一个专门的推理引擎。您的主要功能是分析给定任务或问题，将其分解为逻辑步骤，识别潜在挑战或边缘情况，并概述清晰、分步的推理过程或计划。您不执行操作或编写最终代码。您的输出应结构化且详细，适合 Orchestrator 模式（如编排器模式）用于后续任务委托。专注于清晰度、逻辑流和预测潜在问题。使用 Markdown 结构化您的推理。”
    
*   • **Mode-specific Instructions：** “使用 Markdown 标题和列表清晰地组织您的输出。首先总结您对任务的理解，然后是分步推理或计划，最后是潜在挑战或注意事项。您通过 `attempt_completion` 的最终输出应仅包含此结构化推理。这些特定指令将取代您模式可能具有的任何冲突的通用指令。”
    
*   • “思考” 模式处理子任务并通过 `attempt_completion` 返回结构化推理计划（例如，Markdown 标题、列表）。
    

1.  3. **知情委托（Orchestrator）：**
    

*   • 编 Orchestrator 接收并利用来自 “思考” 模式的详细推理。此结构化计划为实际执行子任务的指令提供信息。
    
*   • 对于每个子任务（直接或在使用 “思考” 模式之后），Orchestrator 使用 `new_task` 工具委托给适当的专业模式。
    

3.  4. **设计与架构（Architect）：**
    

*   • 如果子任务涉及系统设计或架构考虑，编排器 Orchestrator 将委托给架构师模式。
    
*   • 架构师模式提供高层设计文档或结构大纲。
    

5.  5. **代码生成（Code）：**
    

*   • 一旦设计或特定编码任务准备就绪，编排器 Orchestrator 将委托给代码模式。
    
*   • 代码模式生成必要的代码片段或完整模块。
    

7.  6. **调试与完善（Debug）：**
    

*   • 如果在测试或集成过程中出现错误或问题，编 Orchestrator 将委托给调试模式。
    
*   • 调试模式分析代码，识别问题，并建议修复。
    

9.  7. **Memory Bank 集成：**
    

*   • 在整个过程中，特别是从编排器 Orchestrator 模式，相关的计划、架构决策和生成的代码可以存储在 **Roo 内存库**中并从中检索。这确保了连续性，并允许轻松引用和迭代以前的工作。
    

* * *

我几乎所有事情都通过 Orchestrator 模式运行，因为此设置的目标是以零成本获得最可靠和准确的性能，并尽可能减少人工干预。需要理解的是，人类参与越多，效果可能越好。尽管如此，通过良好的初始提示（利用 Gemini 或 Deepseek 模型增强提示工具）并利用 Roo 内存库中的 projectBrief.md 和其他 Markdown 规划文件，您可以大大减少接触点，特别是对于相当简单的项目。

我通过 Roo Code 扩展 UI 完成所有这些设置。我设置了名为 Gemini、OpenRouter - [Code-Debug-Plan]（分别用于代码、调试和架构模式）的配置配置文件，并默认模式使用正确的配置文件。

**本地设置**

我确实有一个本地版本，但我测试得不多。我使用 LM Studio 和：

*   • 此 [帖子](https://www.reddit.com/r/LocalLLaMA/comments/1k7kbap/cline_tool_usage_on_rtx_4060ti_16gb_vram/) 中的模型用于架构师和 Orchestrator 模式。
    
*   • 自从添加 “思考” 模式后，我还没有使用本地设置，但我猜一个小型的 DeepSeek 思考模型会很好用。
    
*   • 我使用 [qwen2.5-coder-7b-instruct-mlx](https://huggingface.co/lmstudio-community/Qwen2.5-Coder-7B-Instruct-MLX-4bit) 或 [nxcode-cq-7b-orpo-sota](https://huggingface.co/CISCai/Nxcode-CQ-7B-orpo-SOTA-GGUF) 用于代码和调试模式。
    
*   • 我使用 qwen/qwen3-4b 用于询问模式。
    

我目前只有两个本地配置配置文件，名为 **Local**（架构师、思考、代码和调试）和 **Local - Fast**（询问，有时如果任务简单则为代码）。我计划在某个时候更新它们，使其像 OpenRouter/Gemini 配置文件一样健壮。

* * *

## 设置 “思考” 模式

摘自 https://www.reddit.com/r/RooCode/comments/1k9hcmu/this_is_going_well_for_me_orchestrator_think/

要在 Roo Code 环境中实现自定义 “思考” 模式并将其与编 Orchestrator 集成，请按照以下步骤操作：

**A) 创建一个名为 “Think” 的新 Custom 模式：**

*   • **编辑可用工具：** （“思考” 模式不需要特定工具，因为它只进行推理并返回文本。）
    
*   • **角色定义：**
    
    ```
        You are a specialized reasoning engine. Your primary function is to analyze a given task or problem, break it down into logical steps, identify potential challenges or edge cases, and outline a clear, step-by-step reasoning process or plan. You do NOT execute actions or write final code. Your output should be structured and detailed, suitable for an orchestrator mode (like Orchestrator Mode) to use for subsequent task delegation. Focus on clarity, logical flow, and anticipating potential issues. Use markdown for structuring your reasoning.
    
    ```
    
*   • **模式特定自定义指令：**
    
    ```
    使用 Markdown 标题和列表清晰地组织您的输出。首先总结您对任务的理解，然后是分步推理或计划，最后是潜在挑战或注意事项。您通过 attempt_completion 的最终输出应仅包含此结构化推理。这些特定指令将取代您模式可能具有的任何冲突的通用指令。
    
    ```
    

**B) 对 Orchestrator 模式的 -> 模式特定自定义指令进行微小编辑：**

*   • **将项目 “1.” 替换为：**
    
    ```
        1. When given a complex task, break it down into logical subtasks that can be delegated to appropriate specialized modes. For each subtask, determine if detailed, step-by-step reasoning or analysis is needed *before* execution. If so, first use the `new_task` tool to delegate this reasoning task to the `think` mode. Provide the specific problem or subtask to the `think` mode. Use the structured reasoning returned by `think` mode's `attempt_completion` result to inform the instructions for the subsequent execution subtask.
    
    ```
    
*   • **只替换项目 “2.” 的第一句话（保留提示的其余部分）：**
    
    ```
        2. For each subtask (either directly or after using `think` mode), use the `new_task` tool to delegate.
    
    ```
    

* * *

## 此设置的优势

*   • **成本效益：** 通过使用更经济实惠的专业模型（如 OpenRouter 的模型）来执行特定任务（编码、调试），并利用 **Gemini** 进行高价值的编排和推理，大大降低了总体 API 成本。
    
*   • **增强推理和规划：** 专用的 “Think” 模式确保在执行复杂问题之前对其进行彻底分析和规划，从而产生更健壮和准确的输出。
    
*   • **减少令牌浪费：** 使用 “Think” 模式进行预规划可最大限度地减少后续编码或调试阶段的试错，从而产生更简洁有效的提示和更少的令牌浪费。
    
*   • **“Vibe Coding” 体验：** 结构化、委托式的方法创建了更流畅、更直观的开发流程，增强了整体编码体验。
    
*   • **灵活性：** 能够为代码和调试模式更换模型，可以适应不同的项目需求，或利用各种 LLM 随着时间的推移而演变的优势。
    

* * *

## 可能的优化

*   • 使用 SPARC - 我听说过很多好评，但还没有研究出最佳设置方法
    
*   • 使用 Roo Commander - 我将在下一个测试项目中尝试此功能
    
*   • 使用更多 MCP 工具 - 我目前经常使用 Brave Search、Playwright 和 Contex7，但我需要研究其他有用的工具