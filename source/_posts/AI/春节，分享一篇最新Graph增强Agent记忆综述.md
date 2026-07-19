---
title: "春节，分享一篇最新Graph增强Agent记忆综述"
date: 2026-02-26 00:00:00
categories: AI
tags:
- Agent记忆
- 图结构
- 综述
- AI下半场
- 记忆机制
- 大模型
- 知识管理
- 自适应
- 实践体悟
description: "本文解读香港理工大学、厦门大学联合发表的Graph-based Agent Memory综述论文。文章提出知识记忆与经验记忆的双重维度分类框架，详细阐述图结构记忆如何解决传统线性存储的局限。图结构记忆能更好地表示实体关系、支持复杂推理、实现知识积累与自我进化，是2025-2026年Agent记忆研究的前沿方向。"
---

>https://arxiv.org/pdf/2602.05665
  Graph-based Agent Memory: Taxonomy, Techniques, and Applications
  https://github.com/DEEP-PolyU/Awesome-GraphMemory.

<!-- more -->

香港理工大学、厦门大学等联合发表了基于 **Graph** 的 **Agent Memory** 最新技术综述年前看到最有深度的AI下半场Agents记忆机制综述

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/14196d07304f1a5b2169107d633edb01c9f18373.png)

## 一、为什么需要图结构记忆

LLM 驱动的 AI Agent 虽然展现出强大的推理能力，但面临着三个根本性局限：**知识截断**，**工具 incompetence**、**性能饱和。[刚刚，Gemini 3.1 Pro 突发，推理翻倍，编程翻车](https://mp.weixin.qq.com/s?__biz=Mzk0MTYzMzMxMA==&mid=2247504273&idx=1&sn=4b39f5cdf5e99e0ee77353a6126e2060&scene=21#wechat_redirect)**

**记忆（Memory）** 成为解决这些问题的核心模块——它让代理从 "无状态反应模型" 进化为 "有状态自适应实体"，实现知识积累、迭代推理和自我进化。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/d664d3e873e35c67761004e6d2d7307de67274f1.png)

图 1: AI 代理系统工作流程与记忆实现视图

传统代理记忆采用简单的线性或键值存储（如固定长度 token 序列、向量数据库、日志缓冲区），而**图结构记忆**正在成为 2025-2026 年的研究前沿。

## 二、Agent 记忆的分类学

### 2.1 双重维度：知识记忆 vs 经验记忆

提出了一个清晰的记忆分类框架，核心区分在于**知识记忆（Knowledge Memory）**与**经验记忆（Experience Memory）**：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/70963ff646cd9dce011381fa872fbcf3e6fcadaa.png)

图 2: 知识记忆与经验记忆的类型及应用

**图 2** 清晰展示了两种记忆的本质差异：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/2237a6a30636b96c7462894309e1a6fd6e0dd303.png)

知识记忆让代理 " **懂规则** "，经验记忆让代理" **会学习** "。

### 2.2 图结构的统一视角

**核心论点**：图结构是记忆的最一般形式。传统记忆可视为图的退化形式：

*   线性缓冲区 = 图中的一条链
    
*   向量记忆 = 全连接图（相似度加权边）
    
*   键值存储 = 星型图结构
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/ef63694453d2989c184e2d1d751f1d4e29e144fb.png)

图 3: 传统代理记忆与图结构代理记忆的对比

**图 3** 通过医疗问诊场景直观展示了传统记忆与图结构记忆的差异：

*   **传统记忆**：线性提取→密集向量存储→相似度检索→粗粒度更新
    
*   **图结构记忆**：结构化感知提取→显式关系编码→语义 + 关系检索→细粒度节点 / 边级更新
    

## 三、记忆的生命周期：从数据到智慧的旅程

论文按照记忆的**生命周期**（Lifecycle）组织技术体系，涵盖四个关键阶段：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/192b999a9f4491963baf56e2e6c2e802b51bb6d6.png)

图 4: 图结构记忆管理技术的全面分类

**图 4** 展示了图结构记忆技术的完整分类体系，从提取（Extraction）、存储（Storage）、检索（Retrieval）到演化（Evolution），每个阶段都包含多种技术路线和代表性工作。

### 3.1 记忆提取：从原始数据到结构化内容

记忆提取将原始观察（Raw Observations）转化为结构化记忆单元，根据数据源类型采用不同策略：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/4a01f914bb8f4d1ef78ad2e75f1ae5059ece2e48.png)

图 5: 记忆提取的统一流程

**图 5** 展示了从原始数据源到功能记忆类型的完整提取流程：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/06d05f9819dbdd2ef4e399f91c6d15c150e4211a.png)

### 3.2 记忆存储：组织心智的架构

存储阶段的核心挑战是将提取的异构工件转换为保留语义、支持高效检索和可靠更新的格式。论文系统分析了五种图结构范式：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/515ddc1632fa41eb59996f578bf1ab1867090122.png)

图 6: 图结构构建范式的分类、记忆功能与优缺点对比

**图 6** 详细对比了五种图结构范式的特点：

*   A. 知识图谱（Knowledge Graph）
    
*   B. 层次结构（Hierarchical Structure）
    
*   C. 时序图（Temporal Graph）
    
*   D. 超图（Hypergraph）
    
*   E. 混合架构（Hybrid Architectures）
    

### 3.3 记忆检索：召回过去的技术

检索阶段操纵图记忆以支持下游推理。论文将检索算子组织为三大范式：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/b7d6247201cbfb4e462d91f2907c53be8a6da0f3.png)

图 7: 检索流程架构：基础算子与增强策略

**图 7** 展示了检索流程的完整架构：

#### 基础检索算子

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/bfeeac1a74be4a3973a9281bdc6258b825ba62fd.png)

#### 检索增强策略

1.  **多轮检索（Multi-round）**: 将记忆访问视为迭代过程而非单次查询，每轮基于原始查询和已检索记忆生成下一轮查询
    
2.  **检索后处理（Post-retrieval）**: 生成 - 再检索模式，先生成中间表示（主题、意图描述），再基于中间表示检索
    
3.  **混合源检索（Hybrid-source）**: 协调内部记忆与外部资源（本地文档、在线搜索 API、任务环境）
    

### 3.4 记忆演化：随时间学习

记忆演化是图结构记忆的核心优势——通过节点 / 边 / 子图操作实现直接更新。论文区分了两种演化范式：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/9fb9d5e3f6ed57c4f109e1240b88d37663381d64.png)

图 8: 记忆演化机制的分类

**图 8** 展示了记忆演化的两大范式：

**内部自我演化**： 类比人类在睡眠中的记忆巩固，通过内省优化图拓扑。

**外部自我探索**：通过与环境交互验证知识有效性。

*   Kimi K2.5 引入可扩展的群体机制（swarm mechanism），生成并行子代理探索问题空间的不相交分支，使中央记忆快速吸收多样化视角和边缘案例。
    

## 四、开源工具与评测基准

### 4.1 开源记忆库对比

论文在附录中提供了 11 个代表性开源记忆库的系统对比：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/53d2551d5bccbf66478fe993d3806e3c5104643e.png)

表 IV: 图结构记忆系统开源库对比

### 4.2 评测基准全景

论文按应用场景将基准分为七大类：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/774dc497273a1323a1344ecc9d3d0f977d6895ce.png)