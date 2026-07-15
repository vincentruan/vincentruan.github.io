---
title: Claude Code 的设计艺术：复杂性如何不进入主循环
date: 2026-07-15 00:00:00
tags:
  - AI
  - Agent
  - Claude Code
  - 架构设计
categories:
  - AI
  - 技术分享
excerpt: 深入解析 Claude Code 的设计哲学：如何通过工程化手段将复杂性从主循环中剥离，实现可扩展、可治理的 Agent 系统。
---

INTERNAL SHARING · 2026.07
  # Claude Code 的设计艺术


做 agent 最容易犯的错，是把所有复杂性都塞进主循环：工具多了，循环里加分支；权限复杂了，循环里加判断；上下文爆了，循环里加摘要；多 Agent 协作了，循环里再加调度。最后循环看起来无所不能，实际变成一个谁也不敢改的泥球。

  Claude Code 的巧妙之处不在于主循环复杂，而在于主循环克制。它把复杂性拆到工具、Hook、权限、上下文、记忆、错误恢复、多 Agent 协作这些可治理的位置上。

Claude Code = 小而稳定的 agent loop
           + 可注册的工具能力
           + 受信任顺序约束的 Hook / Permission
           + 以 cache 为中心的上下文组织
           + 分层 Compact 与长期 Memory
           + 错误状态机与多 Agent 文件协议
           + 清晰的用户授权边界
  这场分享的重点不是背 Claude Code 有哪些 API，而是理解一套工程审美：模型负责判断，harness 负责给模型提供可控的环境。


![Computer vs LLM Agent — harness 就是操作系统](/images/claude-code-design-art/harness-vs-computer.png)

*裸 LLM = 没有操作系统的 CPU；harness 才是管理内存 / IO / 驱动、把模型变得可用的那层 OS　·　图：Akshay（DailyDoseOfDS）*


    本次分享的目标
    两类听众，一套设计思维

① 已经在用 Claude Agent 的人 —— 看完知道它每个机制为什么这么设计、什么场景该用、什么场景不用，从"能调通"升级到"用得明白"。② 在自建 agent 的人 —— 不必照搬 cc 的实现，但可以借鉴它的设计思维：哪些东西必须落到结构里、哪些交给模型判断、哪些用 OS 原语而不是中间件。




    CHAPTER · 00

## 复杂性为什么不能进入主循环8 min↔ s01 / query.ts


第一章只解决一个问题：agent 的主循环到底应该承担什么职责。答案越清楚，后面所有机制才知道该放在哪里。




### 故事的开始：耳熟能详的agent loop到底是什么？


一个最小 agent loop 只有三件事：把 messages 发给模型；如果模型返回 tool_use，就执行工具；把 tool_result 塞回 messages，再进入下一轮。这个循环看起来简单，但它决定了整个系统的形状。


while True:
    response = client.messages.create(messages=messages, tools=tools)
    messages.append(assistant_message(response))

    tool_calls = extract_tool_use_blocks(response.content)
    if not tool_calls:
        return response

    results = execute_tools(tool_calls)
    messages.append(user_message(results))


![Agent Loop](/images/claude-code-design-art/agent-loop.svg)

*FIG. 01 · agent-loop.svg — 主循环只负责模型调用、工具执行、结果回填*

  真正的分歧从这里开始。很多 agent 框架会让 loop 逐渐承担越来越多职责：工具选择、参数修正、权限审批、上下文裁剪、错误重试、任务调度、子代理生命周期。短期看实现快，长期看每个新功能都会改主循环，系统很快失去稳定性。


    核心判断
    主循环应该稳定，复杂性应该外置

Claude Code 的设计选择是：主循环只保持三个稳定动作，复杂机制全部挂在 loop 的边界上。工具扩展挂在 dispatch；权限挂在 canUseTool；Hook 挂在 lifecycle event；Compact 挂在发请求前；Memory 挂在上下文装配；Error Recovery 挂在响应状态；多 Agent 协作挂在文件协议。




### 一个细节决定延迟：信 content，不等 stop_reason


在 streaming 响应里，stop_reason 往往比实际 tool_use block 晚到几秒。Claude Code 源码 query.ts:554-558 注释原文："stop_reason === 'tool_use' is unreliable." —— cc 不看 stop_reason，看响应内容里有没有 tool_use block。这个差别不是语法偏好，是能否把模型生成和工具执行流水线并发的决定性差别。


cc 真实用的字段：源码维护一个 needsFollowUp: boolean 标志（query.ts:554-558），每个 chunk 到达时扫描 content，看到第一个完整的 tool_use block 就设 true，不等 message_delta 里的 stop_reason。本地工具准备 / IO 启动可以立刻开始。


为什么 stop_reason 晚到 —— SSE 流式响应的真实事件顺序：


T=0s     POST /messages
T=2s     message_start                       { id: "msg_01" }
T=2.1s   content_block_start  (text)        index: 0
T=2.2s   content_block_delta  (text)        "我先"
T=2.3s   content_block_delta  (text)        "查一下文件"
T=5s     content_block_stop   (text)        ← text 块结束
T=5.1s   content_block_start  (tool_use)    FileRead
T=5.2s   content_block_delta  (input)       '{"path"'
T=5.4s   content_block_delta  (input)       ': "/etc/passwd"}'
T=5.5s   content_block_stop   (tool_use)    ← ★ 第一个 tool_use 完整了
T=5.6s   content_block_start  (tool_use)    Bash
T=5.7s   content_block_delta  (input)       '{"cmd"...'
T=8s     content_block_stop   (tool_use)    ← 第二个 tool_use 完整
T=8.1s   message_delta                       stop_reason: "tool_use"  ← ★ 才到
T=8.2s   message_stop

  关键差距：T=5.5s 第一个 tool_use 已经完整 → T=8.1s stop_reason 才到，中间 2.6 秒。这中间内容里早就有完整的 FileRead({path: "/etc/passwd"}) 调用了，但状态字段还没填。


"等 stop_reason"的客户端在这 2.6 秒干什么 —— 干等。


T=5.5s   收到完整 FileRead 调用 → 不敢执行（等 stop_reason）
T=5.6s ~ T=8s   后续 tool_use 继续 stream，客户端继续等
T=8.1s   stop_reason 到 → 才开始执行 [FileRead, Bash]
T=8.1s + IO 时间   FileRead 结果到

  cc 的客户端（看 content）：


T=5.5s   needsFollowUp = true → 立即执行 FileRead（disk read 启动）
T=5.6s ~ T=8s   模型在 stream Bash，FileRead 已经在读盘
T=7s     FileRead disk 读完返回（模型还在 stream Bash）
T=8s     收到完整 Bash 调用 → 立即执行
T=8.1s   stop_reason 到 → FileRead 早已完成，只需等 Bash

  整体延迟 ↓ 2-5 秒（看工具执行时间）。"并发"在这里的具体含义 = 模型 token 生成 ↔ 客户端工具执行 流水线（pipeline）。等 stop_reason = 串行（先全部生成完再全部执行）；看 content = 流水线（tool_use_N 一完整就送去执行，模型继续生成 tool_use_N+1）。


这个点放在开场，是为了说明主循环的第一个原则：loop 不该迷信协议尾部状态，要捕捉内容里的早期信号。后面工具并发、Compact、Error Recovery 都遵循这个原则 —— 任何"信 API 字段才动作"的等待性代码都该重新审视。streaming 协议下，状态字段晚于内容到达是常态，不只 stop_reason，还有 usage / cache_metrics / model_id 等 metadata。


### 后面所有章节都回答一个问题


    01能力怎么扩展工具增加时，主循环不增加分支。
    02扩展怎么不越权Hook 能插入动作，但不能推翻权限边界。
    03上下文怎么可控先保护 cache，再按生命周期压缩。
    04协作怎么不混乱把共享状态落到文件协议和 worktree 隔离里。



    CHAPTER · 01

## 工具越来越多，为什么主循环不用改12 min↔ s02


这一章不讲工具清单，而讲一个扩展性问题：模型需要越来越多能力时，怎样让能力扩展发生在工具层，而不是让主循环变成一堆 if/else。




### Bash is All You Need ？


最早的 agent 往往只有一个 Bash 工具。模型要读文件，就生成 cat file；要搜索代码，就生成 grep -R；要改文件，就生成 python -
    Bash-only工具语义藏在命令字符串里系统只能看到 `bash("grep -R xxx .")`，很难知道这是搜索、读取、写入还是危险删除。权限、并发、安全判断都要从字符串里猜。
    Semantic tools能力被拆成可治理的工具系统看到 `Read(path)`、`Glob(pattern)`、`Edit(file, patch)`，每个工具有 schema、权限策略、结果预算和并发语义。



### Dispatch map：扩展能力，不扩展循环


Claude 的基本做法很朴素：工具注册到一个 dispatch map，主循环只按工具名查表调用。增加 Read / Write / Glob / Grep / Edit，不需要改 loop，只要增加工具定义和 handler。


![Tool Dispatch](/images/claude-code-design-art/tool-dispatch.svg)

*FIG. 02 · tool-dispatch.svg — 循环不变，dispatch map 接管分发*


TOOL_HANDLERS = {
    "bash":  run_bash,
    "read":  read_file,
    "write": write_file,
    "glob":  glob_files,
    "grep":  grep_files,
}

output = TOOL_HANDLERS[block.name](**block.input)
  这里的设计价值不是“用了一个字典”，而是主循环不再关心工具细节。工具越多，loop 越应该稳定；工具自己的 schema、validateInput、permission、maxResultSize、isConcurrencySafe 都留在工具层。


### 工具调用进入执行前，要经过一条治理管线


一个工具调用不是“模型说了就执行”。生产级 agent 至少要回答五个问题：


入参形状对不对？—— schema 验证。
    语义是否合法？—— 例如 path 是否在允许目录内。
    调用前有没有外部逻辑要插入？—— PreToolUse Hook。
    这个动作是否需要用户或组织授权？—— Permission。
    执行结果如何进入上下文？—— 结果预算与落盘。


这条管线解释了为什么工具章不能只讲“注册表”。注册表解决能力扩展，治理管线解决能力扩展后的安全、并发和成本问题。


### 并发安全不能按工具名判断，要按具体输入判断


模型一轮可能返回多个工具调用，比如 [Read A, Read B, Glob, Bash rm, Read C]。如果全部串行，慢；如果全部并发，危险。关键是“并发安全”不是工具名决定的，而是具体输入决定的。


| 工具调用 | 是否可并发 | 原因 |
| --- | --- | --- |
| Read({path:"a.ts"}) | safe | 纯读，不改变环境。 |
| Glob({pattern:"*.ts"}) | safe | 扫描文件名，不改变环境。 |
| Bash({command:"ls"}) | safe | 同样是 Bash，但这个输入只有读取语义。 |
| Bash({command:"rm tmp"}) | unsafe | 同样是 Bash，但这个输入改变文件系统。 |


