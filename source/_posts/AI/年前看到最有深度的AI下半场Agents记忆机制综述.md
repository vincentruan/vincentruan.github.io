---
title: "年前看到最有深度的AI下半场Agents记忆机制综述"
date: 2026-02-26 00:00:00
categories: AI
tags:
- Agent记忆
- 图结构记忆
- 技术综述
- 知识图谱
- 向量数据库
- LLM局限
- 记忆架构
- AI智能体
- 实践体悟
description: "本文解读UIC、IIT、斯坦福、谷歌、Meta等27家机构联合发表的83页基础智能体记忆机制综述。文章提出AI研究正从上半场的模型架构创新转向下半场的真实世界评估，记忆成为填补理想基准与现实应用之间鸿沟的关键解决方案。提出记忆基质、认知机制、记忆主体的三维统一分类框架。"
---

大家好，我是 PaperAgent，不是 Agent！

今天分享一篇 **83 页**的的**基础智能体记忆机制**综述，由 UIC, IIT, 斯坦福、**谷歌**、**Meta** 等 27 家机构联合发表。[你的 AI Agent 安全吗？深度诊断框架 AgentDoG 开源](https://mp.weixin.qq.com/s?__biz=Mzk0MTYzMzMxMA==&mid=2247503836&idx=2&sn=126efaf2a953bdd1cab5f62a5d1f0acb&scene=21#wechat_redirect)

<!-- more -->

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/614d979ad04bb599eacc6b8aba62602f6b5fb6bf.png)

Rethinking Memory Mechanisms of Foundation Agents in the Second Half: A Survey

## AI 进入 "下半场"，记忆成为关键基础设施

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/f2e2b064b51d73ac2e80cb8253ac3659a1353d8d.png)

Figure 1: 基础智能体记忆发展路线图，展示了 2023-2025 年间按记忆基质和主体分类的研究趋势。

作者提出，AI 研究正经历**范式转变**：

*   **上半场**：追求模型架构创新与基准测试分数（如 MMLU、MATH 等）
    
*   **下半场**：强调问题定义与真实世界评估，核心挑战是**长期、动态、用户依赖环境中的实际效用 [蚂蚁、小米、阿里高德组团开源 7 个模型 & 论文，具身 Agent 春天来了](https://mp.weixin.qq.com/s?__biz=Mzk0MTYzMzMxMA==&mid=2247503836&idx=1&sn=63e630704d1063b2e63b894221f276b2&scene=21#wechat_redirect)**
    

> "Memory emerges as the critical solution to fill the utility gap."  
    —— 记忆成为填补理想基准与现实应用之间鸿沟的关键解决方案

## 三维统一分类框架

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/4721b73317861e49d2207c26a5b4561bd512862e.png)

Figure 2: 基础智能体记忆系统的三维分类框架，涵盖记忆基质、认知机制和记忆主体。

提出从三个互补维度理解智能体记忆：

### 1. 记忆基质：以何种形式存储

| 类型       | 定义                 | 典型实现                | 优缺点                  |
| -------- | ------------------ | ------------------- | -------------------- |
| **内部记忆** | 存储在模型权重、状态或 KV 缓存中 | 参数化知识、潜在状态、KV Cache | 访问快、集成紧密；更新昂贵、易灾难性遗忘 |
| **外部记忆** | 存储在向量索引、结构化存储中     | RAG 向量库、知识图谱、文本记录   | 可扩展、易更新；检索延迟、可能引入噪声  |

### 2. 认知机制：如何发挥作用

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/6de9edd30f0a56a7f1c64720e56b25184c358a46.png)

Figure 5: 认知机制（感觉、工作、语义、情景、程序记忆）与记忆主体（用户中心 vs 智能体中心）的论文分布热力图。

| 记忆类型     | 功能               | 研究热度趋势                   |
| -------- | ---------------- | ------------------------ |
| **感觉记忆** | 短暂保留感知输入，支持注意力选择 | 2025 年快速增长（多模态 / 具身智能驱动） |
| **工作记忆** | 临时存储和操作任务相关信息    | 始终是研究核心                  |
| **情景记忆** | 存储具体经验（时间、地点、情境） | 2025 年爆发式增长              |
| **语义记忆** | 存储抽象知识和事实        | 稳步增长                     |
| **程序记忆** | 存储技能和操作流程        | 新兴热点                     |

### 3. 记忆主体：为谁服务

*   **用户中心记忆**：存储用户偏好、历史交互、个性化信息
    

*   关键挑战：对话中的记忆管理、长期个性化、隐私保护
    

*   **智能体中心记忆**：存储智能体自身积累的知识和技能
    

*   关键挑战：长期任务执行、领域特定解决方案、跨任务知识迁移
    

## 记忆操作机制：从单智能体到多智能体

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/e3edc7f1003d5d1bfec9d8c0155368c42ee02370.png)

Figure 6: 基础智能体记忆系统的操作机制，涵盖单智能体的五大核心操作与多智能体的协调策略。

