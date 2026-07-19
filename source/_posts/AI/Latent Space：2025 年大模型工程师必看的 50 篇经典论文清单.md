---
title: "Latent Space：2025 年大模型工程师必看的 50 篇经典论文清单"
date: 2025-09-24 00:00:00
categories: AI
tags:
- 大模型论文
- AI工程师
- LLM
- RAG
- AI Agent
- 代码生成
- 计算机视觉
- 扩散模型
description: "文章整理 AI 工程 10 个关键方向的 50 篇必读论文和资源。涵盖前沿大语言模型（GPT 系列、Claude、Gemini、LLaMA、DeepSeek）、基准测试与评估（MMLU、SWE-Bench）、提示工程与思维链、检索增强生成 RAG、AI 智能体 Agents、代码生成、计算机视觉、语音技术、扩散模型和微调等领域。不仅列出论文清单，更解释每篇论文为何重要、适用什么场景，帮助 AI 工程师建立扎实的理论基础。"
---

[原文链接](https://www.latent.space/p/2025-papers)

<!-- more -->

近年来，AI 工程领域发展迅猛，各种新技术层出不穷。对于想要在这个领域深耕的工程师来说，掌握核心知识显得尤为重要。本文整理了 AI 工程 10 个关键方向的 50 篇必读论文和资源，涵盖大语言模型 (LLM)、基准测试、提示工程 (Prompting)、检索增强生成 (RAG)、AI 智能体 (Agents)、代码生成、计算机视觉、语音技术、扩散模型和微调等领域。

这份清单的目标很明确：

- 精选约 50 篇论文（一年大约每周一篇）
- 不仅告诉你什么重要，更解释为什么重要
- 对 AI 工程师来说非常实用，不会浪费时间在过于基础的内容上

## 第一部分：前沿大语言模型 (LLMs)

### 1. OpenAI GPT 系列

**GPT-1**、**GPT-2**、**GPT-3**、**Codex**、**InstructGPT**、**GPT-4** 系列论文是必读经典。此外，**GPT-3.5**、**4o**、**o1** 和 **o3**，以及 **GPT-4.5** 主要通过发布会和系统卡片介绍。

### 2. Anthropic Claude 和 Google Gemini

**Claude 3/4** 和 **Gemini 1/2.5** 系列让你了解顶尖实验室的模型思路。特别推荐关注 **Claude 3.5 Sonnet** 和 **Gemini 2.0 Flash**/**Flash Thinking**。开源方面有 **Gemma 2** 和 **Gemma 3**。

### 3. Meta LLaMA 开源系列

**LLaMA 1**、**Llama2**、**Llama 3** 系列论文是了解领先开源模型的窗口。**Mistral 7B**、**Mixtral** 和 **Pixtral** 可以看作 LLaMA 家族的延伸。中国模型表现也很出色，如 **Kimi K-2** 和 **Qwen 3**。

### 4. DeepSeek 技术栈

**DeepSeek V1**、**Coder**、**Math**(特别是 **GRPO**)、**MoE**、**V2**、**V3**、**R1** 系列展现了完整的技术演进路径。

### 5. 训练后优化综述

训练后 (Post Training) 综述论文帮助理解现代 LLM 的优化方法。

**额外推荐：**

- **ModernBERT**/**NeoBERT**：BERT 模型作为分类器仍然很强大
- **ColBERT**：在应用中表现优异
- 开源模型架构比较：各种模型的技术细节对比
- 缩放法则文献：**Kaplan**、**Chinchilla**、**Emergence**/**Mirage** 等
- 推理模型：2025 年前沿领域将由 **o1**、**o3**、**R1**、**QwQ**/**QVQ**、**f1** 等推理模型主导

## 第二部分：基准测试与评估

### 1. 知识类基准

**MMLU** 论文是主要的知识基准，与 **GPQA** 和 **BIG-Bench** 并列。2025 年前沿实验室使用 **MMLU Pro**、**GPQA Diamond** 和 **BIG-Bench Hard**。

### 2. 长上下文评估

**MRCR** 论文用于评估长上下文能力，被 OpenAI 采用，优于 **MuSR**、**LongBench**、**BABILong** 和 **RULER**。解决了过度依赖 **Needle in a Haystack** 测试的问题。

### 3. 数学能力测试

**MATH** 论文包含数学竞赛题合集。前沿实验室关注 **FrontierMath**、**AMO** 和 MATH 子集：MATH level 5、**AIME** 和 **AMC10/AMC12**。

### 4. 指令遵循评估

**IFEval** 论文是领先的指令遵循能力评估。另有 **Multi-IF**、**COLLIE** 和 **Scale MultiChallenge**，已取代 **MT-Bench**。

### 5. 抽象推理测试

**ARC AGI** 挑战是著名的抽象推理 "智力测试" 基准，生命周期远超许多快速饱和的基准。

基准测试饱和速度越来越快，整个方法论可能需要新的替代方案。

## 第三部分：提示工程与思维链

### 1. 提示工程综述

**提示工程报告 (The Prompt Report)** 论文是关于提示工程的全面综述。

### 2. 思维链推理

**思维链 (Chain-of-Thought)** 论文推广了思维链概念，与 **Scratchpads** 和 **Let's Think Step By Step** 并列。

### 3. 高级推理方法

**思维树 (Tree of Thought)** 论文引入了前瞻和回溯特征。

### 4. 软提示技术

**提示调优 (Prompt Tuning)** 论文展示了不需要硬编码提示的方法，可以进行**前缀调优 (Prefix-Tuning)**、调整解码或**表征工程**。

### 5. 自动提示优化

**自动提示工程 (Automatic Prompt Engineering)** 论文表明人类是糟糕的零样本提示者，提示本身可以通过 LLM 增强。最值得注意的实现体现在 **DSPy** 论文 / 框架中。

## 第四部分：检索增强生成 (RAG)

### 1. 信息检索基础

**信息检索导论**强调 RAG 是信息检索问题，IR 有 60 年历史，包括 **TF-IDF**、**BM25**、**FAISS**、**HNSW** 等技术。

### 2. RAG 概念奠基

2020 年 **Meta RAG** 论文首次提出 RAG 术语。现代 RAG 的基本要求包括 **HyDE**、分块、重排器、多模态数据。

### 3. 嵌入模型评估

**MTEB** 论文是已知过拟合的基准，但仍是事实标准。许多嵌入模型值得关注：**SentenceTransformers**、**OpenAI**、**Nomic Embed**、**Jina v3**、**cde-small-v1**、**ModernBERT Embed**，其中 **套娃嵌入 (Matryoshka embeddings)** 越来越标准。

### 4. 知识图谱整合

**GraphRAG** 论文是微软将知识图谱整合到 RAG 的尝试，现已开源。这是 2024 年 RAG 最流行趋势之一，与 **ColBERT**/ColPali/ColQwen 并列。

### 5. RAG 系统评估

**RAGAS** 论文是 OpenAI 推荐的简单 RAG 评估工具。另有 **Nvidia FACTS 框架**和 **LLM 中的外部幻觉**综述。

## 第五部分：AI 智能体 (Agents)

### 1. 代码智能体基准

**SWE-Bench** 可能是当今最受关注的智能体基准。技术上是编码基准，但更多测试智能体而非纯 LLM。另有 **SWE-Agent**、**SWE-Bench Multimodal** 和 **Konwinski 奖**。

### 2. 工具使用基础

**ReAct** 论文开启了工具使用和函数调用 LLM 的研究，包括 **Gorilla** 和 AIFCL 排行榜。历史上有 **Toolformer** 和 **HuggingGPT**。

### 3. 长期记忆模拟

**MemGPT** 论文是模拟长期智能体记忆的方法之一，已被 **ChatGPT** 和 **LangGraph** 采用。

### 4. 认知架构设计

**Voyager** 论文提出 3 个认知架构组件：课程、技能库、沙盒。技能库 / 课程可抽象为智能体工作流记忆。

### 5. 智能体构建指南

Anthropic 的**构建高效智能体**是 2024 年现状总结，强调链式反应、路由、并行化、编排、评估和优化的重要性。

## 第六部分：代码生成

### 1. 代码数据集

**The Stack** 论文是专注于代码的开源数据集，开启了从 **The Stack v2** 到 **StarCoder** 的大量工作。

### 2. 开源代码模型

可选择 **DeepSeek-Coder**、**Qwen2.5-Coder** 或 **CodeLlama**。许多人认为 **3.5 Sonnet** 是最好的代码模型。

### 3. 代码评估基准

**HumanEval/Codex** 论文是已饱和但必备的基准。现代替代品包括 **Aider**、**Codeforces**、**IOI**、**BigCodeBench**、**LiveCodeBench** 和 **SciCode**。

### 4. 流程工程方法

**AlphaCodeium** 论文提出流程工程方法，可显著提升任何基础模型的性能。

### 5. 代码安全检测

**CriticGPT** 论文训练模型发现 LLM 生成代码的安全问题，Anthropic 使用 SAEs 识别导致问题的 LLM 特征。

## 第七部分：计算机视觉

### 1. 传统视觉任务

非 LLM 视觉研究仍重要，如 **YOLO** 论文 (现更新至 v11)，但 **DETRs Beat YOLOs** 等 Transformer 模型也受关注。

### 2. 视觉 - 文本模型

**CLIP** 论文是第一个成功的 **ViT(Vision Transformer)** 模型。现已被 **BLIP**/**BLIP2** 或 **SigLIP/PaliGemma** 超越，但仍是必备知识。

### 3. 多模态评估

**MMVP 基准**量化了 CLIP 问题。有多模态版本的 MMLU(**MMMU**) 和 **SWE-Bench**。另有 **MathVista** 和 **CharXiv**。

### 4. 图像分割

**Segment Anything Model(SAM)** 和 **SAM 2** 论文是成功的图像和视频分割基础模型，可与 **GroundingDINO** 搭配。

### 5. 融合架构研究

早期融合研究与廉价 "晚期融合" 方法 (如 **LLaVA**) 相对，涵盖 Meta 的 **Flamingo**、**Chameleon**、苹果的 **AIMv2**、Reka **Core** 等。

## 第八部分：语音技术

### 1. 语音识别

**Whisper** 论文是成功的自动语音识别模型。**Whisper v2**、**v3**、**distil-whisper** 和 **v3 Turbo** 都是开源权重模型。

### 2. 多模态语音

**AudioPaLM** 论文展示了 Google 在 PaLM 演变为 Gemini 前的语音技术思路。另有 Meta **对 Llama 3 语音探索**。

### 3. 文本转语音

**NaturalSpeech** 论文是领先的文本转语音方法之一，最近有 **v3** 版本。

### 4. 全双工语音模型

**Kyutai Moshi** 论文是令人印象深刻的全双工语音 - 文本开源权重模型。另有 **Hume OCTAVE**。

### 5. 实时语音 API

**OpenAI 实时 API：缺失的手册**记录了实时 API 相关信息，因为前沿 omnimodel 研究并未公开发表。

## 第九部分：图像 / 视频扩散模型

### 1. 稳定扩散

**潜在扩散 (Latent Diffusion)** 论文实际就是 Stable Diffusion 论文。另有 **SD2**、**SDXL**、**SD3** 系列。目前团队开发 **BFL Flux**。

### 2. DALL-E 系列

**DALL-E**/**DALL-E-2**/**DALL-E-3** 论文是 OpenAI 的图像生成模型。

### 3. Google Imagen

**Imagen**/**Imagen 2**/**Imagen 3** 论文是 Google 的图像生成模型。

### 4. 快速生成技术

**一致性模型 (Consistency Models)** 论文结合 **LCMs** 的蒸馏技术，现通过 **sCMs** 更新。

### 5. 视频生成突破

**Sora** 博客文章展示文本到视频生成，除了 **DiT 论文**外没有正式论文，但仍是年度最重要发布，有许多开源竞争者如 **OpenSora**。

自回归图像生成在今年广受欢迎，应用于 **Gemini**、**4o** 和 **Llama** 的原生图像生成。

## 第十部分：微调

### 1. 低秩适应方法

**LoRA**/**QLoRA** 论文是廉价微调模型的事实标准，无论本地模型还是与 4o 配合使用。**FSDP+QLoRA** 具有教育意义。

### 2. 偏好优化

**DPO** 论文是略逊于 **PPO** 的替代方法，现作为偏好微调得到 OpenAI 支持。

### 3. 特征微调

**ReFT** 论文不微调少量层，而专注于特征微调。

### 4. 合成数据生成

**Orca 3/AgentInstruct** 论文展示了获取微调数据的绝佳方法，合成数据是热门方向。

### 5. 推理能力微调

强化学习 / 推理微调论文虽有争议，但 **Let's Verify Step By Step** 和相关公开演讲揭示了工作原理。

---

这份清单涵盖了 AI 工程领域的核心知识体系。需要注意的是，许多前沿技术已从研究转向工业界，实用的工程建议往往在行业博文和演讲中，而非学术论文。建议结合理论学习和实际项目经验，通过开源框架和工具进行实践。

无论是初学者还是有经验的工程师，这 50 篇论文都能帮助建立扎实的理论基础，为在 AI 工程领域的深入发展奠定基础。记住，技术发展很快，保持学习和实践是关键。