Claude 的调度不是简单把“读工具并发、写工具串行”，而是把连续 safe 调用切成 batch：batch 内并发，batch 间串行。这样既不破坏模型原始顺序，又能压榨并行度。


![Concurrency Comparison](/images/claude-code-design-art/concurrency-comparison.svg)

*FIG. 03 · concurrency-comparison.svg — batch 内并发，batch 间保序*


### 工具结果也要治理：大结果不能直接塞进上下文


工具结果会变成下一轮 prompt。遇到大的工具结果，下意识的先截断？一个 grep 扫全仓返回 100KB，一个命令输出 500KB，如果直接放进 messages，会迅速挤爆上下文，而且会稀释模型注意力。Claude 的处理方式是：每个工具声明自己的结果预算，超过阈值就落盘，只在上下文里留下预览和路径占位。

  为什么这仍然属于工具章工具不只提供能力，也声明结果如何被上下文消费
一个成熟工具的定义不只是 name 和 schema，还包括结果预算、是否可并发、权限策略、是否可被 compact 接管。这样主循环不需要知道“grep 输出太大怎么办”，工具层自己把结果变成可治理对象。


### FileRead 的 Infinity —— 一个常量承担两层含义


工具返回的内容会直接进 messages，模型下一轮就能看到。但有个问题：内容可能很大。一次 cat 一个 10MB 文件 = tool_result 几百万字符塞进 messages → 立刻撑爆 context window → 下一轮 prompt_too_long 报错。后续对话彻底没法跑。


cc 的解法：每个工具定义里有个 maxResultSizeChars 字段（一个具体数字，比如 200000）。工具调用完后 cc 跑这段代码：


if (resultSize > tool.maxResultSizeChars) {
  落盘到 .task_outputs/tool-results/{tool_use_id}.txt
  messages 里只留  标记 + 前 2000 字符预览
} else {
  直接进 messages
}

  典型工具阈值是 200KB。返回超 200KB 就落盘，模型看到 placeholder 标记知道完整内容在磁盘上，要看再 FileRead 那个落盘文件一次。


但这套机制有个隐患 —— "FileRead 那个落盘文件" 也是 FileRead 调用。10MB 大文件流程是这样的：


// 第 1 轮
FileRead a.txt(10MB) → resultSize = 10MB > 200KB → 落盘到 .task_outputs/A.txt
→ messages 里只有 placeholder

// 第 2 轮 · 模型想看完整内容
FileRead .task_outputs/A.txt(10MB) → resultSize = 10MB > 200KB → 又落盘
→ messages 里又只有 placeholder

// 第 3 轮 · 模型还是看不到，再 read 一次
FileRead .task_outputs/A_2.txt(10MB) → ...

→ 永动机循环：模型永远看不到完整内容

  cc 的解：把 FileRead 这个工具的 maxResultSizeChars 设成 Infinity。JS 里 Infinity 是一个特殊数字常量，任何数字跟它比 > 都返回 false。所以 10_000_000 > Infinity 是 false → 那条 if 分支永远进不去 → FileRead 永远走 else 直接塞 messages → ".task_outputs/A.txt 这种落盘文件根本不会被创建" → 上面循环的第 1 轮就不发生 → 永动机自始不存在。


反直觉对照：很多人会问 "为啥不在 if/else 里检查 '如果路径是 .task_outputs/ 开头就跳过'？" —— 因为 if/else 是事后捕获：你得先发生过一次 "落盘 → 再读" 才有机会检查；而且这个 if 怎么写？基于路径前缀？文件命名规则一变就漏；基于 callsite？以后多个地方调 FileRead 全要复制这个检查。Infinity 是事前消除：让 "FileRead 触发落盘" 这条 edge 在结构上根本不存在。事前消除比事后熔断可靠。


但还有问题：FileRead 不落盘 → 10MB 内容直接塞 messages 不还是会爆 context 吗？这层有 §05 Compact 系统接管 —— 源码 toolExecution.ts:394 用 !Number.isFinite(t.maxResultSizeChars) 这个判断把 FileRead 这类工具过滤出来传给 applyToolResultBudget，告诉 compact 系统 "这些工具的结果归我管，你不要碰"。


所以同一个 Infinity 数值同时承担两件事：


含义 1：堵永动机 —— resultSize > Infinity 永远 false，FileRead 永远不走落盘分支
    含义 2：标记 budget 豁免名单 —— !Number.isFinite() 识别这类工具，告诉 compact "我管，工具结果预算系统别碰"


一处定义，两处用到。少一个 config 字段（不需要单独的 isCompactManaged: true 之类的开关），少一次配置漂移的风险 —— 这两个含义天然耦合（不参与工具结果预算 ⇔ 由 compact 系统管），用同一个值表达天然一致。


对自建 agent 的启示：审视自家工具表里有没有 "魔法默认值能承担多语义" 的机会。比如 timeout=Infinity 可以同时表达 "无超时 + 这个工具的等待由别的机制管"。少一个 config 就少一次 "两个 config 不一致导致 bug" 的可能。


### backfill —— 三个 input 版本同时存在，cache 神圣不可侵犯


问题场景：模型生成 FileRead({path: "a.ts"})，input 里是相对路径。但产品 / 调试 / 权限层都需要绝对路径：


transcript / UI 想显示 /home/user/project/a.ts 让用户看清楚到底读了哪个文件
    PreToolUse Hook 想拿绝对路径做权限检查（"是否在允许目录里"）
    PostToolUse 想知道实际读了哪个文件做审计


直觉做法：直接改 input.path 把相对路径换成绝对路径。问题：破坏 prompt cache 字节匹配。messages 里的 path: "a.ts" 一旦变成 path: "/home/user/.../a.ts"，下次 API 请求时这条 message 的字节跟服务端 cache 里的对不上，整段 cache 失效，几十 K token 重新付费。


cc 的解：工具可以可选实现 backfillObservableInput(input) 方法（Tool.ts:481）。源码注释原文：


> Called on copies of tool_use input before observers see it (SDK stream, transcript, canUseTool, PreToolUse/PostToolUse hooks). Mutate in place to add legacy/derived fields. Must be idempotent. The original API-bound input is never mutated (preserves prompt cache).
    — cc 源码 Tool.ts:475-479


翻译：在 tool_use 调用之前，往 input 的副本里补一些"模型没写但观察者需要看到"的字段，原始 input 不动。


结果：同一个 tool_use 有三个 input 版本同时存在：


1. 原始 input          = {path: "a.ts"}                            → 留给 API 用（cache 命中）
2. backfill 副本       = {path: "a.ts", _resolved: "/home/...a.ts"} → 给 SDK 流 / transcript / hook 看
3. (可选) updatedInput  = hook 返回的全新 input                     → 给后续 permission / 执行用

  cc 在 query.ts:768-772 调 tool.backfillObservableInput(inputCopy) 在副本上 mutate，然后只当 backfill 实际 ADDED 新字段时才 yield 副本（如果只是覆盖现有字段就不 yield，避免破坏 transcript hash 测试）。这层"added vs overwrote"的判断把"为 cache + 测试都不破坏"的双重约束塞进一个分支里。


三个设计原则一起体现：


观察者视图 vs API 视图分离 —— 同一个 tool_use，对外展示版本可以富一些（带 derived 字段），对内字节恒定。一个对象拆两个视图
    cache 神圣不可侵犯 —— 任何"为了 UI 好看而改 input"的诱惑都先想"会不会破坏 cache 命中"。能不改前缀字节就不改
    必须 idempotent（幂等） —— backfill 可能被多个观察者调多次，结果必须一致。这是分布式系统经典约束在 LLM 应用里的应用


对自建 agent 的启示：任何"为展示丰富信息" vs "为字节稳定" 冲突的场景都该用这种模式 —— 克隆一份对象给观察者，原版留给协议层。一个对象拆两个版本，物理上让冲突不可能发生。同款思路在 React 也常见（unstable_batchedUpdates 给 DOM 提交版本 vs React 内部 commit 版本分离）/ Linux mmap COW（read-only 共享页 vs 写时 copy 独立页）—— 都是"读视图和写视图分层"的不同实现。

  本章结论工具扩展的核心不是多注册几个工具，而是让每个工具自带治理信息
工具的能力、入参、权限、并发、结果预算都在工具层声明。主循环只负责交通调度，不参与每个工具的业务判断。这样工具越多，系统不是越乱，而是越清晰。


    CHAPTER · 02

## Hook 一旦开放，风险也一起开放14 min↔ s03 / s04


Hook 的价值是让外部逻辑进入 agent 生命周期；Hook 的危险是外部逻辑可能越权、循环、篡改输入。Claude 的设计艺术，是开放扩展点，同时把风险关进确定的边界里。




### Hook 解决的问题：不改 query.ts，也能在关键瞬间插入动作


如果每个业务都要改主循环，agent 很快不可维护。比如工具调用前要审计、调用后要记录、用户提交 prompt 时要注入 git status、会话结束时要落盘 transcript、compact 前要保存上下文。这些动作都不是 agent loop 的本职工作，却都需要发生在 loop 的关键瞬间。


Hook 的价值，就是把这些“关键瞬间”开放成事件。外部逻辑订阅事件，主循环不需要知道是谁在订阅，也不需要为每个业务增加分支。


![Hooks Overview](/images/claude-code-design-art/hooks-overview.svg)

*FIG. 04 · hooks-overview.svg — lifecycle event → hook callback → 决策或上下文注入*


### 风险一：Hook 可能越权，所以 settings deny 必须先赢


Hook 是用户写的脚本。用户当然可以在 PreToolUse 里返回 allow。问题是：如果组织 settings.json 已经禁止 rm，用户脚本还能不能 allow 掉它？


Claude 的答案很硬：不能。Hook 的 allow 永远不能绕过 settings 的 deny / ask。因为 settings 是声明式策略，代表项目或组织级边界；hook 是命令式脚本，代表用户级扩展。低信任层不能推翻高信任层。


| 层级 | 例子 | 信任含义 |
| --- | --- | --- |
| 组织 / 项目 settings | deny Bash(rm *) | 稳定、可审计、可集中治理。 |
| 用户 hook | permissionDecision: "allow" | 灵活，但不可替代组织边界。 |
| 工具声明 | isDestructive | 用于 UI 提示，不作为权限裁判。 |


这不是靠文档提醒实现的，而是靠检查顺序实现：deny rule 排在权限管线最前面，hook 决策排在后面。前面已经拒绝，后面的 allow 没有翻盘机会。


### 风险二：Hook 可能形成自指循环，所以要有状态位切断


