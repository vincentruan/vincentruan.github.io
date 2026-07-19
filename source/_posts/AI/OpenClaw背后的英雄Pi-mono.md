---
title: "OpenClaw背后的英雄Pi-mono"
date: 2026-02-26 00:00:00
categories: AI
tags:
- Pi-mono
- AI编程助手
- 极简主义
- 工具设计
- 上下文工程
- 开源项目
- 编程工具
- OpenClaw
- 实践体悟
description: "本文介绍极简AI编程助手pi-mono的设计哲学。作者厌倦了Claude Code变成功能过剩的宇宙飞船，决定构建只有四个工具（read、write、edit、bash）的编程助手。文章阐述了极简主义设计如何通过精确控制上下文产生更好的输出，以及在Terminal-Bench基准测试中击败竞品的实践经验。"
---

最近看到一个 Agent 框架项目，它是 openClaw 背后的英雄，还在 Terminal-Bench 基准测试中击败了一众功能丰富的竞品。作者 Zechner Mario Zechner 厌倦了 Claude Code 变成 "80% 功能都用不上的宇宙飞船"，决定自己写个 AI 编程助手。他的想法很简单：如果我不需要这个功能，就不会构建它。

<!-- more -->

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/654bd6ec68c7b89f628c3b175c9aa2506df77701.png)

结果就是 pi-mono，一个极简到只剩四个工具的编程助手。

## 从复制粘贴到极简主义

Zechner 的开发历程很典型。过去三年里，他从复制粘贴代码到 ChatGPT，到 Copilot 自动补全（他说从来没用好过），再到 Cursor，最后是 2025 年成为日常工具的编程助手们：Claude Code、Codex、Amp、Droid、opencode。

他最初偏爱 Claude Code，因为早期版本很基础，符合他 "喜欢简单可预测工具" 的性格。但几个月来，Claude Code 变得越来越复杂，系统提示词和工具定义每次更新都会变，破坏他的工作流程。更要命的是，界面还会闪烁。

作为构建过 Sitegeist 等多个 agent 项目的开发者，Zechner 深知上下文工程的重要性。精确控制模型上下文能产生更好的输出，特别是写代码时。但现有工具都会在背后注入一些你看不到的内容，让这变得极其困难。

## 四个工具的哲学

pi-mono 只保留四个工具：

```sh

read   # 读取文件内容，支持文本和图片，可指定行范围
write  # 创建新文件或完全重写，自动创建目录
edit   # 精确替换文本，oldText 必须完全匹配
bash   # 执行命令，返回 stdout 和 stderr，可设置超时

```

Zechner 的逻辑很直接：编程的本质就是读代码、写代码、改代码、跑代码。这四个工具组合起来能覆盖大部分编程场景。

想分析项目架构？AI 会 read 几个核心文件。要修复 bug？它会定位问题，用 edit 改特定行，然后 bash 跑测试验证。需要重构？它会理解现有逻辑，write 新的实现，保证功能不变。

## 四层技术架构

他从头构建了完整的技术栈：

```
┌─────────────────────────────────────┐
│        pi-coding-agent              │  ← CLI 工具层
│    (会话管理、主题、上下文文件)         │
├─────────────────────────────────────┤
│           pi-tui                    │  ← 终端 UI 层
│     (差分渲染、组件系统)               │
├─────────────────────────────────────┤
│        pi-agent-core                │  ← Agent 逻辑层
│    (工具执行、事件流、验证)             │
├─────────────────────────────────────┤
│           pi-ai                     │  ← LLM 抽象层
│  (多提供商 API、上下文切换、成本跟踪)    │
└─────────────────────────────────────┘

```

**pi-ai** 是统一的 LLM API，支持 Anthropic、OpenAI、Google、xAI、Groq、Cerebras、OpenRouter 等十几家提供商。处理不同提供商的 API 差异是个大工程：

```python

// 提供商差异示例
const providerQuirks = {
  cerebras: { disallowedFields: ['store'] },
  mistral: { 
    tokenField: 'max_tokens',  // 而不是 max_completion_tokens
    disallowedFields: ['store', 'developer'] 
  },
  grok: { disallowedFields: ['reasoning_effort'] }
};

```

跨提供商上下文切换是从一开始就设计的功能。当你从 Anthropic 切换到 OpenAI 时，Anthropic 的思考轨迹会被转换为助手消息中的内容块。

**pi-tui** 是最小化的终端 UI 框架，使用差分渲染技术。Zechner 在 DOS 时代长大，对终端界面很有感情，但他不想用 React 方式写 TUI。

为防止闪烁，pi-tui 用同步输出转义序列包装所有渲染，在 Ghostty 或 iTerm2 这样的终端里完全不闪烁，比 Claude Code 体验好很多。

## 会话管理的巧思

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/b7fd596230fea7de8142aeedab13c24b316e10b2.png)

对话以 JSONL 格式存储，每个消息有 id 和 parentId，形成树状结构：

```json

{"id": "1", "parentId": null, "role": "user", "content": "帮我写个函数"}
{"id": "2", "parentId": "1", "role": "assistant", "content": "好的，我来帮你写..."}
{"id": "3", "parentId": "2", "role": "user", "content": "改成异步的"}
{"id": "4", "parentId": "2", "role": "user", "content": "加个错误处理"}  // 分支

```

`/tree` 命令可视化显示对话树，`/fork` 创建分支，长对话触发自动压缩。支持在 AI 工作时插话：Enter 发送 steering 消息中断剩余工具调用；Alt+Enter 发送 follow-up 消息等待完成后处理。

## 扩展系统：原语而非功能

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/7c54c8186dbe7fc197c684b650442b8f89bde151.png)

