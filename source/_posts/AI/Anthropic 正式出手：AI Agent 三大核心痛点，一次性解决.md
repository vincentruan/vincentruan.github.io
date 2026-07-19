---
title: "Anthropic 正式出手：AI Agent 三大核心痛点，一次性解决"
date: 2025-12-01 00:00:00
categories: AI
tags:
- 工具搜索
- 程序化调用
- 示例学习
- AI Agent
- 工具调用
- Anthropic
- 上下文优化
- 实践体悟
description: "本文解析Anthropic发布的三项Beta功能：Tool Search Tool（按需加载工具定义）、Programmatic Tool Calling（程序化工具调用）和Tool Use Examples（示例学习），分别解决AI Agent开发中的找工具、用工具、用对工具三大痛点。文章通过真实数据展示工具定义对Token消耗的影响，并详细阐述各功能的使用方法。"
---

还记得我之前写过的那篇Anthropic：用 Code execution 补齐 MCP 短板吗？当时我分析了 AI Agent 面临的两大瓶颈：**工具选择的困境**和**上下文的诅咒**。那时我还只是基于概念性的探讨，预判这会是行业必须攻克的难题。

<!-- more -->

没想到，Anthropic 的效率比我想象的还要快。

就在 11 月 24 日，他们正式发布了三项 Beta 功能，**直接将这些想法落地成了产品**。这不是论文，不是概念验证，而是可以在 Claude 开发者平台上直接调用的真实 API。

这篇文章，我将带你深入拆解这三个功能——**Tool Search Tool、Programmatic Tool Calling 和 Tool Use Examples**。它们分别瞄准了 AI Agent 开发中最头疼的三个问题：**找工具、用工具、以及用对工具**。

## 第一招：Tool Search Tool——让 AI 学会 "查字典"

### 痛点：工具太多，上下文先爆了

来看一个真实的数据。当你给 AI 接入 5 个常见的 MCP 服务时：

| 服务      | 工具数量       | Token 消耗        |
| ------- | ---------- | --------------- |
| GitHub  | 35 个工具     | ~26K tokens     |
| Slack   | 11 个工具     | ~21K tokens     |
| Sentry  | 5 个工具      | ~3K tokens      |
| Grafana | 5 个工具      | ~3K tokens      |
| Splunk  | 2 个工具      | ~2K tokens      |
| **合计**  | **58 个工具** | **~55K tokens** |

还没开始干活，55K tokens 就没了。如果再加上 Jira（~17K tokens），你的上下文直接逼近 100K。Anthropic 透露，他们内部测试时甚至见过 **134K tokens 被工具定义吃掉**的极端情况。

更致命的是，工具太多还会让 AI"眼花"。当存在`notification-send-user`和`notification-send-channel`这样名字相近的工具时，AI 很容易选错。

### 解法：按需加载，而非全量预载

Tool Search Tool 的思路很简单：**不要让 AI 背着整个工具箱上路，而是教它使用 "工具目录"。**

实现方式是这样的：你把所有工具定义照常提交给 API，但给绝大多数工具标记上`defer_loading: true`。这些工具不会进入 AI 的初始上下文——AI 一开始只看到一个 "搜索工具" 的能力（大约 500 tokens）。

当任务来临时，AI 会先搜索 "我需要什么工具"，找到相关的 3-5 个工具后，才把它们的完整定义加载进来。

效果如何？看这张官方对比图：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1aa4d714f27b3dca20dee78654b36667a5be7429.png)

Tool Search Tool 对比图

_左边是传统方式：所有工具定义预加载，消耗 77K tokens；右边是 Tool Search Tool：按需加载，只消耗 8.7K tokens_

*   **Token 消耗**：从 77K 降至 8.7K，**节省近 90%**
    
*   **准确率提升**：Opus 4 从 49% 提升到 74%，Opus 4.5 从 79.5% 提升到 88.1%
    

这就像是把 "死记硬背" 变成了 "开卷考试"——AI 不需要记住所有工具的细节，只需要知道 "有这么一本目录可以查"。

## 第二招：Programmatic Tool Calling——让 AI 用代码说话

### 痛点：回合制交互，中间结果撑爆上下文

这个痛点我在上一篇文章里详细讲过。传统的工具调用是 "你一句我一句" 的回合制：

1.  AI 请求获取员工列表（等待...）
    
2.  系统返回 20 个员工
    
3.  AI 逐个请求每个人的账单（等待 20 次...）
    
4.  系统返回几千条账单流水（AI 被迫全部读入上下文）
    
5.  AI 终于得出结论
    

问题在于：那几千条账单明细，AI 真正需要的只是 "谁超标了" 这个结论，但它不得不把所有原始数据都塞进自己的 "大脑" 里。

### 解法：让 AI 写脚本，自己跑批处理

Programmatic Tool Calling 允许 AI **编写一段 Python 代码**来编排整个工作流。代码在安全沙箱中运行，自行调用工具、处理数据、做聚合计算，最后只把精炼的结果返回给 AI。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/cc7d1922bd8dc08891875cb51be1ad8014060fa2.png)

<center>Programmatic Tool Calling 流程图</center>

_关键区别：工具调用的结果不再返回给模型，而是在代码执行环境中直接处理，最终只有精炼结果进入 AI 上下文_

看这段 AI 生成的代码：