Stop hook 是一个非常危险的例子。它在模型准备结束 turn 时触发。如果 stop hook 自己报错，系统把错误注入消息流，模型看到错误后可能继续工作；下一轮结束又触发 stop hook；hook 又报错；模型又继续。这样就形成自指循环。


模型准备结束 → 触发 Stop hook
Stop hook 报错 → 错误注入 messages
模型看到错误 → 尝试继续修复
再次结束 → 再次触发 Stop hook → ...
  Claude 用一个简单的 stopHookActive 状态位切断二次触发。第一次 stop hook 激活后，后续同一轮路线上再遇到 stop，不再重复触发。这个设计的重点不是“用了一个 boolean”，而是用最小状态切断反馈环。对 agent 来说，很多事故不是单次错误，而是错误被喂回模型后形成循环。


### 风险三：Hook 可以修正输入，但不能偷走授权权


很多 hook 的目标不是批准或拒绝，而是清理输入。比如把相对路径补成绝对路径，修正 Windows 路径大小写，补一个环境变量。这类逻辑应该允许，但它不能顺手变成授权决策。


这就是 passthrough 的价值：Hook 可以返回 updatedInput，让后续管线使用清理后的入参；但它不表达 allow / deny。授权仍然交给 settings 和 permission pipeline。


    错误做法清理输入时顺便 allow路径修正 hook 变成授权者，项目 deny rule 可能被绕过，清理脚本获得了不该拥有的权力。
    Claude 做法清理和授权分开Hook 可以改 input，但不表态权限；settings deny / ask 仍然按照更高信任层执行。



### 危险权限不是一个开关，而是 4 方共同同意


--dangerously-skip-permissions 听起来像一个总开关 —— 打开了就什么都能跑，关了就回到正常权限检查。但生产系统不能让"绕过所有安全检查"这种高危能力由一个入口单独决定。如果只是一个 CLI flag，意味着任何拿到 CLI 命令权限的人（写个 shell alias / cron job / npm script）都能开它，组织 / 用户 / SDK 都无从制止。


cc 的做法：把 bypass 拆成 4 层 AND（permissions.ts:473-479 isBypassPermissionsModeAvailable()），4 个独立来源全是 true 才允许 bypass，任一 false 立刻拒绝。这 4 个来源各自属于不同的利害关系人（stakeholder），覆盖一个高危能力该被谁批准的全部维度：


| 层 | 检查来源 | 代表谁的意愿 |
| --- | --- | --- |
| ① CLI flag | --dangerously-skip-permissions 显式传入 | 用户当前意愿 —— 这次命令我确实想跑无检查模式 |
| ② 运行时 policy | isBypassPermissionsModeAvailable() 返回 true | 组织 / 企业版 policy —— 公司管理员可在 policy 层禁用，即便用户传了 CLI flag 也不生效 |
| ③ SDK API 字段 | allowDangerouslySkipPermissions options 允许 | SDK host 应用 —— 集成 cc 的应用（比如某 IDE 插件）可以决定要不要把 bypass 能力暴露给最终用户 |
| ④ 持久化确认 | bypassPermissionsModeAccepted settings 标记 = true | 用户历史承诺 —— 用户曾经看过并接受过 "Are you sure?" 警告，证明这不是误操作或盗用账号 |


4 层 AND 的实际效果举例：


开发者本地玩：① CLI flag ✓ + ② policy 默认 ✓ + ③ SDK 自己用没设字段视为 ✓ + ④ 第一次跑会弹 "Are you sure?" → 接受后 settings 标记 ✓ → 4 层全过，bypass 启用
    企业版禁了 bypass：① 用户传了 flag ✓ + ② 但 policy 设置 allowBypass: false ✗ → 直接拒绝，剩 3 层不用看。组织 policy 凌驾用户当前意愿
    SDK 集成应用没开放：① 用户传 flag ✓ + ② policy ✓ + ③ 但集成方代码里没传 allowDangerouslySkipPermissions 字段 ✗ → 拒绝。SDK host 应用决定要不要把这个能力暴露
    用户首次安装直接 -y：① flag ✓ + ② ✓ + ③ ✓ + ④ 但从没看过警告，settings 标记 false ✗ → 弹警告，必须显式接受才能继续。防止脚本意外开启


而且即便 4 层都通过 bypass 启用了，PreToolUse Hook 仍然能 deny（hook 在 bypass 之外的独立检查层）。所以实际是 "4 层 AND 决定要不要进入 bypass 模式" + "bypass 模式下 hook 还能挡" —— 五道独立闸门防护一次。


设计本质：危险能力不该由"当前进程想不想"决定，必须覆盖多个独立利害关系人。用户当前意愿 / 组织 policy / 宿主应用 / 用户历史承诺 各自独立，物理上无法被单方面绕过 —— 单点失守不会导致全线崩溃。


对自建 agent 的启示：你的产品里有没有"一个 CLI flag 就能开"的危险能力？比如 --skip-checks、FORCE=1 env var、admin-mode。这些应该拆成多方独立同意，至少覆盖：


当前意愿 —— 这次操作要显式声明
    policy 层 —— 组织 / 项目 / 团队的策略管理员能锁死
    历史承诺 —— 用户得至少接受过一次警告，证明不是误操作


同款 anti-pattern 业界很常见：rm -rf --no-preserve-root 只靠一个 flag（用户当前意愿单独决定）/ kubectl --force --grace-period=0 同理 / git push --force 没有 policy 拦截 —— 这些都属于"危险能力一个开关决定"的反面教材。cc 的 4 方 AND 是更稳妥的范式。

  本章结论Hook 的本质是开放生命周期，Permission 的本质是给开放性加信任顺序
开放 Hook 不难，难的是开放后不失控。Claude 用检查顺序、防循环状态位、passthrough、multi-party consent 把风险分层治理。Hook 能扩展 agent，但不能成为比 settings 更高的权威。


    CHAPTER · 03

## 长任务失控有两种：忘目标，污染主上下文14 min↔ s05 / s06


长任务不是靠一句“请保持专注”解决。Claude 分别处理两个失败模式：TodoWrite 解决注意力漂移，Fork 解决上下文污染。




### 症状一：模型做着做着忘了最初目标


让 agent 改 12 个文件。前 3 个文件很顺，后面开始被 lint warning、测试错误、局部 diff 拉走，最后忘了还有 9 个文件没改。这不是模型"不努力"，而是长上下文里的注意力分布发生了变化。最近的工具结果越来越多，最初的用户目标越来越远。


系统提示里写"不要忘记目标"作用有限 —— 它仍然在上下文最前面，新工具结果越堆越多，权重越来越弱。Claude 的做法是给模型一个工具，让模型把任务计划写进 messages 数组，后续每轮都能重新看到。


![Todo Overview](/images/claude-code-design-art/todo-overview.svg)

*FIG. 05 · todo-overview.svg — 模型自己写计划，下一轮自己读计划*

  TodoWrite (V1) 和 Task System (V2) 并存，按场景切换


cc 演化过程里其实有两套并存的方案，很多人以为 V2 替换 V1，实际是按场景共存。源码 utils/tasks.ts:133 的 isTodoV2Enabled() 函数决定用哪个：


export function isTodoV2Enabled(): boolean {
  // SDK headless 用户可强制启 V2
  if (isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TASKS)) return true
  // 交互式 CLI 默认 V2，非交互式（SDK）默认 V1
  return !getIsNonInteractiveSession()
}


|  | TodoWrite (V1) | Task System (V2) |
| --- | --- | --- |
| 工具数 | 1 个（TodoWrite） | 6 个（TaskCreate / TaskGet / TaskList / TaskUpdate / TaskOutput / TaskStop） |
| 存储 | 内存列表（在 messages 数组里） | 文件持久化（.tasks/task_xxx.json） |
| 结构 | 平铺 todo list | 依赖图（blocks / blockedBy 字段） |
| 并发 | — | proper-lockfile 双重锁（多 agent 同时认领有保护） |
| 默认场景 | SDK headless（非交互） | 交互式 CLI（默认） |

  为什么 SDK headless 默认 V1：headless 场景下用户没有 UI 可视化 task 依赖图，把 6 个工具暴露给模型反而要花 token 决定"这个 todo 是用 TaskCreate 还是 TodoWrite"，复杂度变成纯负担。headless 用户的 todo 只服务"模型自己记着别忘"这一个目的，1 个工具就够。


为什么交互式 CLI 默认 V2：CLI 用户能看到任务图 UI、能手动 unblock 任务、能跨会话审计任务进度（.tasks/ 持久化）、多 agent 协作时能锁认领（§08 多 Agent 章会展开）。这些场景 V2 才发挥价值，付得起 6 工具的复杂度。


共同的核心机制：不管是 V1 还是 V2，本质都是"让模型自己把计划写到一个未来轮次能读到的位置"。


V1 写到 messages 数组 —— 下一轮 messages 还在
    V2 写到 .tasks/ 文件 + 注入到下一轮 prompt —— 跨会话 / 跨 agent 持久


两者都不改变外部世界，不读文件、不写代码、不调 API。它们改变的是模型自己的工作记忆。


这个设计的核心反直觉点：cc 没有教模型"应该如何规划"，没有写 system prompt 说"每次先列 todo 再执行"。cc 只是给了模型一个写入位置。模型本来就会规划 —— 是 LLM 自带的能力 —— 但规划如果只输出在 thinking 里，下一轮就丢了。给它一个"持续可见的写入位置"，规划就自然延续。


用一句话总结：不是"命令模型记住"，是给模型一个能持续看见目标的位置。声明式手段（一个工具）解决一个直觉是命令式的问题（让模型记住目标）。


### 症状二：子任务太重，污染主上下文


另一个问题是上下文污染。比如主任务是“完成登录模块重构”，其中一个子任务是“调查历史兼容逻辑”。如果所有调查过程都留在主上下文里，主任务会被大量临时文件读取、grep 结果、错误尝试淹没。


Fork 的价值是让子任务出去跑，最后只把结论回流给父代理。父上下文保持干净，子代理可以大胆探索。


![Subagent Overview](/images/claude-code-design-art/subagent-overview.svg)

*FIG. 06 · subagent-overview.svg — 子代理探索，父代理只接收摘要结果*


### Fork 最妙的一刀：语义上新任务，字节上复用旧前缀


如果子代理完全从空 messages 开始，它会丢掉父代理已经加载的 system、tools、CLAUDE.md、项目上下文；如果把父 messages 全复制过去，又会把父上下文污染带过去。Claude 的 Fork 在这里做了一个很工程化的妥协：语义上让子代理开始一个新任务，字节上尽量复用父代理已有的 prompt 前缀。


为什么要字节复用？因为 prompt cache 是前缀字节级匹配。父代理跑过一段时间后，system + tools + 项目规则已经形成稳定 cache。子代理如果能构造出相同前缀，就能复用 cache，避免每个子任务重新支付同一段 60K token 的成本。


