---
title: "AI互撕后code review表现会更好？Claude、Gemini、Codex、Qwen、MiniMax 最新模型测评"
date: 2026-02-26 00:00:00
categories: AI
tags:
- AI评测
- 代码审核
- 模型对比
- Claude
- Gemini
- Codex
- 多模型协作
- 代码质量
- 实践体悟
description: "本文通过实测Opus 4.6、Gemini 3 Pro、GPT-5.2-Codex、Qwen-3.5-Plus、MiniMax-M2.5五个最新旗舰模型在代码审核任务中的表现，发现单个模型命中率最高仅53%，但通过模型辩论机制可将命中率提升至80%，L3级bug全部命中。文章深入分析各家模型风格差异，并还原辩论模式的最优设计思路。"
---

春节期间，各家模型扎堆发布，相信大家已经学累了。

但热闹归热闹，这些模型实际用起来到底怎么样？尤其是做代码审核的时候，又该怎么正确用才靠谱？

<!-- more -->

前阵子，我拿 AI 审一份 PR，发现了一个很有意思的事情：先是 Claude 说里面有 data race，Gemini 却笃定没问题。然后，我把 Opus 4.6、Gemini 3 Pro、GPT-5.2-Codex、Qwen-3.5-Plus、MiniMax-M2.5 几个最新旗舰模型全拉进来让它们自己辩论之后，发现了一个更反直觉的结论：

单个模型找已知 bug 的命中率最高也就 53%。但让它们辩论之后，命中率会直线提升到 80%。最难的 L3 级别 bug（需要系统级理解的那种），在辩论模式下全部命中。

那么，各家旗舰模型到底哪一个更强？此外，模型辩论搭配机制的最优解是什么？

本文为实验过程记录与设计思路还原。

# 01 五个最新旗舰模型测评，效果如何？

经常用 AI 辅助 coding 的话，很容易发现不同模型的 code review 风格与能力差异显著：

比如，Claude 擅长追踪完整调用链，顺着代码逐层排查，连错误处理路径也不会遗漏；Gemini 则先对代码定性，常以 “this is a disaster” 开篇，从架构层面展开分析，但难以确定其是否完整浏览代码；Codex 发言较少，但偶尔的反馈能直接命中问题要害。

那么，到底哪个更有优势？干脆在生产环境做个测评。

模型上，我选了 Opus 4.6、Gemini 3 Pro、GPT-5.2-Codex、Qwen-3.5-Plus、MiniMax-M2.5 五个最新旗舰模型。（备注：本来想加 GLM5，但懂的都懂——总是限购抢不到，只能遗憾缺席😂。）

测评工具上，采用了我此前自研的 Magpie（已开源：https://github.com/liliu-z/magpie）；测评考题均来自 Milvus（开源向量数据库，本人日常参与维护的项目），共筛选 15 个 PR。

为更好的检验模型实力，所选 PR 均有一个共同特征：合入后出现问题，需进行 revert 操作或后续 hotfix。同时，我将选择的 bug 按难度分为了 3 级：

*   L1：仅查看 diff 即可发现，如 use-after-free、off-by-one 等类型；（L1 难度过低，所有模型均能轻松检出，无区分度，故不列入最终测评）
    
*   L2（10 个）：需理解周边代码才能发现，如接口语义变更、并发竞争等，贴合日常高频 bug 场景；
    
*   L3（5 个）：需具备系统级理解能力才能发现，如跨模块状态一致性、升级兼容等，是最能检验模型深度的难点 bug。
    

测试过程，分为裸测（无任何辅助）和 Magpie 加持（给足上下文）两种模式，贴合日常不同的 code review 场景。

最终测试结果如下：

| 模式           | Claude  | Gemini  | Codex | MiniMax | Qwen      |
| :----------- | :------ | :------ | :---- | :------ | :-------- |
| Raw（裸测）      | 53%（第一） | 13%（垫底） | 33%   | 27%     | 33%       |
| R1（Magpie加持） | 47%（略降） | 33%（翻倍） | 27%   | 33%     | 40%（进步明显） |


从单个模型的测评表现中，我们能提炼出 4 个核心结论：

Claude 裸测封神：53% 的检出率全场最高，尤其是 L3 级最难 bug，裸测 5/5 全中——不用额外给上下文，就能搞定系统级问题。

Gemini 输在上下文能力：裸测只有 13%，全场最低，但加上 Magpie 的上下文后，直接涨到 33%（翻了一倍多）。说明模型不擅长自己找上下文，适合我们提前整理好代码上下文，再让它辅助审 PR 的场景。

R1 模式下 Qwen 表现不错（40%）：R1 模式下 40% 的检出率，尤其是 L2 级别 bug，拿了 5/10，是这个难度下的最高分，实用性拉满，适合日常常规 PR review，不用费心调试。

上下文不是万能的：更多的上下文提示帮了 Gemini（13% → 33%）和 MiniMax（27% → 33%），但坑了 Claude（53% → 47%）。推测原因：Claude 本身就擅长自己梳理上下文，额外注入的信息，反而成了噪音，干扰了它的判断。

