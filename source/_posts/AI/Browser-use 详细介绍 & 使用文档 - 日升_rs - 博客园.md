---
disableNunjucks: true
title: "Browser-use 详细介绍 & 使用文档 - 日升_rs - 博客园"
date: 2025-07-28 23:09:11
categories: AI
tags:
description: "Browser-use 是一个将 AI 智能体与真实浏览器交互的 Python 库，基于 LangChain 和 Playwright 实现。文章详细介绍了 Browser-use 的核心特性、技术架构、环境配置和使用方法。核心流程为语言模型决策规划、浏览器执行操作、数据回传处理。支持多种大语言模型，提供 Agent 接口参数配置、自定义工具开发、UI 测试等功能。要求 Python 3.11 及以上版本，适合需要浏览器自动化和网页数据采集的 AI 应用开发场景。"
---

## 一、概述

**Browser-use** 是一个旨在将 AI “智能体”（Agents）与真实浏览器进行交互的 Python 库，可以轻松实现浏览器自动化。在配合 LLM（如 GPT 系列）使用时，浏览器 - use 能够让你的智能体发起对网页的访问、操作页面元素、收集信息、执行脚本等，从而扩展 AI 应用的落地场景。

<!-- more -->

*   **GitHub**: [browser-use/browser-use](https://github.com/browser-use/browser-use)
*   **官网**: [browser-use.com](https://browser-use.com/)
*   **文档**: [docs.browser-use.com](https://docs.browser-use.com/introduction)

目前 Browser-use 最低需要 **Python 3.11** 及以上，才能正常使用其封装的 Playwright 功能。

### 1. 技术栈:

*   LangChain（AI Agent 框架）
*   Playwright（浏览器自动化）
*   dotenv（环境变量 key）
*   异步 I/O 架构

### 2. 流程图

用户任务

LLM 解析

Agent 决策 / 规划

浏览器动作

数据提取页面信息

Playwright 调用

浏览器实例

模型处理

结构化结果输出

browser-use：**语言模型 -> 决策 / 控制 -> 浏览器执行 -> 数据回传 -> 模型后处理**

## 二、关键特性

### 1. 简单的 Agent 接口

通过 Agent 类即可快速创建带浏览器交互能力的智能体，赋能 LLM 与网页之间的复杂操作。

#### 1.1. Agent 接口参数

<table><thead><tr><th><strong>参数名称</strong></th><th><strong>类型</strong></th><th><strong>默认值</strong></th><th><strong>说明</strong></th></tr></thead><tbody><tr><td><strong>task</strong></td><td>str</td><td><em>无</em>（必传）</td><td>代理需要执行的任务描述。</td></tr><tr><td><strong>llm</strong></td><td>BaseChatModel (LangChain Model)</td><td><em>无</em>（必传）</td><td>主语言模型，执行对话和工具调用。</td></tr><tr><td><strong>controller</strong></td><td>object (Controller 实例)</td><td>默认 Controller</td><td>自定义函数 / 工具调用的注册表。可参考 “Custom Functions”。</td></tr><tr><td><strong>use_vision</strong></td><td>bool</td><td>True</td><td>是否启用视觉能力（截图 + 分析）。如模型支持图像输入，可显著提高网页理解；也会产生额外 token 成本。</td></tr><tr><td><strong>save_conversation_path</strong></td><td>str</td><td><em>无</em></td><td>若指定，则会将对话历史保存在该路径下，用于调试或审计。</td></tr><tr><td><strong>system_prompt_class</strong></td><td>type (自定义 System Prompt 类)</td><td>默认 Prompt 类</td><td>自定义系统提示词逻辑，参考 “System Prompt” 定制化说明。</td></tr><tr><td><strong>browser</strong></td><td>Browser (Browser-use 实例)</td><td><em>无</em></td><td>重用已创建的 Browser 实例；若不提供，则 Agent 每次 run() 时会自动创建并关闭新的浏览器。</td></tr><tr><td><strong>browser_context</strong></td><td>BrowserContext (Playwright 实例)</td><td><em>无</em></td><td>使用已有的浏览器上下文 (Context)。适合需要维护持久会话 (cookies/localStorage) 的场景。</td></tr><tr><td><strong>max_steps</strong></td><td>int</td><td>100</td><td>允许 Agent 执行的最大步骤数，防止死循环或无限操作。</td></tr><tr><td><strong>planner_llm</strong></td><td>BaseChatModel</td><td><em>不启用 Planner</em></td><td>规划用语言模型，与主 LLM 分开；可用较小 / 便宜模型处理高层策略。</td></tr><tr><td><strong>use_vision_for_planner</strong></td><td>bool</td><td>True</td><td>Planner 是否能使用视觉功能（若主 LLM 已开启视觉，这里可独立关闭以节省资源）。</td></tr><tr><td><strong>planner_interval</strong></td><td>int</td><td>1</td><td>Planner 模型执行间隔。即每多少步调用一次 Planner 作重新规划。</td></tr><tr><td><strong>message_context</strong></td><td>str</td><td><em>无</em></td><td>额外的任务 / 上下文信息，辅助 LLM 更好理解或执行任务。</td></tr><tr><td><strong>initial_actions</strong></td><td>list[dict]</td><td><em>无</em></td><td>初始化时要执行的动作列表（无需经 LLM 调用），格式为 {action_name: {...}}。</td></tr><tr><td><strong>max_actions_per_step</strong></td><td>int</td><td>10</td><td>每个步骤里可执行的最大动作数，用于控制 Agent 过度频繁操作。</td></tr><tr><td><strong>max_failures</strong></td><td>int</td><td>3</td><td>允许 Agent 失败的最大次数，超过则停止任务。</td></tr><tr><td><strong>retry_delay</strong></td><td>int (秒)</td><td>10</td><td>当遇到限流 (rate limit) 或可重试的错误时，等待多少秒后再次尝试。</td></tr><tr><td><strong>generate_gif</strong></td><td>bool 或 str (路径)</td><td>False</td><td>是否录制浏览器过程生成 GIF。为 True 时自动生成随机文件名；为字符串时将 GIF 存储到该路径。</td></tr></tbody></table>

### 2. 多语言模型支持

可轻松集成 [LangChain](https://github.com/hwchase17/langchain) 提供的各类 LLM（如 OpenAI、Anthropic、Cohere 等）进行高级任务管理。

<table><thead><tr><th><strong>模型</strong></th><th><strong>所属 / 类型</strong></th></tr></thead><tbody><tr><td><strong>GPT-4o</strong></td><td>OpenAI</td></tr><tr><td><strong>Claude</strong></td><td>Anthropic</td></tr><tr><td><strong>Azure</strong></td><td>Azure OpenAI</td></tr><tr><td><strong>Gemini</strong></td><td>Google Generative AI</td></tr><tr><td><strong>DeepSeek-V3</strong></td><td>DeepSeek</td></tr><tr><td><strong>DeepSeek-R1</strong></td><td>DeepSeek</td></tr><tr><td><strong>Ollama</strong></td><td>本地模型 (需安装 Ollama)</td></tr></tbody></table>

### 3. 基于 Playwright

默认使用 [Playwright](https://playwright.dev/) 进行浏览器的无头启动、页面操作和渲染控制；对常见网页交互场景提供友好的抽象。

### 4. 云端版 & 本地版

除了本地安装运行外，Browser-use 也提供托管版本，可以直接在云端执行，无需配置本地环境。

### 5. Gradio UI 测试

内置示例可以利用 Gradio 搭建简易的可视化界面，方便开发者快速测试并可视化浏览器自动化流程。

## 三、环境准备

### 1. Python 版本

*   需要 **Python 3.11** 或更高版本。
*   推荐在独立虚拟环境 (venv) 或管理工具（如 uv）中配置环境。

#### 1.1. 推荐使用 pyenv 管理 python

Github：[https://github.com/pyenv/pyenv](https://github.com/pyenv/pyenv)

```
# pyenv 根目录
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"

# 初始化
eval "$(pyenv init -)"


```

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1753715351605.png)

### 2. 安装方法

#### 2.1. 安装 browser-use

```
pip3 install browser-use


```

#### 2.2. 安装 Playwright

```
playwright install


```

*   此操作会自动下载 Chromium 无头浏览器，用于后续的浏览器自动化。

#### 2.3. 配置 LLM API Keys（可选）

*   在 .env 文件中填写相应的 OPENAI_API_KEY=、ANTHROPIC_API_KEY= 等 Key。

```
OPENAI_API_KEY=sk-xxxxxxx


```

*   如果使用其他 LLM，需要参考 LangChain 文档或对应服务提供的说明进行配置。

## 四、Demo 示例

### 1. 简单示例

```
import asyncio
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from browser_use import Agent

load_dotenv()

llm = ChatOpenAI(model="gpt-4o")

async def main():
    agent = Agent(
        task="打开 https://cn.vuejs.org/guide/essentials/computed，获取页面里所有的 h2 标签文本及所有的 a 标签文本（以及它的 href）",
        llm=llm,
    )
    result = await agent.run()
    print('result:',result)

if __name__ == "__main__":
    asyncio.run(main())


```

#### 1.1. 核心流程:

1.  从 .env 中读取 OPENAI_API_KEY 等信息，初始化 ChatOpenAI。
2.  创建一个 Agent，指定 task 即描述智能体要完成的任务。
3.  调用 agent.run() 发起执行，包括浏览器自动化与 LLM 结合的流程。

## 五、常见操作

### 1. 修改 LLM 模型

```
llm = ChatOpenAI(model="gpt-3.5-turbo")


```

或

```
llm = ChatOpenAI(model="gpt-4o")


```

### 2. 在 .env 中设置 API Key

```
OPENAI_API_KEY=sk-xxxx
ANTHROPIC_API_KEY=xxxxxx


```

如果你还需使用其他模型（如 Cohere、HuggingFace Hub），可一并配置对应的 Key，并在 Python 脚本中初始化相应的 LLM 对象。

### 3. 官方文档示例

在 [docs.browser-use.com/introduction](https://docs.browser-use.com/introduction) 可以找到更多场景示例，比如如何定制 browser-use 的 Tools、配合 PythonREPLTool 扩展执行 Python 脚本等。

## 六、UI 测试方式

如果你想通过简单的 UI（如 Gradio）来测试 Browser-use，官方示例提供了 examples/ui/gradio_demo.py。

### 1. 安装 Gradio

```
uv pip install gradio


```

### 2. 运行示例

```
python examples/ui/gradio_demo.py


```

打开终端提示的地址，就能看到一个简易的 web 界面，在界面中输入 task 等信息测试智能体。

## 七、常见问题 & 解决思路

*   **报错：playwright not installed 或 executable path not found**
    *   请确认已执行 playwright install chromium，且安装成功。
*   **Python 版本过低**
    *   Browser-use 要求 Python >= 3.11，如果你使用的是 3.10 或更低版本，需要升级环境。
*   **LLM 调用失败**
    *   检查是否在 .env 中填写了正确的 API key，或你的 Key 是否仍在有效期内。
*   **UI Demo 启动后无法访问**
    *   可能是端口占用，或者 Gradio 版本过旧。尝试更新 gradio 或换一个端口。
*   **长时间卡住 / 超时**
    *   检查网络环境，LLM 请求或浏览器加载是否耗时过长。

### 八、总结

**Browser-use** 让 AI 与浏览器的结合变得更便捷，能够快速构建出 “会浏览网页、抓取信息、进行动态交互” 的智能体。只需简单的配置与几行代码，就能让 LLM 自动处理网页操作，为项目带来更多可能性。

*   使用 Python >= 3.11；
*   安装并配置好 Playwright；
*   在主代码中初始化 Agent 并提供 LLM；
*   在 .env 中存放 API Keys；

## 九、参考

*   **GitHub**: [browser-use/browser-use](https://github.com/browser-use/browser-use)
*   **官网**: [browser-use.com](https://browser-use.com/)
*   **官方文档**: [docs.browser-use.com/introduction](https://docs.browser-use.com/introduction)