所以 Fork 不只是“开个子进程”，而是同时满足三件事：


父上下文不被子任务污染。
    子代理能继承必要项目知识。
    API 层仍然命中已有 prompt cache。


### 字段级隔离：不是全共享，也不是全隔离


子代理到底该继承父代理什么？粗暴答案只有两个：全继承，或者全隔离。Claude 的答案更细：按字段语义决定。


| 字段 | 策略 | 原因 |
| --- | --- | --- |
| readFileState | 克隆 | 父代理刚读过的文件，子代理不必重复读。 |
| setAppState | 隔离 | 子代理进度不应该乱改父 UI。 |
| task manager | 共享 | 后台任务必须被全局管理，不能变孤儿。 |
| abort signal | 父可中断子，子不反向污染父 | 父任务取消时子任务要停，但子失败不应拖垮父。 |


这就是成熟 harness 的特征：边界不是按进程粗暴划分，而是按状态语义划分。


### Permission bubbling：子代理可以跑远，授权必须回到用户面前


子代理在后台或远程 worker 里运行时，可能需要执行高风险工具。谁来授权？如果子代理自己授权，用户看不到；如果默认拒绝，很多任务跑不下去。Claude 选择让权限请求 bubble 回父代理，由用户所在的终端做确认。


这个设计定义了一个重要边界：信任跟着用户，不跟着进程。子代理可以在不同上下文里跑，但高风险动作的授权必须回到用户可见的位置。

  本章结论长任务治理不是靠更长 prompt，而是靠外置工作记忆和上下文隔离
TodoWrite 把目标放回模型眼前，Fork 把探索移出主上下文。一个解决注意力漂移，一个解决上下文污染。两者共同让长任务持续推进而不失控。


    CHAPTER · 04

## 上下文首先是经济问题，其次才是信息问题14 min↔ s07 / s10


上下文不是越多越好。放在哪一段、是否可共享、是否会变化，都会决定成本、延迟和 cache 命中。




### 静态前缀一旦被动态内容污染，cache 就失效


一次 agent invocation 中，system prompt、tool descriptions、项目规则、skill catalog 往往占输入的大头。这些内容如果每轮字节稳定，就可以被 prompt cache 复用；如果前面夹了当前时间、会话 ID、随机 token，后面再长的静态内容也会一起 cache miss。


Claude 的原则是：该稳定的内容必须保持字节稳定，该变化的内容必须移出共享前缀。


![System Prompt Overview](/images/claude-code-design-art/system-prompt-overview.svg)

*FIG. 08 · system-prompt-overview.svg — 静态段、动态边界、缓存分层*


SYSTEM_PROMPT_DYNAMIC_BOUNDARY 的作用就是切分静态和动态。边界之前进入可缓存前缀，边界之后每轮变化。一个看似普通的字符串常量，背后是在保护 prompt cache 的字节稳定性。


### CLAUDE.md 为什么不该污染共享 system cache


CLAUDE.md 是项目和用户私有内容。直觉上它像 system 指令，但如果放进 system 段，就会让共享 system cache 按每个用户、每个项目分桶，失去规模效益。Claude 把它包装成 user 段里的 system-reminder，本质是在说：共享缓存区只放真正可共享的内容。


这和工程里的 CDN 类似。公共静态资源可以全网共享缓存；用户私有内容不能放公共缓存层。Prompt 也是一样。


### CLAUDE.md 加载是叠加，不是覆盖


直觉看 CLAUDE.md 应该有 override 链：全局 → 项目根 → 子目录，越具体的覆盖越宽的。错。cc 实际行为是：从 cwd 向上遍历目录树，路径上每一份 CLAUDE.md 全部进 prompt。都进，不替换，按"从外到内"顺序排列。


// 假设你在 packages/api/handlers/ 下启动 cc
// 进入 prompt 的 CLAUDE.md 链：
[ROOT]      project-root/CLAUDE.md             // 整体技术栈 / 团队约定
   ↓
[MID]       packages/api/CLAUDE.md             // API 层公约
   ↓
[LEAF]      packages/api/handlers/CLAUDE.md    // 最具体规则

// packages/web/CLAUDE.md  → 不在路径上 → 不进上下文

  关键反直觉点 ——「没有 override 机制」：三份 CLAUDE.md 都被拼进同一段 prompt，冲突由模型自己权衡，不会出现"叶子覆盖父级"的合并算法。


这有几个推论：


"叶子优先" 是约定，不是机制 —— 越具体越靠下出现在 prompt 里，模型自然给它更高权重（recency bias），但这是 prompt 自然产生的偏好，不是代码强制 override
    规则有 scope 语义靠物理位置承担 —— "API 层规则" 放 packages/api/CLAUDE.md 而不是写在根 CLAUDE.md 加 if 条件。文件系统结构本身表达 scope，模型不需要解析条件
    条件句出现 = 该拆子目录 —— 如果根 CLAUDE.md 写 "如果你在 packages/api 工作要…" 这种条件，证明这条规则属于 packages/api，该下沉到 packages/api/CLAUDE.md。条件句是拆分的信号
    不在 cwd 路径上的 CLAUDE.md 不进 prompt —— 你在 packages/api/ 下启动 cc，packages/web/CLAUDE.md 不会被加载。scope 自动隔离，不会被无关项目的规则污染


大小推荐：根 CLAUDE.md 50-60 行 / 子目录 20-30 行。超过 400 行 + 每天 30 次会话 = 12,000 行重复内容每天往 prompt 灌。不是大文件本身的问题，是"叠加加载"放大了每行成本：根 CLAUDE.md 涨 1 行 = 所有子目录会话都多 1 行；子目录 CLAUDE.md 涨 1 行 = 只影响该子目录会话。


对自建 agent 的启示：项目规则文件采用"沿目录树叠加"而不是"全局单文件 + override"，三个好处：


scope 由文件系统结构表达，不用维护"哪个规则适用哪个目录"的中央索引
    团队成员只需要看自己工作目录到根那一条路径上的规则，不必读整个项目
    不在路径上的规则物理上不会污染当前会话，scope 隔离免费


### Skill 渐进式披露：目录常驻，正文按需


如果把所有 skill 的完整内容都塞进 system prompt，启动就会很重，而且 90% 内容本轮根本用不上。Claude 只把每个 skill 的 name + description 做成 catalog 常驻，让模型知道“有哪些能力”；真正需要某个 skill 时，再加载完整 SKILL.md body 到 messages。


![Skill Overview](/images/claude-code-design-art/skill-overview.svg)

*FIG. 07 · skill-overview.svg — 启动只加载 catalog，激活时才加载完整内容*


这里有一个容易被忽略的写法要求：skill description 是路由器，不是教程。description 只能告诉模型什么时候该加载 skill，不能把执行步骤都总结出来。否则模型会凭 description 自己发挥，反而不读完整 skill body。

  差的 description把流程写进描述`Use when executing plans - dispatches subagent per task with code review.`
模型已经知道大概怎么做，可能跳过 skill body。好的 description只写触发条件`Use when executing implementation plans with independent tasks.`
模型知道何时加载，但必须读正文才知道怎么执行。


### backfill：执行可以改写，历史必须保持字节稳定


模型生成的工具入参可能是相对路径，执行时需要转成绝对路径；hook 也可能修正大小写或补全字段。问题是：这些修正如果写回历史 messages，会改变 prompt 字节，导致 cache miss。


Claude 的做法是同时维护多个 input 版本：


| 版本 | 用途 | 原则 |
| --- | --- | --- |
| callInput | 回填给 API / messages | 尽量保持模型原始字节。 |
| backfilledClone | 给工具执行前规范化 | 路径、默认值可以补全。 |
| processedInput | hook / permission 后实际执行 | 执行世界可以使用修正后的值。 |


这说明上下文经济学不是只发生在 system prompt。连一个工具入参是否回写，都可能影响后续 cache。执行世界可以为了正确性改写，历史世界必须为了 cache 保持稳定。


### CLAUDE.md 的写法标准：删掉不会犯错的，就不该写


项目规则不是越多越好。每一行 CLAUDE.md 都在消耗 token、影响注意力、参与 cache。好的规则应该满足一个标准：删掉这一行，Claude 是否更容易犯错？如果不会，就删。


该写的是 Claude 猜不到的内容：非标 build 命令、特殊测试方式、仓库约定、环境变量、历史踩坑、架构边界。不该写的是空话：写优雅代码、注意异常处理、保持简洁。这些东西模型本来知道，写进去只会浪费上下文。

  本章结论上下文组织的核心是共享边界
system 段放真正可共享且稳定的内容；user/messages 段放项目私有和会变化的内容；skill 正文按需进入；工具入参回填尽量保持原始字节。上下文不是信息仓库，而是一套缓存经济系统。


    CHAPTER · 05

## Compact 不是摘要，而是分层治理18 min↔ s08


上下文爆了，最粗暴的做法是让 LLM 总结。但 Claude 先用 0-API 的确定性方法处理大多数情况，最后才请 LLM 摘要。




### 为什么不能一上来就总结


LLM 摘要有三个问题：贵、慢、会丢信息。一次工具结果只是太大，不代表它需要被语义总结；一段远古对话已经不重要，也不代表要花 LLM 去理解它；旧 tool_result 可能只需要保留“做过这个动作”的壳，不需要保留全部 payload。


Claude 的 Compact 思路是先识别数据生命周期，再选压缩策略。


![Compact Overview](/images/claude-code-design-art/compact-overview.svg)

*FIG. 09 · compact-overview.svg — 按数据生命周期处理上下文压力*


![Compaction Layers](/images/claude-code-design-art/compaction-layers.svg)

*FIG. 10 · compaction-layers.svg — 先便宜确定性处理，最后才 LLM 摘要*


### L1：单条结果太大，先落盘而不是总结


如果一次 grep 或命令输出 500KB，直接放进 messages 会挤爆上下文；直接截断会丢信息；让 LLM 摘要又贵又可能漏细节。L1 budget 的处理是：原文落盘，messages 里只留预览和路径。


![Layer 1 Budget](/images/claude-code-design-art/layer1-budget.svg)

*FIG. 11 · layer1-budget.svg — 大结果落盘，prompt 只保留可恢复占位*


这个方案的关键是可逆。模型如果真的需要完整内容，可以按路径再读；如果不需要，prompt 就不会背着一大坨无用输出继续跑。


### L2：历史太长，裁中间，保头保尾


对话越来越长时，不能平均裁剪，也不能只保尾部。头部保存原始目标和约束，尾部保存当前工作记忆，中间大量已完成过程最适合裁掉。


这符合模型注意力的实际情况：开头有任务锚点，结尾有近期推理，中间往往是处理过的过程噪音。L2 snip 是时间维度的裁剪。


### L3：旧工具结果太重，保壳去载荷