测试结果跟我日常体感基本吻合，但 Gemini 的分比实际体感低一些。可能因为我平时用 Gemini 更多是多轮对话，但这个评测是固定流水线，一轮出结果，刚好卡在 Gemini 不擅长的形式上。后续换成多轮对抗后，Gemini 的表现明显改善。

# 02 五个模型辩论，效果直线提升

单个模型测评结果显示，各模型均有优劣，基于此，我尝试引入互相辩论模式，探究能否进一步提升 bug 检出效果。

辩论测试基于第一阶段的实验规则，仅增加 1 个核心要求：5 个模型同时参与，开展 5 轮对抗式辩论，所有观点必须以代码为证据，互相挑错、反驳，禁止无依据妥协。

最终辩论模式与最强个体（裸测版本的 Claude）的效果对比如下：

| 模式 | L2 (10个) | L3 (5个) | 总计检出率 |
| :--- | :--- | :--- | :--- |
| 最强个体 (Raw Claude) | 3/10 | 5/5 | 53% |
| Debate (辩论模式) | 7/10 (翻倍) | 5/5 (全中) | 80% |

可见，辩论模式的效果全面碾压单个模型，核心提升体现在两点：

命中率大幅提升：从单个模型最高的 53% 检出率飙升至 80%，尤其是 L2 级常规 bug，检出率直接翻倍，彻底弥补了单个模型的检测盲区。

难 bug 零遗漏：L3 级最难的系统级 bug，辩论模式下实现 100% 命中，而单个模型中，仅 Claude 能做到这一点，充分体现了模型协作的核心价值。

能力互补：系统级 bug 对最强个体而言难度不大，辩论模式的核心价值的是补齐了 Claude 在 L2 级常规 bug 的检测短板。

这里补充一个具体辩论细节还原：PR #44474    https://github.com/milvus-io/milvus/pull/44474

```markdown

**PR #44474**：想做一个lazy优化，搜索时不再一次性加载所有主键（primary key），改成按需拉取。

Round 1，Gemini 率先开火：

> "This PR is a minefield of bad practices, potential undefined behavior, and performance regressions disguised as an 'optimization.'"

Claude 在追 UB 和性能问题。Qwen 也找到了同样的方向：

> "The C++ memory model doesn't guarantee safety for concurrent writes to different indices of the same vector without proper synchronization."

但谁都没注意到一个更深的 bug——然后 Codex 冒了一句。Codex 发现 primary_keys_vector 虽然 resize 了，但只有经过 reduce 阶段的位置才会被实际填充，其余位置全是零值。

---

Round 2，Claude 核实了 Codex 的发现，追到了具体的下游：

> "I found it: SortEqualScoresByPks runs before ReduceResultData. So when SortEqualScoresByPks executes, zero PKs have been lazily fetched yet. The entire primary_keys_vector is full of default-constructed PkType values."

排序函数跑的时候主键还没加载，排的全是零值。Claude 公开让了功：

> "codex-cli identified a genuine critical correctness bug. I missed this in my first round."

---

可以看到，Gemini 气势最猛但抓的是表面问题，Claude 和 Qwen 分析细致但第一轮也没看到核心，Codex 话最少一句话点到要害——然后 Claude 接过线索把完整杀伤链追了出来。
```

# 03 模型怎么搭配，找到 bug 最多？

53% 到 80% 的检出率提升背后，在于不同模型互补了彼此的能力盲区。那么，新的问题来了，哪些模型互相搭配，效果更好？

此前，在 R1(有上下文加持) 模式下每个模型找到的 bug 数量如下：Claude 7/15（47%），Qwen 6/15（40%），Gemini 和 MiniMax 各 5/15（33%），Codex 4/15（27%）。

此外，五个模型联合覆盖 11/15 的 bug——还有 4 个 bug 全军覆没。

这里面有一个有意思的细节是，Claude 找到的最多，但也只覆盖了不到一半。它漏掉的 8 个里，Gemini 能补 3 个——一个并发竞态、一个云存储 API 兼容性、一个权限校验遗漏。反过来，Gemini 漏掉的数据结构和深层逻辑 bug，Claude 几乎全找到了。

而将不同模型两两组合后，整体的 bug 检出率如下：

| 两模型组合 | 联合覆盖 |
| :--- | :--- |
| Claude + Gemini | 10/15 |
| Claude + Qwen | 9/15 |
| Claude + Codex | 8/15 |
| Claude + MiniMax | 8/15 |

也是因此，针对我们的测评集，Claude + Gemini 是最优两模型组合，两个就能覆盖五个联合上限的 91%。

此外，在把 bug 的类型与数量进一步增加做对比之后，我们还发现，Claude + Gemini 并非所有场景下的最优解，bug 类型决定了模型的适配性：

按 bug 类型看各模型的强项：