### 单智能体系统的五大操作

<table><thead><tr><th><section><span leaf="">操作</span></section></th><th><section><span leaf="">功能描述</span></section></th></tr></thead><tbody><tr><td><strong><span leaf="">存储与索引</span></strong></td><td><section><span leaf="">使用向量、结构化或文本格式组织信息，确保高效检索</span></section></td></tr><tr><td><strong><span leaf="">加载与检索</span></strong></td><td><section><span leaf="">过滤和排序相关记忆，注入当前上下文</span></section></td></tr><tr><td><strong><span leaf="">更新与刷新</span></strong></td><td><section><span leaf="">动态修订记忆条目以适应新信息</span></section></td></tr><tr><td><strong><span leaf="">压缩与摘要</span></strong></td><td><section><span leaf="">将详细交互历史压缩为紧凑抽象，控制记忆增长</span></section></td></tr><tr><td><strong><span leaf="">遗忘与保留</span></strong></td><td><section><span leaf="">移除过时数据，保留高价值知识</span></section></td></tr></tbody></table>

### 多智能体系统的特殊挑战

|架构类型|特点|代表工作|
|---|---|---|
|**仅私有**|各智能体独立记忆，强隔离但冗余|RecAgent, TradingGPT|
|**共享工作区**|公共池共享中间结果，需防噪声|MetaGPT, InteRecAgent|
|**混合架构**|私有 + 共享层，权限控制|Collaborative Memory, MirrorMind|
|**编排式**|中央控制器协调记忆访问|ChatDev, MIRIX|

## 记忆学习策略：从提示到强化学习

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/f554445bf35ca63158786d3152cf1c3a6a1cfa3c.png)

Figure 7: 基础智能体记忆系统的学习策略，展示提示工程、微调和强化学习三种范式。

论文将记忆策略学习分为三个层次：

### 层次一：基于提示的学习

*   **静态提示**：预定义规则，如 MemGPT 的层级记忆管理
    
*   **动态提示**：测试时根据反馈调整，如 Reflexion 的自我反思
    

### 层次二：微调参数化策略

*   将记忆行为内化到模型参数
    
*   关键挑战：策略稳定化、边界控制、检索优化
    

### 层次三：强化学习

*   **步级决策**：学习何时存储、更新、删除（如 Memory-R1）
    
*   **轨迹级表示**：学习压缩和摘要策略（如 MemSearcher）
    
*   **跨回合记忆**：积累可复用策略，支持持续学习
    

## 评估体系：超越准确率的全方位度量

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/4612e986ceef6d50d9d67ea1abae0552419acced.png)

Table 2: 基础智能体记忆评估中常用的三类指标。

### 基准测试全景

![用户中心基准](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/8cdc6c1e8c1606a7adeda3bf4ad6f07cef39d24a.png)

用户中心基准

![智能体中心基准](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/b6cff9d8384d1d57761e1b31c7522f465bd5f5b2.png)

智能体中心基准

## 应用场景：记忆赋能的 12 大领域

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/07e0fe921ddd27e8bfb4dc66c83d5fa2109bd74c.png)

Figure 8: 基础智能体记忆系统的应用领域全景图。

教育、科学研究、游戏与仿真、机器人、医疗健康、对话系统、工作流自动化、软件工程、信息流与推荐、信息检索、金融会计、法律咨询

## 六大未来方向

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/a8bfaee089318c1bdfe0246ce5f26d5c00d43a17.png)

Figure 9: 基础智能体记忆研究的六大未来方向。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/ad5813c4b04b4e4c94fe2c7f3a566960f80bdb8c.png)

## 关键洞察与启示

1.  **记忆≠存储**：现代智能体记忆已从简单的信息存储进化为**主动的认知架构**，涉及选择、压缩、遗忘、推理等复杂操作
    
2.  **上下文爆炸是核心驱动力**：随着任务从单轮问答转向长期交互（如 Deep Research、Manus），记忆设计成为系统架构的首要考量
    
3.  **学习记忆管理本身**：前沿趋势是让智能体通过 RL 学习**如何管理记忆**，而非依赖人工设计的启发式规则
    
4.  **评估需与时俱进**：现有基准多测试静态召回，未来需评估**动态适应、偏好漂移、安全边界**等真实能力
    
5.  **混合架构是主流**：没有单一记忆基质能主导所有场景，有效系统需组合内部（快、紧耦合）与外部（可扩展、可编辑）记忆
    

## 最后

这篇综述系统梳理了 200 + 篇文献，构建了理解智能体记忆的统一框架。在 AI"下半场"，记忆不再是一个可选组件，而是决定智能体能否在复杂现实环境中可靠、高效、个性化服务的**核心基础设施**。对于从事 AI Agent、RAG、个性化系统的研究者和工程师，这是一份不可多得的路线图。
> https://arxiv.org/pdf/2602.06052
     Rethinking Memory Mechanisms of Foundation Agents in the Second Half: A Survey