工具结果和普通对话不一样。模型需要知道“我读过这个文件、跑过这个命令”，但不一定需要反复看到完整输出。L3 microcompact 把旧 tool_result 内容替换成占位，保留 tool_use / tool_result 的结构配对。


![Micro Compact](/images/claude-code-design-art/micro-compact.svg)

*FIG. 12 · micro-compact.svg — 保留动作结构，移除旧 payload*


L2 和 L3 的区别非常重要：L2 是沿时间线裁掉远古中间段；L3 是在仍然保留的近期结构里，把旧工具结果的大 payload 拿掉。一个是时间维度，一个是结构维度。


### L5：前面都不够，才用 LLM 摘要


当 L1-L3 都不够时，Claude 才启动 autocompact。它不是简单“把历史总结一下”，而是先保存完整 transcript，再生成摘要替换旧 messages，同时恢复近期关键文件和上下文。


![Auto Compact](/images/claude-code-design-art/auto-compact.svg)

*FIG. 13 · auto-compact.svg — 保存完整 transcript，模型只看工作摘要*


这里是双通道设计：审计和恢复需要完整 transcript；模型继续工作只需要干净摘要。把两者拆开，既不失去可恢复性，也不让模型背负全部历史。


### 顺序不能换：budget 必须先于 micro


Compact 管线不是随便排的。L1 budget 必须在 L3 micro 前面，因为 budget 需要看到完整 tool_result 才能落盘；如果 micro 先把旧结果替换成占位，原文就没了，后面再也无法落盘。


这说明 Compact 不是几个优化技巧，而是一条有依赖关系的管线。先处理可逆的大结果，再裁历史，再保壳去载荷，最后 LLM 摘要。

  本章结论上下文压缩要按数据生命周期设计
大结果落盘，远古过程裁掉，旧工具结果保壳，语义历史最后摘要。每层解决不同失败模式。把所有东西都交给 LLM 总结，是最贵也最不稳定的方案。


    CHAPTER · 06

## Compact 管当前任务，Memory 管下次还会犯的错12 min↔ s09


Compact 解决上下文太长，Memory 解决跨会话遗忘。长期知识不能只靠摘要，它需要可读、可改、可审计。




### 为什么 Memory 不等于 RAG


很多系统一说记忆，就想到 embedding + vector DB。Claude 的 Memory 更像一个 markdown 知识账本：每条 memory 有 name、description、body。索引常驻，内容按需加载。


![Memory Overview](/images/claude-code-design-art/memory-overview.svg)

*FIG. 14 · memory-overview.svg — 索引常驻，内容按需，LLM 选择*


为什么不用 embedding？因为 memory description 不是普通语义文本，而是人为写给 agent 的路由语言。它表达的是"什么时候应该取出这条记忆"，而不只是"这段话和当前问题语义相似"。LLM 直接读 description，能理解路由意图；embedding 会把路由意图压成向量距离，反而丢失功能性。


例子 1：路由说明 vs 事实陈述混在一起。看下面两条 description：


A. "Use when user mentions UI theme"           ← 路由说明（告诉 agent 何时取出这条）
B. "UI theme settings are stored in config.json" ← 事实陈述（描述一个事实）

  这两条 description 字面相似度很高（都讲 UI theme），在 embedding 后会被映射到很接近的向量。但功能完全不同：A 是个 router hint（agent 看到要决定要不要 retrieve），B 是个 fact（agent 看到直接当事实用）。LLM 读原文还能看出哪个是"Use when..."开头的路由说明，哪个是陈述句的事实；embedding 把它们压成几何点之后，这层 metadata 类型差异完全消失。


例子 2：间接关联，没有字面重叠也能命中。用户问：


"the dialog 看起来好亮，看不清字"

  用户没明说"dark mode"、"theme"、"颜色" 任何一个关键词。memory 里有一条：


no-dark-mode.md  description: "user dislikes dark themes, prefers light UI"

  这条该不该被取出？取决于"我们在讨论 UI 主题相关偏好"这个推理 —— dialog 太亮 → UI 主题相关 → 这位用户有过主题偏好 → 取出。LLM 读 description 能完成这个 2-3 步推理：从 "dialog brightness" 跳到 "UI theme preference" 跳到 "用户对 dark theme 的态度"，挑出 no-dark-mode.md。


Embedding 在没有词面重叠时就失手了 —— "dialog 看起来好亮" 和 "dislikes dark themes" 在向量空间里未必近（前者讲亮度感受，后者讲主题偏好，词汇 / 概念都不重叠）。LLM 的多步推理能力跨过了字面相似性的鸿沟，embedding 只能做"几何邻近"。


这就是 cc 主线 7"模型驾驶 harness"的具体落地：能给模型做的事就给模型做，不为它发明替代物。Embedding 是 2020 年 RAG 时代的"我们不相信 LLM 能筛选，所以用几何代劳"的产物；2025 年 LLM 推理能力已经能直接读 catalog 选，不需要这个替代物。


### Markdown 文件的价值：可审计，可修改，可删除


长期记忆最危险的不是记不住，而是记错了还删不掉。Markdown 文件的好处是人可以打开看、可以 code review、可以删、可以按项目目录管理。对企业 agent 来说，这比黑盒向量库更重要。


Claude 的长期记忆不是“把所有历史塞进去”，而是把真正会影响未来行为的知识沉淀成可审计文件。


### Dream 自动整理必须门控


自动总结记忆很诱人，但也很危险。模型可能把一次临时判断写成永久事实，把用户一时偏好写成长期偏好，把错误结论沉淀到记忆里。Claude 的 Dream / memory 写入机制必须有门控、限流和去重。


![Memory Subsystems](/images/claude-code-design-art/memory-subsystems.svg)

*FIG. 15 · memory-subsystems.svg — 提取、整理、写入必须分层*


Memory 的目标不是越多越好，而是只记录下次仍然有用、删掉会导致模型犯错的知识。

  本章结论长期记忆要像账本，不要像垃圾场
Compact 让当前任务跑下去，Memory 让跨会话经验留下来。真正可用的记忆系统必须可审计、可编辑、可删除，并且只把稳定知识写进去。


    CHAPTER · 07

## 错误不是异常，而是 loop 的状态转移12 min↔ s11


Agent 的错误会影响未来上下文。Claude 不把错误当一堆 try/catch，而是判断它是否能进入历史、是否能重试、是否要降级、是否要停止。




### 第一步：失败能不能写进 messages


如果一次 assistant 输出因为 max_tokens 被截断，它可能只说了一半话，甚至半个 JSON、半个工具调用。把这种内容写进 messages，会污染后续上下文，让模型基于半截输出继续推理。


所以错误恢复首先要判断：这次失败是否形成稳定历史。稳定的错误可以反馈给模型，让它换方案；不稳定的半截输出不能作为事实进入历史。


### 第二步：loop 是重试、降级、压缩，还是停止


429、529、prompt_too_long、max_tokens、network abort，不应该都走同一个 catch。每类错误都对应不同状态转移：


| 错误类型 | 状态转移 | 原因 |
| --- | --- | --- |
| 429 限流 | 退避重试 | 当前请求过快，稍后可能恢复。 |
| 529 服务过载 | 抖动重试 / fallback | 服务端暂时不可用，避免所有客户端同时重试。 |
| prompt_too_long | 触发 compact / 裁剪 | 不是模型能力问题，是上下文容量问题。 |
| max_tokens | 不把半截输出当稳定历史 | 输出不完整，不能污染 messages。 |


### 第三步：UI 只呈现稳定状态


Streaming 错误尤其复杂。用户界面可能已经看到部分输出，但系统还不知道这次 turn 最终是否成功。Claude 的处理思路是把“展示给用户的流”和“写入历史的稳定消息”区分开。用户可以看到进度，但历史里只能留下经过确认的稳定状态。


![Error Recovery](/images/claude-code-design-art/error-recovery-overview.svg)

*FIG. 16 · error-recovery-overview.svg — 错误分类后进入不同状态转移*

  本章结论错误恢复的关键是保护未来上下文
普通应用的错误可能只是当前请求失败；agent 的错误会进入下一轮模型输入。Claude 把错误做成 reason code 和状态转移，确保失败不会污染未来。


    CHAPTER · 08

## 多 Agent 协作的本质，是共享状态协议16 min↔ s12 / s15 / s16 / s17 / s18


一句话先讲清楚：多 Agent 协作，难点不是"多开几个模型"，而是"多个模型怎么围绕同一批任务安全协作"。下面 6 个问题串成一条主线，每个问题对应 cc 给的一个机制。




### 先用一个场景理解


假设你让 Claude 做一个大功能：重构登录系统。这个活可以拆成几件事：


1. 改数据库 schema
2. 改登录 API
3. 改前端登录页
4. 写测试
5. 更新文档
6. 最后合并

  如果只有一个 agent，它可以在自己的上下文里列 todo，然后一个个做。但如果你有 3 个 agent：


Lead agent：总负责人
Alice agent：负责后端
Bob agent：负责前端
Charlie agent：负责测试

  这时候问题马上来了：


任务放在哪里？
谁知道 Alice 正在做后端？
Bob 能不能同时改同一个文件？
测试能不能在 API 改完之前开始？
Alice 做完怎么通知 Lead？
某个 agent 空闲了，能不能自己找活？

  所以这章不是在讲"多 Agent 很酷"，而是在讲：


> 多 Agent 一旦出现，就必须有一套共享状态协议。否则多个模型只会互相踩、重复做、丢任务、改冲突。


### 第一步：任务不能只放在模型脑子里


单 Agent 时代，任务可以存在 messages 里：


用户说：帮我重构登录
模型自己记住：我要先改 schema，再改 API，再改前端

  但多 Agent 不行 —— Alice 的 messages，Bob 看不见；Bob 的 messages，Lead 也不一定完整知道。更麻烦的是，如果 Alice 的进程挂了，它脑子里的任务进度也可能丢了。


所以 Claude 的第一步是：把任务从模型上下文里拿出来，落到文件系统。也就是：


.tasks/task_001.json
.tasks/task_002.json
.tasks/task_003.json

  每个任务一个 JSON 文件，里面有：


{
  "id": "task_001",
  "subject": "改登录 API",
  "description": "...",
  "status": "pending",
  "owner": null,
  "blockedBy": ["task_000"]
}

  这一步的意义非常大：


> 模型不再是任务唯一持有人。文件系统才是任务事实来源。


所以 Lead、Alice、Bob、人类、外部脚本都可以读 .tasks/，知道当前有哪些任务、谁在做、做完没有。.tasks/ 是共享状态所在的位置，任何 agent、人类或外部脚本都能读。


![Task System](/images/claude-code-design-art/task-system-overview.svg)

*FIG. 17 · task-system-overview.svg — 任务落到 .tasks/ 目录变成共享状态*