pi-mono 最巧妙的设计是扩展系统。其他工具内置的功能，你都可以用 TypeScript 扩展自己构建：子代理、计划模式、权限控制、路径保护、SSH 执行、沙箱隔离、MCP 集成，甚至能运行 Doom 游戏。

不想自己写？让 pi 帮你写。或者安装社区包：

```sh

pi install npm:@foo/pi-tools
pi install git:github.com/badlogic/pi-doom

```

## "不做清单" 的智慧

更有意思的是 Zechner 的 "不做清单"。pi-mono 明确拒绝内置很多 "标准功能"：

**不做 MCP 支持**。流行的 MCP 服务器会占用大量上下文：
> Playwright MCP: 21个工具，13.7k tokens
   Chrome DevTools MCP: 26个工具，18k tokens  
   占用 7-9% 上下文窗口，很多工具用不到

替代方案是构建带 README 的 CLI 工具，agent 需要时读取文档，实现渐进式披露，token 高效。

**不做子代理**。Claude Code 经常生成子代理处理复杂任务，但你完全看不到子代理在做什么，像黑盒中的黑盒。pi-mono 的做法是让它通过 bash 调用自己：

```sh

# 子 Agent 示例
pi --print --model claude-3-5-sonnet "Review this code: $(cat app.py)"

# 或者在 tmux 中获得完全可观察性
tmux new-session -d "pi --session review 'Review the auth module'"

```

**不做计划模式**。如果需要持久化计划，写到文件里。不做内置 TODO，写到 TODO.md 里。不做后台 bash，用 tmux 代替。

## 极简的系统提示词

pi-mono 的系统提示词极简到令人震惊，总共不到 1000 tokens：

```markdown

You are an expert coding assistant. You help users with coding tasks 
by reading files, executing commands, editing code, and writing new files.

Available tools:
- read: Read file contents
- bash: Execute bash commands  
- edit: Make surgical edits to files
- write: Create or overwrite files

Guidelines:
- Use bash for file operations like ls, grep, find
- Use read to examine files before editing  
- Use edit for precise changes (old text must match exactly)
- Use write only for new files or complete rewrites
- Be concise in your responses
- Show file paths clearly when working with files

```

相比其他工具动辄上万 token 的系统提示，这显得很极端。但 Zechner 发现前沿模型经过大量强化学习训练，天然理解编程助手概念，不需要万字说明书。

## OpenClaw 的选择

OpenClaw 选择 pi-mono 作为底层框架证明了这种设计的价值。pi-mono 的 SDK 让集成变得简单：

```python

import { createAgentSession } from "@mariozechner/pi-coding-agent";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage: new AuthStorage(),
  modelRegistry: new ModelRegistry(),
});

await session.prompt("What files are in the current directory?");

```

这种集成证明了一个道理：简单的核心加上强大的扩展性，往往比复杂的一体化方案更可靠。

## 基准测试的验证

最有说服力的证据是基准测试结果。Zechner 用 pi-mono 和 Claude Opus 4.5 在 Terminal-Bench 2.0 上跑了完整测试，每个任务五次试验。结果显示 pi-mono 表现优异，在排行榜上位置不错。

更有趣的是 Terminal-Bench 团队自己的 Terminus 2 也采用极简方法：只给模型一个 tmux 会话，模型通过文本发送命令并解析终端输出。没有花哨工具，没有文件操作，只有原始终端交互。但它在排行榜上表现很好，进一步证明极简方法的有效性。

## 四种运行模式

```sh

pi                           # 默认交互模式
pi -p "任务描述"              # 一次性执行
pi --mode json              # 输出结构化数据
pi --mode rpc               # 进程间通信
pi @file1.js @file2.js "重构这些文件"  # 文件批处理

```

支持主流 AI 提供商的订阅服务和 API key 认证。切换模型很简单：

```sh

pi --model claude-3-5-sonnet
pi --model openai/gpt-4o
pi --model sonnet:high  # 指定思考级别

```

## YOLO 模式的现实主义

pi-mono 默认运行在 "YOLO 模式"，对文件系统有不受限制的访问权限。Zechner 认为其他工具的安全措施大多是安全剧场。

Simon Willison 的 "双 LLM" 模式试图解决这个问题，但他自己也承认 "这个解决方案很糟糕"。核心问题是：如果 LLM 能读取数据、执行代码、访问网络，你就在和攻击向量打地鼠游戏。

既然无法解决这个三重能力组合，pi-mono 干脆认输。反正大家为了提高效率最终都会运行在 YOLO 模式。

## 极简主义的价值

Zechner 在博客中写道："我想要一个尽可能让我掌控的工具。" 他对现有工具 "有机演进" 导致的技术债务很不满，认为当大量用户使用你的工具时，向后兼容就是你要付出的代价。

pi-mono 的成功证明了几件事：

**简单的工具组合可以产生复杂的能力**。四个基础工具通过 AI 的智能组合，能完成大部分编程任务。

**可扩展性比内置功能更重要**。用户需求千变万化，与其猜测他们要什么，不如给他们构建所需功能的能力。

**限制比自由更有创造力**。给你四个工具，你可能做出比给你四十个工具更有趣的东西。

**在功能过载的时代，做减法可能比做加法更有价值**。当所有工具都在疯狂添加功能时，回到本质反而是差异化优势。

这种对控制权的追求，对极简主义的坚持，在当下显得很反常识，但 Terminal-Bench 的数据和 OpenClaw 的选择证明了它的价值。

项目地址： https://github.com/badlogic/pi-mono

关注公众号回复 “进群” 入群讨论。