```python

team = await get_team_members("engineering")
# 并行获取所有级别的预算
levels = list(set(m["level"] for m in team))
budget_results = await asyncio.gather(*[
    get_budget_by_level(level) for level in levels
])
budgets = {level: budget for level, budget in zip(levels, budget_results)}
# 并行获取所有人的开支
expenses = await asyncio.gather(*[
    get_expenses(m["id"], "Q3") for m in team
])
# 计算超标人员
exceeded = []
for member, exp in zip(team, expenses):
    budget = budgets[member["level"]]
    total = sum(e["amount"] for e in exp)
    if total > budget["travel_limit"]:
        exceeded.append({
            "name": member["name"],
            "spent": total,
            "limit": budget["travel_limit"]
        })
print(json.dumps(exceeded))
```

这段代码的精妙之处：

1.  **并行执行**：用`asyncio.gather`同时发起多个请求，而不是逐个等待
    
2.  **本地计算**：数据聚合在沙箱里完成，不经过 AI 的上下文
    
3.  **精准输出**：AI 最终只看到`exceeded`这个列表，而非 2000 + 条原始账单
    

实测数据：

*   **Token 消耗**：从 43,588 降至 27,297，**减少 37%**
    
*   **准确率**：GIA 基准测试从 46.5% 提升至 51.2%
    
*   **延迟**：省掉了 19 + 次模型推理的时间
    

Anthropic 还透露，他们的新产品 **Claude for Excel** 就是用这个技术实现的——可以读写几千行的电子表格，而不会撑爆上下文。

## 第三招：Tool Use Examples——用例子说话

### 痛点：JSON Schema 能定义结构，但无法传达 "潜规则"

这是一个容易被忽视、但实战中极其恼人的问题。

看这个工单创建工具的 Schema：

```json

{
  "due_date": {"type": "string"},
  "reporter_id": {"type": "string"}
}

```

Schema 告诉 AI："这两个字段都是字符串"。但它没说：

*   `due_date`到底要`2025-11-25`还是`Nov 25, 2025`？
    
*   `reporter_id`是`12345`还是`USR-12345`？
    

以前，开发者只能在描述里写一大堆文字说明，或者祈祷 AI 猜对。

### 解法：直接给例子，一看就懂

Tool Use Examples 允许你直接在工具定义里嵌入具体的调用示例：

```json

{
"name": "create_ticket",
"input_schema": {...},
"input_examples": [
    {
"title": "Login page returns 500 error",
"priority": "critical",
"reporter": {"id": "USR-12345", "name": "Jane Smith"},
"due_date": "2024-11-06"
    },
    {
"title": "Add dark mode support",
"reporter": {"id": "USR-67890", "name": "Alex Chen"}
    },
    {
"title": "Update API documentation"
    }
  ]
}

```

  
三个例子，AI 瞬间学会：

*   日期格式是 YYYY-MM-DD
    
*   用户 ID 是 USR - 开头的
    
*   紧急 bug 要填完整信息，普通需求可以简化，内部任务只需标题
    

这就是**少样本学习（Few-shot Learning）直接嵌入工具层**。效果：复杂参数的调用准确率从 72% 飙升到 90%。

## 组合拳：三者如何协同工作？

这三个功能不是孤立的，它们解决的是 AI 使用工具的完整链路：

|环节|痛点|解法|
|---|---|---|
|**发现工具**|工具定义太多，撑爆上下文|Tool Search Tool（按需加载）|
|**执行工具**|中间结果太多，回合制低效|Programmatic Tool Calling（代码编排）|
|**调对工具**|参数格式不明，容易出错|Tool Use Examples（示例教学）|

Anthropic 在文章中给出了分层策略的建议：

**先找瓶颈，再上对应方案：**

*   如果上下文被工具定义撑爆 → 先上 Tool Search Tool
    
*   如果中间结果太多影响推理 → 上 Programmatic Tool Calling
    
*   如果参数总是填错 → 加 Tool Use Examples
    

**然后逐层叠加：** Tool Search Tool 确保找对工具，Programmatic Tool Calling 确保高效执行，Tool Use Examples 确保调用正确

## AI Agent 正在从 "实习生" 变成 "资深工程师"

回顾这三个功能，它们的共同点是什么？

**都在教 AI 用 "工程师思维" 解决问题，而非用 "学生思维" 死记硬背。**

*   Tool Search Tool：资深工程师不会背 API 文档，他会查
    
*   Programmatic Tool Calling：资深工程师不会手动逐行处理数据，他会写脚本
    
*   Tool Use Examples：资深工程师学习新 API，第一件事是看 example
    

Anthropic 正在把这些 "工程师常识" 内化到 AI 的工作方式中。这不仅仅是功能的迭代，更是 **AI Agent 开发范式的转变**——从 "Prompt Engineering" 走向真正的 "Software Engineering"。

当 AI 可以自主搜索工具、编写代码批量处理数据、并在看不见的沙箱里完成复杂逻辑时，**我们对它的信任边界在哪里？**

以前，AI 的每一步操作都摊在上下文里，我们可以看到它 "在想什么"。现在，越来越多的过程被封装进代码里、隐藏在沙箱中。我们看到的只是输入和输出。

这是效率的必然代价，但也值得每一个 AI 应用开发者认真思考。

## 如何开始使用？

这三个功能目前都是 Beta 状态，需要通过特定的 header 开启：

```python

client.beta.messages.create(
    betas=["advanced-tool-use-2025-11-20"],
    model="claude-sonnet-4-5-20250929",
    max_tokens=4096,
    tools=[
        {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
        {"type": "code_execution_20250825", "name": "code_execution"},
        # 你的工具定义...
    ]
)

```


如果你正在构建复杂的AI Agent系统，尤其是需要接入大量MCP服务的场景，我强烈建议去认真研究。

**原文地址:** https://www.anthropic.com/engineering/advanced-tool-use