任务层一句话：任务层解决的是 —— 大家到底在围绕哪一批任务协作。


### 第二步：任务之间有依赖，不能平铺


如果任务只是这样：


- 改 schema
- 改 API
- 写测试
- 部署

  看起来都一样，但真实情况不是。测试必须等 API 完成。部署必须等测试完成。文档可能只要 schema 完成就能写。所以 Claude 给任务加了一个字段：


"blockedBy": ["task_schema"]

  意思是：当前任务被哪些任务阻塞。只有 blockedBy 里的任务都完成了，这个任务才能开始。比如：


schema 完成后：
  API 可以开始
  docs 也可以开始

API 完成后：
  tests 可以开始

tests + docs 都完成后：
  deploy 可以开始

  这一步的关键是：


> 调度不再靠 LLM 猜"现在该做什么"，而是靠数据结构判断"哪些任务已经可以开始"。


blockedBy 是任务 ID 数组，can_start = all(blockedBy 全部 completed)，这让"找下一个可做任务"变成纯查询。


![Task DAG](/images/claude-code-design-art/task-dag.svg)

*FIG. 18 · task-dag.svg — blockedBy 把任务关系画成 DAG*


依赖层一句话：依赖层解决的是 —— 哪些任务现在能做，哪些任务必须等别人做完。


### 第三步：多个 agent 抢同一个任务怎么办？


现在 .tasks/ 里有 10 个 pending 任务。Alice 空闲了，Bob 也空闲了。它们同时扫描任务列表，都看到：


task_42：pending，可以开始

  如果没有机制，两个 agent 可能同时开始做 task_42。这就叫 race condition（竞争条件）。所以需要 claim_task。claim 就是"认领"。它的意思是：


> 我先把这个任务占住，别人不要动。


认领成功后，任务文件会变成：


{
  "id": "task_42",
  "status": "in_progress",
  "owner": "alice"
}

  这样 Bob 再来看，就知道这个任务已经被 Alice 认领了。


关键点是：claim 不能只是 prompt 里说一句"我要做这个"。它必须是一个原子操作。claim_task 的 5 步：抢文件锁、持锁重读最新状态、检查 status、写入 in_progress + owner、释放锁。


这一步很重要，因为它防的是这个时间差：


Alice 看到 task_42 是 pending
Bob 也看到 task_42 是 pending
Alice 准备写 owner
Bob 也准备写 owner

  如果没有锁，就可能互相覆盖。所以认领层本质上是：


> 用文件锁 + owner 字段，把"谁正在做"变成可验证状态。


认领层一句话：认领层解决的是 —— 同一个任务只能被一个 agent 做。


### 第四步：agent 之间怎么说话？


任务认领以后，Alice 做后端，Bob 做前端，它们还需要通信。比如：


Lead 问 Alice：后端完成了吗？
Alice 回复 Lead：API 已经改完，测试还没跑。
Bob 问 Alice：登录接口字段改成什么了？
Lead 通知 Bob：先别动这个文件。
Lead 请求 Charlie：可以开始测试了。
Lead 要求某个 teammate shutdown。

  这时候不能只靠模型上下文互相知道，因为它们是不同 agent。Claude 的做法是：每个 agent 有一个 inbox 文件。可以理解成：


.mailboxes/alice.jsonl
.mailboxes/bob.jsonl
.mailboxes/charlie.jsonl

  Lead 给 Alice 发消息，就是往 Alice 的 inbox 里 append 一行 JSON。Alice 定期检查自己的 inbox，看有没有新消息。物理实现是文件系统，每个 teammate 一个 jsonl 文件，Lead 发消息就是 append 到 alice.jsonl，Alice 收消息就是 tail alice.jsonl，不需要额外 message broker。


![Agent Teams](/images/claude-code-design-art/agent-teams-overview.svg)

*FIG. 19 · agent-teams-overview.svg — inbox 文件直写，proper-lockfile 保证一致性*


但注意：这不是普通聊天记录，而是 typed message（带类型的消息）。每条消息有类型：


{
  "type": "shutdown_request",
  "request_id": "abc123",
  "from": "lead",
  "to": "alice"
}

  为什么要有 type？因为不同消息要触发不同动作：


task_assignment：分配任务
status_update：更新进度
approval_request：请求批准
shutdown_request：要求退出
shutdown_response：退出响应


![Team Protocols](/images/claude-code-design-art/team-protocols-overview.svg)

*FIG. 20 · team-protocols-overview.svg — request_id 关联请求和响应，typed message 触发对应 handler*

  读懂 FIG. 20：请求—响应协议

  这张图不是在讲 "多 Agent 全部怎么协作"，而是在讲多 Agent 协作里的一个更具体问题：


> Lead 给队友发了一个需要回复的请求，怎么保证后面收到的回复能和原请求对上？


也就是：请求—响应协议（request-response）。你可以把它理解成多 Agent 通信层里的 "带回执消息"。

  先看这张图想解决什么问题


普通消息很简单：


Lead → Alice：你去改登录页

  这种消息发出去就行，不一定需要严格回执。但有些消息不一样，它必须有明确结果：


Lead → Alice：你现在可以 shutdown 吗？
Alice → Lead：可以 / 不可以

Lead → Alice：这个 plan 你同意吗？
Alice → Lead：同意 / 拒绝

  这种消息的问题是：Lead 发出去一个请求之后，不能只等一句 "可以"。它必须知道：这句 "可以" 到底是在回复哪一个请求。因为 Lead 可能同时发了很多请求：


request_001：问 Alice 能不能 shutdown
request_002：问 Bob 是否 approve plan
request_003：问 Charlie 是否完成测试

  如果后面收到一个 approved，没有 request_id，Lead 根本不知道这是哪个请求的回复。所以这张图的核心就是：


> 多 Agent 之间凡是需要回复的消息，都要带 request_id，并且在 Lead 本地维护一个 pending_requests 表。

  这张图从上到下看


第一层：顶部是原来的 agent loop，基本没变。图最上面这一行：


turn → messages → prompt → LLM → TOOL DISPATCH

  意思是：主循环还是老样子。模型看到上下文之后，决定调用工具。只是到了 s16，新加了一些团队协作相关工具：


request_shutdown
request_plan
review_plan

  这些工具的作用不是直接改代码，而是发起一个需要别人回复的协议。比如模型调用 request_shutdown("alice")，意思就是 Lead 想问 Alice：你现在能不能退出？


这一步很重要：协议不是写死在主循环里，而是作为工具挂进 TOOL DISPATCH。所以主循环不需要知道 shutdown 协议、plan approval 协议的细节。它只知道：模型调了一个工具，工具去处理。


第二层：中间紫色大框，是完整的请求—响应流程。这部分是图的核心，分成 4 步。

  ① Lead 发请求


图里写的是：


BUS.send("shutdown_request", metadata={request_id})

  意思是：Lead 往队友的 inbox 里发一条消息。这条消息不是普通文本，而是结构化消息：


{
  "type": "shutdown_request",
  "request_id": "req_123",
  "from": "lead",
  "to": "alice"
}

  这里最关键的是 request_id。它相当于快递单号：没有快递单号，你收到一个包裹不知道对应哪一单；没有 request_id，你收到一个回复不知道对应哪个请求。

  ② 队友收到请求


图里写：


dispatch_by_type(inbox)
→ handler(type, metadata)

  意思是：Alice 检查自己的 inbox，看到一条消息：


{
  "type": "shutdown_request",
  "request_id": "req_123"
}

  然后它不是让 LLM 随便猜这是什么，而是先按 type 分发：


shutdown_request → shutdown_handler
plan_approval_request → plan_handler
permission_request → permission_handler

  这一步的意义是：消息类型决定处理逻辑，不靠自然语言猜。这也是为什么它叫 typed message。

  ③ 队友回复


Alice 处理完之后，会发回一条响应：


BUS.send("shutdown_response", 同 request_id + approve)

  结构大概是：


{
  "type": "shutdown_response",
  "request_id": "req_123",
  "approve": true,
  "from": "alice",
  "to": "lead"
}

  注意：响应里必须带同一个 request_id。这样 Lead 才知道：这条 shutdown_response 是在回复 req_123，不是回复别的请求。

  ④ Lead 收响应


图里写：


match_response(request_id)
→ resolve/reject callback

  Lead 收到响应后，会拿 request_id 去查自己的 pending_requests。比如 Lead 本地有一张表：


{
  "req_123": {
    "type": "shutdown_request",
    "sender": "alice",
    "status": "pending",
    "created_at": "..."
  }
}

  现在收到：


{
  "request_id": "req_123",
  "approve": true
}

  于是 Lead 找到原来的 pending 请求，把它从 pending 推进到 approved。如果 Alice 拒绝，就推进到 rejected。这就是图左下角的状态机。

  左下角：状态机是什么意思？


图里有一个小状态机：


pending → approved
pending → rejected

  它表达的是：任何需要对方表态的请求，刚发出去都是 pending。对方同意，就变 approved。对方拒绝，就变 rejected。


这里的关键不是状态很多，而是状态非常少。Claude 没有给 shutdown 写一套状态机，又给 plan approval 写一套状态机。它抽象出了一套通用模型：


> 凡是 "请求别人批准" 的协议，本质都是：pending → approved / rejected


所以 shutdown 和 plan approval 可以复用同一套机制。

  右下角：pending_requests 是干什么的？


右下角写：


pending_requests: dict[str, ProtocolState]
request_id → {type, sender, status, created_at}
match_response: 按 request_id 找回对应请求

  这就是 Lead 的 "未完成请求表"。为什么要有这张表？因为请求发出去以后，不一定马上回来。中间可能发生：


Alice 还在工作
Bob 先回了另一个请求
Alice 拒绝了
Alice 超时没回
Lead 收到了多个 response

  如果没有 pending_requests，Lead 没法管理这些未完成请求。所以 pending_requests 解决三个问题：


对应关系 —— 这个 response 是回复哪个 request？靠 request_id 查
    当前状态 —— 这个请求现在是 pending、approved，还是 rejected？靠 status 记录
    超时和清理 —— 这个请求发出去太久没人回，要不要超时？靠 created_at 判断


所以 pending_requests 不是多余字段，它是请求协议的核心状态表。

  底部：为什么两种协议可以共用一套机制？


图底部写：


shutdown_request 和 plan_approval_request
共用 pending → approved/rejected 状态机

  虽然业务不同：


shutdown_request：问队友能不能退出
plan_approval_request：问队友是否批准计划

  但协议结构一样：


Lead 发请求
队友收到
队友回复 approve/reject
Lead 根据 request_id 匹配响应
状态从 pending 变 approved/rejected

  所以不需要为每种业务单独写一套协议。抽象之后变成：