| Bug 类型    | 总数  | Claude | Gemini | Codex | MiniMax | Qwen |
| :-------- | :-- | :----- | :----- | :---- | :------ | :--- |
| 校验遗漏      | 4   | 3      | 2      | 1     | 1       | 3    |
| 数据结构/生命周期 | 4   | 3      | 1      | 1     | 3       | 1    |
| 并发竞态      | 2   | 0      | 1      | 0     | 0       | 0    |
| 兼容性       | 2   | 0      | 1      | 1     | 0       | 1    |
| 深层逻辑      | 3   | 1      | 0      | 1     | 1       | 1    |
| 合计        | 15  | 7      | 5      | 4     | 5       | 6    |

可以看出，数据结构生命周期找 Claude 和 MiniMax，并列 3/4。校验遗漏找 Claude 和 Qwen，并列 3/4。并发和兼容性 Claude 反而是 0——刚好是 Gemini 补位的地方。没有全能选手——但 Claude 覆盖最广，是最接近全能的那个。

至于那 4 个全军覆没的 bug——一个是 ANTLR 语法规则优先级、一个是跨函数的读写锁语义差异、一个需要理解不同 compaction 类型的业务含义、一个是变量单位 MB vs bytes 不一致的静默比较错误。

共同特点：代码语法完全正确，bug 藏在开发者脑子里的假设中，不在 diff 里，甚至不在周边代码里。

当前 AI 做 code review 的天花板，大概就在这里。

# 04 找完 bug 改 bug，谁最可靠？

日常 code review 中，仅找到 bug 远远不够，模型给出的修改建议好用，同样是核心评价标准。

因此，本次实验在辩论结束后，我们还新增了模型 review 质量互评环节，进一步筛选实用型模型。

互评规则：每个模型开启新会话作为裁判，采用匿名打分（将 5 个模型随机映射为 Reviewer A/B/C/D/E），打分维度包括 4 项，每项 1-10 分：准确性、可操作性、深度、清晰度。（裁判无法知晓所评内容对应的模型，确保评分客观性。）

这一轮的最终评分如下：

| 模型 | 准确性 | 可操作性 | 深度 | 清晰度 | 综合 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Qwen | 8.6 | 8.6 | 8.5 | 8.7 | 8.6 |
| Claude | 8.4 | 8.2 | 8.8 | 8.8 | 8.6 |
| Codex | 7.7 | 7.6 | 7.1 | 7.8 | 7.5 |
| Gemini | 7.4 | 7.2 | 6.7 | 7.6 | 7.2 |
| MiniMax | 7.1 | 6.7 | 6.9 | 7.4 | 7.0 |


互评结果显示，Qwen 和 Claude 的 review 质量并列第一，其建议的准确性、可操作性，以及分析的深度、表述的清晰度，均远超其他 3 个模型；Codex、Gemini、MiniMax 表现相对普通，无明显优势。

# 05 小结

五轮辩论看下来，每个模型的个性非常鲜明：

Claude：严谨细致，擅长追踪完整调用链和深层逻辑，能自主梳理上下文，L3 级 bug 检出能力独一档；偶尔会在数学层面过度自信，但认错态度坦诚，会主动解释错误原因，适合核心代码、深层 bug 的审核。

Gemini：风格激进，擅长从架构层面定性问题，对代码风格和工程规范高度敏感；但常聚焦表面问题，review 深度不足，互评排名靠后；其质疑能推动其他模型严谨验证，适合搭配 Claude 使用，补充架构层面的视角。

Codex：沉默寡言，发言频次低，但 bug 检出命中率高，偶尔能精准命中核心问题；在辩论中常能提供关键线索，适合作为辅助模型，补充检测盲区。

Qwen：综合表现优秀，review 质量与 Claude 并列第一，擅长综合各方观点、梳理重点，修改建议可操作性强；L2 级常规 bug 检出能力突出，适合日常常规 PR review；偶尔会因上下文窗口限制，在多轮辩论后丢失上下文，出现反馈异常。

MiniMax：单个模型的 bug 检出能力偏弱，适合作为辅助模型补充使用。

最后，坦诚说一下这个实验的局限，避免大家过度解读，也保证实验的客观性：

样本量不大：只有 15 个 PR，且都来自同一个 Go/C++ 项目，不代表所有编程语言、所有业务场景的结果，仅供参考。

模型有随机性：同样的 Prompt 跑两次，结果可能不一样，文中数据是一次快照，不是稳定期望值。不能根据这个实验明确得出所谓的模型能力排行，但是得出辩论比个体强，某些模型擅长某些方向，这些趋势是没有问题的。

顺序影响表现：辩论中发言顺序固定，可能影响后面模型的判断。

另外，本次实验所有相关工具全部开源：更多 milvus issue 集合 https://github.com/milvus-io/milvus/issues

Magpie：多 AI 协作 code review 工具。https://github.com/liliu-z/magpie

AI-CodeReview-Arena：评测流水线 + 配置 + 脚本。https://github.com/liliu-z/ai-code-review-arena