新增协议类型 = 新的 msg_type
不需要新增状态机

  这就是这张图想表达的 "设计味道"。它不是在炫耀有多少协议，而是在说：


> 不同业务消息，只要都是 "请求—响应" 模式，就应该复用同一个 request_id + pending_requests + 状态机骨架。

  用一个完整例子串起来


假设 Lead 想关闭 Alice。


第一步：Lead 调工具。LLM 决定调用 request_shutdown("alice")。工具生成一个请求 ID req_123，然后写入 Alice 的 inbox：


{
  "type": "shutdown_request",
  "request_id": "req_123",
  "from": "lead",
  "to": "alice"
}

  同时 Lead 本地登记：


{
  "req_123": {
    "type": "shutdown_request",
    "sender": "alice",
    "status": "pending",
    "created_at": "..."
  }
}

  第二步：Alice 检查 inbox。Alice 看到 type: shutdown_request, request_id: req_123。它按 type 分发到 shutdown handler。Alice 判断自己现在可以退出，于是回复：


{
  "type": "shutdown_response",
  "request_id": "req_123",
  "approve": true
}

  第三步：Lead 收到回复。Lead 用 req_123 查 pending_requests，找到 "req_123 原来是 shutdown_request，状态 pending"，然后更新成 approved。接着执行 callback：允许 Alice shutdown。整个协议结束。

  这张图和 "多 Agent 协作" 的关系


前面 6 个问题里，这张图属于通信层。而且它不是通信层的全部，它讲的是通信层里最重要的一类消息：需要对方回复的消息。


普通通知可以 fire-and-forget（发完不管）：


Lead → Alice：你已经被分配到 task_42

  但请求类消息必须有协议：


Lead → Alice：你是否同意 shutdown？
Alice → Lead：同意 / 拒绝

  这就是 request-response。

  这张图的核心价值


它解决的是一个很工程的问题：


> 多 Agent 之间不能只靠自然语言聊天。只靠聊天，消息会乱、响应会对不上、状态会丢。必须把通信做成有类型、有 ID、有状态机的协议。


所以这张图最核心的三件事是：


type：这是什么消息？
    request_id：这是在回复哪个请求？
    pending_requests：这个请求当前处于什么状态？


只要抓住这三个，就读懂了。


    一句话总结这张图

Lead 和 teammate 之间，凡是需要对方表态的消息，都不能当普通聊天处理，而要做成 request_id 关联的请求—响应协议；Lead 用 pending_requests 保存未完成请求，用同一套 pending → approved/rejected 状态机处理 shutdown、plan approval 等不同业务。


再白话一点：多 Agent 不是互相发消息就行，而是要保证 "我问的每一个问题，都能找到对应的回答"。




通信层一句话：通信层解决的是 —— agent 之间如何通过可追踪、可分发的消息协作。


### 第五步：为什么还需要 WORK / IDLE / SHUTDOWN 三态？


你可以把每个 teammate 想成一个小 worker。它不能永远跑，也不能永远等。所以它有三种状态：


WORK：正在干活
IDLE：暂时没活，但还活着
SHUTDOWN：退出

  WORK 阶段执行内层循环；IDLE 阶段每 5 秒检查 inbox 和未认领任务；60 秒没事就主动 SHUTDOWN，避免空闲 agent 一直占资源。


![Autonomous Agents](/images/claude-code-design-art/autonomous-agents-overview.svg)

*FIG. 21 · autonomous-agents-overview.svg — WORK / IDLE / SHUTDOWN 三态循环*


为什么要这么设计？因为多 Agent 最怕两种极端：


第一种，太被动：


agent 干完一个任务就傻等。
Lead 不分配，它永远不会找下一个任务。

  第二种，太主动：


agent 到处找事干，一直扫任务、一直调用模型、一直烧 token。

  Claude 的设计是在中间：


可以主动找活，
但只能在 IDLE 状态找；
只能找 can_start 的任务；
找到了必须 claim；
轮询有间隔；
空闲太久自动退出。

  这句话很关键：


> 主动性不是无限自由，而是受约束的自由。


主动性层一句话：主动性层解决的是 —— agent 能自己找活，但不能失控地乱跑。


### 第六步：多个 agent 改代码，怎么不互相覆盖？


前面解决了任务、认领、通信，但还有一个大问题：代码。假设 Alice 和 Bob 都在同一个 repo 里改文件：


Alice 改 src/auth.ts
Bob 也改 src/auth.ts

  如果它们共用同一个工作目录，就很容易互相覆盖。你不能只在 prompt 里写：


请不要和别人冲突。

  这个没用。因为文件系统层面，它们看到的是同一个 working copy。一个 agent 写文件，另一个 agent 可能马上被影响。


所以 Claude 用 Git worktree。每个 agent 一个独立工作目录：


.worktrees/auth/     给 Alice
.worktrees/ui/       给 Bob

  每个 worktree 对应独立 branch：


wt/auth-refactor
wt/ui-login

  这样 Alice 在自己的目录里改，Bob 在自己的目录里改，互不干扰。靠 prompt 说"别冲突"不行，worktree 是物理隔离；每个 agent 一个独立工作目录和独立 branch。


![Worktree Isolation](/images/claude-code-design-art/worktree-overview.svg)

*FIG. 22 · worktree-overview.svg — 每个 agent 一个 worktree，独立分支，物理隔离*


这个点非常重要：


> worktree 不是提醒模型别冲突，而是让冲突在物理结构上不容易发生。


隔离层一句话：隔离层解决的是 —— 多个 agent 同时改代码时，不能共享同一个脏工作区。


### 澄清：多 Agent 不等于一定开 worktree


这里要澄清一个常见误解。你日常看到的 "Claude 多 agent"，很多情况下并不是 worktree 模式。要分清楚三层东西：


1. subagent / Task 工具
   = 派一个子代理去思考、搜索、读代码、总结、规划

2. agent team / teammate
   = 多个 agent 通过 inbox / message bus 协作

3. worktree isolation
   = 给某个 agent 单独开一个 git worktree，让它在独立目录里改代码

  多 agent 不等于一定开 worktree。worktree 只在 "需要并行改代码、避免互相污染工作区" 时才有意义。

  1. 很多 subagent 默认只是"上下文隔离"，不是"文件系统隔离"


你让 Claude 派 subagent 时，常见情况是：


主 agent：你去研究一下这个模块
子 agent：读代码、grep、总结，然后把结果返回

  这个子 agent 可能只是拥有一份独立上下文，最后返回摘要。它未必拥有独立工作目录。它解决的是：不污染主 agent 的上下文。不是解决：多个 agent 同时改文件会不会冲突。所以你看不到每个 agent 一个 worktree，很正常。

  2. worktree 主要服务"并行写代码"，不是服务"并行思考"


worktree 的价值是文件隔离。比如：


Alice agent 改登录 API
Bob agent 改前端登录页
Charlie agent 改测试

  如果三个人都在同一个 repo 工作目录里改文件，就会互相污染。这时候才需要：


.worktrees/alice-auth/
.worktrees/bob-ui/
.worktrees/charlie-test/

  但如果 agent 只是读代码 / 分析问题 / 写计划 / 总结方案 / 做 code review / 搜索资料，它不一定需要 worktree。所以你没看到 worktree，通常说明当前多 agent 用法还停留在 "上下文隔离 / 任务委派"，没有进入 "并行写代码 / 物理隔离"。

  3. 官方上 worktree 是可选隔离能力，不是所有 subagent 自动开启


Claude Code 官方文档里，subagent 有一个可选配置叫 isolation。设置为 worktree 时，才会让 subagent 在临时 git worktree 里运行 —— 给它一个隔离的仓库副本；如果 subagent 没改动，worktree 还会自动清理（官方文档）。


官方 worktree 文档也把 worktree 说成 "并行运行 Claude 的几种方式之一"：worktree 负责隔离文件编辑，subagents / agent teams 负责协调工作。它还特别说，Desktop app 会为每个新 session 自动创建 worktree，但 CLI / subagent 场景通常要按方式启用或配置（官方文档）。


所以不是：


用了多 agent → 必然每个 agent 一个 worktree

  而是：


用了 worktree isolation 的多 agent → 每个相关 agent 才会有独立 worktree

  4. "每个 agent 一个 worktree" 说的是写代码协作场景

  前面 "第六步" 那个 worktree 例子（Alice / Bob 各自一个 worktree）描述的是理想的写代码协作层。更准确的说法应该是：


> 当多个 agent 需要并行修改同一个仓库时，应该给每个写代码的 agent 分配独立 worktree。


而不是无条件说 "每个 agent 一个 worktree"。因为有些 agent 根本不写代码：


planner agent：拆任务
reviewer agent：审方案
research agent：查资料
qa agent：读测试结果
summarizer agent：汇总

  这些 agent 不需要 worktree。真正需要 worktree 的是会对 repo 文件产生写操作的 agent，尤其是多个写 agent 并行时。

  5. 为什么 Claude 不默认给所有 agent 都开 worktree？


因为 worktree 有成本和复杂度：


1. 要创建目录和 branch
2. 要处理依赖安装、环境变量、缓存
3. 要处理未提交改动
4. 要处理合并和冲突
5. 要清理临时目录
6. 要记录哪个任务绑定哪个 worktree

  如果一个子 agent 只是读文件、搜代码、总结方案，给它开 worktree 就是浪费。


更重要的是，worktree 不是免费抽象。它会引入后续问题：


改完怎么 merge？
冲突谁处理？
测试在哪个 worktree 跑？
依赖装在哪个目录？
.env 文件复制不复制？
任务完成后保留还是删除？

  所以 Claude 不会把它作为所有 agent 的默认行为，而是作为 "需要文件隔离时启用" 的能力。

  6. 怎么判断当前 Claude 有没有用 worktree？


看几个信号：


1. 目录下有没有 .worktrees/ 或类似 worktree 目录
2. git worktree list 有没有新增 worktree
3. 当前分支有没有出现 wt/... 或临时 branch
4. subagent 配置里有没有 isolation: worktree
5. 是否是 Desktop 新 session 自动 worktree 场景
6. 是否显式用了 --worktree 或相关工作流

  如果这些都没有，那你看到的多 agent 大概率只是 多上下文 / 多任务 / 多线程式协作，不是 worktree 隔离式并行开发。


    一句话回答 "我为什么没看到每个 agent 一个 worktree"

因为 多 agent 和 worktree 是两件事。多 agent 解决的是 任务怎么拆、谁来做、怎么通信、怎么回收结果；worktree 解决的是 多个写代码的 agent 怎么不共享同一个脏工作区。


所以只有当 agent 被配置成 isolation: worktree，或者进入需要并行改代码的 worktree workflow 时，才会看到每个相关 agent 有独立 worktree；普通 subagent / teammate 不一定会有。




### 追问：那 sub agent 之间到底会不会冲突？


会。sub agent 也会冲突。但关键区别是：


> sub agent 默认解决的是 "上下文隔离"，不一定解决 "文件系统隔离"。


也就是说，sub agent 可能有自己的对话上下文、自己的任务说明、自己的推理过程，但如果它和主 agent / 其他 sub agent 操作的是同一个工作目录，那它们写文件时仍然可能冲突。

  1. 什么情况下不会冲突？


如果 sub agent 只做这些事：


读代码
搜索文件
分析模块
总结方案
做 code review
返回建议

  它基本不会造成文件冲突，因为它不写文件。比如：


主 agent：你去分析一下 auth 模块的问题
sub agent：读代码、grep、总结，最后返回 "auth.ts 里 token 校验有问题"
主 agent：收到后自己决定怎么改

  这种模式里，sub agent 更像 "研究员"，不是 "执行者"。

  2. 什么情况下会冲突？


如果 sub agent 有写工具，比如 Edit / Write / Bash / safe_write / safe_edit，并且它和其他 agent 共享同一个 repo 工作区，那就可能冲突。典型情况：


主 agent 正在改 src/auth.ts
sub agent 也在改 src/auth.ts

或者：

Alice sub agent 改 src/api/login.ts
Bob sub agent 也改 src/api/login.ts

  这时候就会出现三类问题。


第一类：直接覆盖


Alice 先读 auth.ts
Bob 后读 auth.ts
Alice 写入版本 A
Bob 基于旧内容写入版本 B
结果 Alice 的修改被 Bob 覆盖

  第二类：脏读 / 旧读


Alice 改完文件但还没告诉 Bob
Bob 读到的是旧版本
Bob 基于旧版本继续改
最后生成的结果和 Alice 的改动不兼容

  第三类：命令副作用冲突


Alice 正在跑 npm install
Bob 正在删 node_modules 或切分支
Charlie 正在跑测试并生成覆盖文件

  这些都不是 "模型聪不聪明" 的问题，而是共享工作目录天然会有并发写冲突。

  3. 所以 sub agent 的隔离分两种


| 隔离类型 | 解决什么 | 是否防文件冲突 |
| --- | --- | --- |
| 上下文隔离 | 子任务不污染主对话 | 不一定 |
| worktree / 目录隔离 | 子任务在独立工作区改文件 | 可以大幅减少 |


普通 sub agent 往往只是 独立上下文，但不一定是 独立文件系统。所以它能避免 "主上下文被子任务污染"，但不能天然避免 "同一个文件被多个 agent 改乱"。

  4. worktree 能不能彻底消除冲突？


也不能说彻底消除，只是把冲突从 "工作区互相覆盖" 变成 "最后合并时处理"。有 worktree 后：


Alice 在 .worktrees/auth/ 改
Bob 在 .worktrees/ui/ 改

  它们不会直接覆盖彼此的 working copy。但如果最后它们都改了同一个文件，合并时还是可能出现 Git conflict。区别是：


没有 worktree：
冲突发生在修改过程中，可能互相覆盖，过程不可控。

有 worktree：
冲突发生在 merge 阶段，可以 review、diff、解决。

  所以 worktree 不是让冲突消失，而是让冲突延后到可管理的位置。

  5. 正确的 sub agent 使用方式 —— 三种模式


模式一：sub agent 只读，主 agent 统一写。这是最安全的：


sub agent A：分析后端
sub agent B：分析前端
sub agent C：分析测试

它们都只返回建议。
最后由主 agent 统一改文件。

  优点是不会并发写乱。


模式二：给每个写代码 sub agent 明确文件边界：


Alice 只能改 src/api/**
Bob 只能改 src/components/**
Charlie 只能改 tests/**

  这种可以减少冲突，但不如 worktree 彻底。


模式三：写代码 sub agent 使用 worktree。适合真正并行开发：


Alice 一个 worktree
Bob 一个 worktree
Charlie 一个 worktree

  最后统一 review 和 merge。

  6. 一句话总结：sub agent 也会冲突


    关键认知

sub agent 隔离的是上下文，不必然隔离文件系统。只要多个 agent 能写同一个工作区，就可能出现 并发写、覆盖、旧读、命令副作用 等冲突。


所以多 Agent 协作不是 "多开几个 sub agent" 就完了。真正要补的是 任务认领、写入边界、消息协议和 worktree 隔离。否则 sub agent 越多，系统越容易乱。




### 把整章串起来


现在你再看这章，就不是一堆概念了。它其实是一个连续问题链：


多 Agent 协作要先回答 6 个问题：

1. 任务在哪里？
   → .tasks/task_xxx.json

2. 哪些任务能开始？
   → blockedBy 依赖图

3. 谁正在做？
   → claim_task + owner 字段

4. agent 之间怎么通信？
   → inbox 文件 + typed message

5. agent 空闲后怎么办？
   → WORK / IDLE / SHUTDOWN 生命周期

6. 多个 agent 怎么不互相改乱代码？
   → 每个 agent 一个 git worktree

  所以这章的真正标题可以翻译成一句大白话：


> 多 Agent 不是多开几个模型，而是给多个模型一套共享任务、认领、通信和隔离协议。


### 为什么这章和 Claude 的"设计艺术"有关？


因为 Claude 没有把这些问题交给 prompt。它不是说：


请 Alice 和 Bob 注意协作。
请不要重复做任务。
请不要互相覆盖代码。
请记得通知 Lead。

  它是把这些约束落到了工程结构里：


任务 → 文件
依赖 → blockedBy
认领 → 文件锁 + owner
通信 → inbox jsonl
生命周期 → WORK / IDLE / SHUTDOWN
代码隔离 → worktree

  这就是这章最重要的设计思想：


> 多 Agent 协作先是状态工程，再是模型工程。


结论也很清楚：任务文件化解决可见性，DAG 解决依赖，claim 解决所有权，inbox 解决通信，worktree 解决代码隔离；没有这些协议，多开模型只会制造更多混乱。


    读这章时抓住这一条主线
    不要先记名词，先记这条线

不要先记 Task System / DAG / claim_task / MessageBus / typed message / WORK / IDLE / SHUTDOWN / worktree 这一堆名词。先记这条线：


任务要可见，
依赖要可算，
所有权要可抢占，
通信要可追踪，
主动性要可控，
代码修改要物理隔离。
    这条线顺了，所有名词就都有位置了。




    CHAPTER · 09

## 什么时候值得把机制组合成 Loop8 min


Loop 不是让 agent 一直跑。Loop 是在目标明确、反馈可验证、风险可控的场景里，把工具、权限、任务、错误恢复组合成持续执行系统。




![What a loop actually does — Discover Plan Execute Verify Iterate](/images/claude-code-design-art/loop-steps.png)

*loop 的最小步骤：Discover → Plan → Execute → Verify → Iterate；State file 让每一轮进展不随进程重启而丢失　·　图：Codila*


### 适合 Loop 的任务有三个条件


目标明确：例如巡检某类错误、处理固定格式任务、推进已定义 backlog。
    反馈可验证：例如测试通过、lint 清零、任务状态变更、数据指标变化。
    风险可控：失败不会直接破坏生产数据，高风险动作有权限闸口。


![The Karpathy Loop — 提出 训练 评估 保留或回滚](/images/claude-code-design-art/karpathy-loop.png)

*一个真实的 Loop：提出变更 → 训练 → 评估 → 保留好的 / 回滚坏的；三个条件都成立时，自动跑 700 次实验，找出 20 处连作者都忽略的改进　·　图：Codila*


### 不适合 Loop 的任务也很明确


目标模糊、判断高风险、结果难验证的任务不该自动 loop。例如自动改生产配置、自动给业务结论、自动处理敏感用户数据。这里不是模型能力问题，而是系统责任边界问题。


### Loop 的刹车来自前面所有机制


Permission 管危险动作，Compact 管上下文膨胀，Error Recovery 管失败状态，Task 协议管共享进度，Memory 管长期经验。没有这些机制，Loop 只是“while true 调模型”；有这些机制，Loop 才是可治理的持续系统。


    CHAPTER · 10

## 晓智要追的不是功能表，而是治理能力10 min


Claude Code 的差距不在某一个工具，而在整套 harness 是否能控制成本、边界、上下文、错误和协作状态。




### P0：先让系统可控


P0 不是为了省一点钱，而是为了让系统有基本工程边界。


开启和保护 cache 稳定：动态字段不能污染 system prompt；历史注入要保持字节稳定。
    建立权限优先级：组织 / 项目 settings deny 必须高于用户 hook allow。
    错误 reason code 化：失败要能复盘，不能只是一堆 catch 和 toast。


### P1：补上下文治理


晓智现在长会话主要靠硬截断和重启注入历史。下一步要做的是确定性 compact：大 tool_result 落盘，历史保头保尾，旧工具结果保壳去载荷。先做 0-API 的 L1-L3，不要一上来就用 LLM 总结。


### P2：再上长期 Memory 和多 Agent


Memory 要先做成可审计 markdown 账本，不要一上来做黑盒向量库。多 Agent 要先有任务文件、claim 协议、消息协议和 worktree 隔离，再谈自动认领和持续 loop。


![System Architecture](/images/claude-code-design-art/system-architecture.svg)

*FIG. 23 · system-architecture.svg — 全链路能力最后应落到清晰架构边界*


    CHAPTER · 11

## 最后回到六个工程问题5 min


Claude Code 的设计艺术，可以压成六个问题。每个问题都对应一个不让复杂性进入主循环的机制。




| 工程问题 | Claude 的回答 | 设计含义 |
| --- | --- | --- |
| 能力怎么扩展？ | 工具注册 + 执行管线 | 能力扩展不改主循环。 |
| 扩展怎么不越权？ | Hook + Permission 信任顺序 | 开放生命周期，但边界更高优先级。 |
| 长任务怎么不跑偏？ | TodoWrite + Fork | 外置工作记忆，隔离子任务探索。 |
| 上下文怎么不爆？ | Cache 边界 + Compact 分层 | 先保护静态前缀，再按生命周期压缩。 |
| 经验怎么留下？ | Markdown Memory | 长期知识可审计、可删除、可按需加载。 |
| 多个 agent 怎么协作？ | Task 文件 + Message 协议 + Worktree | 共享状态落到文件系统，执行隔离落到工作树。 |

  最终结论模型是驾驶者，harness 是载具
Claude Code 不替模型做所有判断，也不把所有规则塞进 prompt。它做的是给模型一辆可靠的车：有方向盘、有仪表盘、有刹车、有油耗管理、有维修记录、有协作车道。复杂的是 harness，不该是模型脑袋。

The art is not in making the loop smarter. The art is in keeping the loop small.
复杂性不进入主循环，而是落在可治理的工程边界上。
Claude Code Design Art · final v3 · assets preserved