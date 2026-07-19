---
disableNunjucks: true
title: "一文读懂 browser-use，使用 DeepSeek 操作你的浏览器，实现自动搜索、自动下单"
date: 2025-07-28 23:12:26
categories: AI
tags:
- MCP&Tools
description: "本文全面介绍browser-use——一个被manus项目带火的AI浏览器自动化Python库。文章详细分析了Agent、Controller、Browser、DomService等核心组件的关系，展示了如何使用DeepSeek模型实现网页任务自动化。通过搜索总结政策文档和获取豆瓣书籍信息两个实战案例，演示了浏览器自动化工具在智能体应用中的具体使用方法。"
---

**[manus](https://zhida.zhihu.com/search?content_id=255267952&content_type=Article&match_order=1&q=manus&zhida_source=entity) 项目本质是通过 Agent 调用工具集，完成用户的任务，产品体验好，但本身没有多大的技术门槛。依赖开源的工具集和已有的大模型服务，复刻 manus 的难度不大**。 智能体（Agent）调用工具，常见场景之一是自动化、智能化地浏览器。manus 的开源复现项目 [openmanus](https://zhida.zhihu.com/search?content_id=255267952&content_type=Article&match_order=1&q=openmanus&zhida_source=entity)，就是使用开源的 browser-use 框架进行浏览器操作的

<!-- more -->

manus 项目带火了 browser-use 项目 。browser-use 是一款基于 Python 的开源 AI 自动化工具，旨在通过集成大型语言模型（LLM）与浏览器操作，实现网页任务自动化、智能化。browser-use 可以作为智能体操作浏览器的工具框架进行使用，是智能体应用开发者值得关注学习的项目。

*   项目 github 地址（目前已有 45.1 K stars）：[https://github.com/browser-use/browser-use](https://link.zhihu.com/?target=https%3A//github.com/browser-use/browser-use)
*   项目文档地址：[https://docs.browser-use.com/introduction](https://link.zhihu.com/?target=https%3A//docs.browser-use.com/introduction)

本文主要内容如下：

1.  **项目介绍：核心功能、面向人群。**
2.  **项目代码模块分析、核心组件、执行流程时序分析。**
3.  **安装步骤。**
4.  **运行示例（附 python 代码）：（1）搜索并总结《提振消费专项行动方案》的值得关注的内容；（2）获取豆瓣上深度学习相关 top 10 书籍信息，以结构化形式返回。**

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1753715546418.png)

# 项目介绍

bowser-use 是一个允许 AI 智能体控制浏览器的 Python 库，它提供了一个简单的接口，使 AI 代理能够执行各种浏览器操作，如导航、点击、输入文本等。核心功能如下：

*   **浏览器自动化**：支持网页导航、表单填写、数据抓取等操作，结合 [Playwright](https://zhida.zhihu.com/search?content_id=255267952&content_type=Article&match_order=1&q=Playwright&zhida_source=entity) 实现高效的浏览器控制。
*   **AI 决策能力**：通过 LangChain 框架兼容多种 LLM（如 [GPT-4](https://zhida.zhihu.com/search?content_id=255267952&content_type=Article&match_order=1&q=GPT-4&zhida_source=entity)、[Claude](https://zhida.zhihu.com/search?content_id=255267952&content_type=Article&match_order=1&q=Claude&zhida_source=entity)、[Deepseek](https://zhida.zhihu.com/search?content_id=255267952&content_type=Article&match_order=1&q=Deepseek&zhida_source=entity) 等），利用模型生成操作指令并处理复杂逻辑。
*   ️ **多标签页管理**：自动切换和管理多个浏览器标签页，提升多任务处理效率。
*   **自我纠正机制**：在操作遇到错误时自动调整策略或重试，提高任务成功率。
*   **WebUI 界面**：基于 [Gradio](https://zhida.zhihu.com/search?content_id=255267952&content_type=Article&match_order=1&q=Gradio&zhida_source=entity) 提供图形化操作界面，支持实时查看浏览器交互和屏幕录制功能。
*   **跨平台与自定义**：支持本地或 Docker 部署，允许用户使用自己的浏览器实例（如 Chrome），保留登录状态和历史记录。

bowser-use 通过结合 AI 模型与浏览器自动化技术，显著降低了复杂网页任务的开发门槛，适用于开发者、测试工程师及数据分析师等群体。其模块化设计和开放生态也使其具备较高的扩展性。

# 项目模块分析

## 各组件的相互关系

*   **Agent 是核心协调者**：Agent 负责协调所有组件的工作，是整个流程的中心
*   **Controller 是动作执行者**：Controller 负责执行各种浏览器操作，是 Agent 和 Browser 之间的桥
*   **Browser 是操作对象**：Browser 负责实际的浏览器操作，与网页进行交互
*   **DomService 是 DOM 处理者**：DomService 负责提取和处理 DOM 元素，为 Browser 提供支持
*   **MessageManager 是消息管理者**：MessageManager 负责管理与 LLM 的消息交互
*   **LLM 是决策者**：LLM 负责根据当前状态决定下一步操作
*   **ProductTelemetry 是记录者**：ProductTelemetry 负责记录各种事件，用于分析和改进

各组件关系，如下图所示（实线箭头表示主动调用关系，虚线箭头表示返回 / 被动关系。Agent 作为核心协调者，管理各组件间的交互）：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1753715547332.png)

## 项目代码结构

Browser-Use 项目代码结构如下：

```txt

browser-use/
├── browser_use/           # 主要代码目录
│   ├── agent/             # AI 代理相关代码
│   ├── browser/           # 浏览器控制相关代码
│   ├── controller/        # 控制器和动作注册相关代码
│   ├── dom/               # DOM 操作和解析相关代码
│   └── telemetry/         # 遥测和数据收集相关代码
├── docs/                  # 文档
├── examples/              # 使用示例
├── static/                # 静态资源
├── tests/                 # 测试代码
└── eval/                  # 评估代码

```

### agent 模块

**agent 包是 Browser-Use 项目的核心组件，负责协调 LLM（大型语言模型）、浏览器和控制器之间的交互，实现 AI 代理控制浏览器的功能**。其主要功能包括：

*   任务规划与执行：根据用户提供的任务描述，规划并执行一系列浏览器操作。
*   状态管理：维护代理的状态信息，包括执行步骤、历史记录等。
*   消息管理：管理与 LLM 的消息交互，包括系统提示、用户消息和模型响应。
*   错误处理：处理执行过程中的各种错误，并提供重试机制。
*   历史记录：记录代理执行的每一步操作及其结果，便于分析和调试。
*   GIF 生成：可选功能，将代理操作过程记录为 GIF 动画。

### controller 模块

**controller 模块负责注册、管理和执行各种浏览器操作动作。它充当了 agent 包和 browser 包之间的桥梁，将 LLM 生成的指令转换为具体的浏览器操作**。其主要功能包括：

*   动作注册：提供装饰器机制，允许开发者注册自定义动作。
*   动作执行：执行已注册的动作，处理参数验证和错误处理。
*   动作管理：维护已注册动作的列表，提供动作描述和帮助信息。
*   参数验证：使用 Pydantic 模型验证动作参数，确保参数类型和格式正确。
*   默认动作提供：内置了一系列常用的浏览器操作，如导航、点击、输入文本等。
*   异步支持：支持同步和异步动作，自动将同步动作包装为异步

### browser 模块

**browser 模块负责浏览器的初始化、配置和控制。它封装了 Playwright 库的功能，提供了更高级的浏览器操作接口**。其主要功能包括：

*   浏览器初始化与配置：负责初始化浏览器实例，并根据配置设置浏览器参数。
*   浏览器上下文管理：创建和管理浏览器上下文，支持多标签页操作。
*   页面导航与交互：提供页面导航、元素交互等功能。
*   状态管理：维护浏览器状态，包括当前 URL、标题、标签页信息等。
*   DOM 操作：通过与 DOM 包的集成，提供 DOM 元素的查找、操作功能。
*   错误处理：处理浏览器操作过程中的各种错误。

### dom 模块

**dom 模块负责处理和表示浏览器的文档对象模型 (Document Object Model)**，提供了以下主要功能：

*   DOM 树构建与管理：通过 DomService 类，从浏览器页面中提取 DOM 结构并构建成树形结构。
*   可点击元素识别：识别和管理页面中的可点击元素，支持用户交互。
*   DOM 历史记录处理：通过 HistoryTreeProcessor 服务，处理 DOM 元素的历史记录，支持元素的跟踪和比较。
*   视口信息管理：跟踪元素在视口中的位置和可见性。

### telemetry 模块

**telemetry 模块是 Browser-Use 项目的辅助组件，负责收集和发送匿名使用数据，帮助开发者了解项目的使用情况和性能表现**。其主要功能包括：

*   匿名数据收集：收集用户的匿名使用数据，如代理运行情况、步骤执行、注册的功能等。
*   事件跟踪：定义和跟踪各种遥测事件，如代理启动、步骤执行、代理结束等。
*   数据发送：将收集的数据发送到 [PostHog](https://zhida.zhihu.com/search?content_id=255267952&content_type=Article&match_order=1&q=PostHog&zhida_source=entity) 分析平台。
*   用户隐私保护：提供禁用遥测功能的选项，尊重用户隐私。
*   用户标识管理：生成和管理匿名用户标识符，用于关联同一用户的数据。

# 执行流程时序分析

## 初始化阶段

初始化阶段主要包括以下步骤：

1.  用户创建代理：用户提供任务描述、语言模型和浏览器实例，创建 Agent 对象
2.  初始化消息管理器：Agent 初始化 MessageManager，设置系统提示和任务消息
3.  初始化控制器：Agent 初始化 Controller，注册各种浏览器操作
4.  记录遥测事件：Agent 通过 ProductTelemetry 记录代理启动事件
5.  完成初始化：Agent 向用户返回初始化完成的信息

这个阶段建立了代理运行所需的所有组件和环境。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1753715547457.png)

## 执行循环阶段

执行循环阶段是整个流程的核心，代理会重复执行以下步骤，直到任务完成或达到最大步骤数：

1.  获取浏览器状态：

*   Agent 从 Browser 获取当前状态
*   Browser 通过 DomService 获取 DOM 元素和可点击元素
*   Browser 返回浏览器状态给 Agent

2. 准备 LLM 输入：

*   Agent 将浏览器状态添加到 MessageManager
*   Agent 从 MessageManager 获取完整的消息列表

3. 获取下一步操作：

*   Agent 将消息发送给 LLM
*   LLM 返回 AgentOutput，包含思考过程和要执行的动作
*   Agent 将模型输出添加到 MessageManager

4. 执行动作：

*   Agent 通过 Controller 执行动作
*   Controller 根据动作类型调用 Browser 的不同方法：

*   导航操作：导航到指定 URL
*   点击操作：点击页面上的元素
*   输入操作：在元素中输入文本
*   完成操作：标记任务完成

*   Controller 返回 ActionResult 给 Agent

5. 记录和更新状态：

*   Agent 通过 ProductTelemetry 记录步骤执行事件
*   Agent 更新自身状态，包括成功 / 失败状态

这个循环体现了 Browser-Use 项目的核心功能：通过 LLM 理解当前浏览器状态，决定下一步操作，并通过控制器执行操作，实现自动化浏览器任务。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1753715548003.png)

## 结束阶段

当任务完成或达到最大步骤数时，代理会执行以下步骤：

1.  记录结束事件：Agent 通过 ProductTelemetry 记录代理结束事件。
2.  返回历史记录：Agent 向用户返回 AgentHistoryList，包含所有步骤的详细信息。
3.  可选生成 GIF：如果启用了 GIF 生成功能，Agent 会处理历史记录和截图，生成一个展示整个过程的 GIF 文件。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1753715549509.png)

# 安装

创建 python 虚拟环境：

```sh
conda create --name browser_use python=3.11
conda activate browser_use
```

安装 browser-use 包：

```sh
pip install browser-use -i https://pypi.tuna.tsinghua.edu.cn/simple
```

运行以下命令，安装 playwright：

```sh
playwright install
```

根据使用的大模型服务，在环境变量设置里配置相应的 API key：

*   OPENAI_API_KEY（gpt-4o 模型）
*   ANTHROPIC_API_KEY（claude 模型）
*   GEMINI_API_KEY（gemini 模型）
*   DEEPSEEK_API_KEY（deepseek 的 r1、v3 模型）

# 运行示例

设置额外的系统提示词，要求 AI 优先使用 bing 进行搜索。

## 近期发布的《提振消费专项行动方案》，有哪些值得关注的内容？
python 代码 - 调用 deepseek 的 v3 模型：

```python
from langchain_openai import ChatOpenAI
from browser_use import Agent
import asyncio
import os
from pydantic import SecretStr

# Add your custom instructions
extend_system_message = """
记住最重要的规则:
1、执行搜索任务时，优先打开 https://www.bing.com/?mkt=zh-CN 进行搜索。
2、最后的输出结果，要用中文回答用户的问题。
"""
api_key = os.getenv('DEEPSEEK_API_KEY')


async def main():
    # Initialize the model
    llm = ChatOpenAI(base_url='https://api.deepseek.com/v1', model='deepseek-chat', api_key=SecretStr(api_key))
    agent = Agent(
        task="近期发布的《提振消费专项行动方案》，有哪些值得关注的内容？",
        llm=llm,
        use_vision=False,
        message_context=extend_system_message
    )
    await agent.run()


asyncio.run(main())

```

python 代码 - 调用 openai 的 gpt-4o 模型：

```python
from langchain_openai import ChatOpenAI
from browser_use import Agent
import asyncio

# Add your custom instructions
extend_system_message = """
记住最重要的规则:
1、执行搜索任务时，优先打开 https://www.bing.com/?mkt=zh-CN 进行搜索。
2、最后的输出结果，要用中文回答用户的问题。
"""


async def main():
    llm = ChatOpenAI(model="gpt-4o")
    agent = Agent(
        task="近期发布的《提振消费专项行动方案》，有哪些值得关注的内容？",
        llm=llm,
        use_vision=False,
        message_context=extend_system_message,
        generate_gif=True  # 将对浏览器的操作保存为 gif
    )
    await agent.run()


asyncio.run(main())


```

大模型操作浏览器进行搜索：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1753715551612.png)

执行日志：

```txt
INFO     [browser_use] BrowserUse logging setup complete with level info
INFO     [root] Anonymized telemetry enabled. See https://docs.browser-use.com/development/telemetry for more information.
INFO     [agent]   Starting task: 近期发布的《提振消费专项行动方案》，有哪些值得关注的内容？
D:\DevelopTools\pythonenv\browser_use\Lib\site-packages\browser_use\agent\message_manager\views.py:59: LangChainBetaWarning: The function `load` is in beta. It is actively being worked on, so the API may change.
  value['message'] = load(value['message'])
INFO     [agent]   Step 1
INFO     [agent]   Eval: Unknown - Start a new search to gather the needed information.
INFO     [agent]   Memory: Start by opening a new tab for Bing search 0 out of 1 tab opened.
INFO     [agent]   Next goal: Open Bing's Chinese search page in a new tab.
INFO     [agent]  ️  Action 1/1: {"open_tab":{"url":"https://www.bing.com/?mkt=zh-CN"}}
INFO     [controller]    Opened new tab with https://www.bing.com/?mkt=zh-CN
INFO     [agent]   Step 2
INFO     [agent]   Eval: Success - Bing Chinese search page is open.
INFO     [agent]   Memory: Bing Chinese search page opened. I need to search for '《提振消费专项行动方案》 近期发布'.
INFO     [agent]   Next goal: Enter the search term in the search box and execute the search.
INFO     [agent]  ️  Action 1/2: {"input_text":{"index":17,"text":"《提振消费专项行动方案》 近期发布"}}
INFO     [agent]  ️  Action 2/2: {"send_keys":{"keys":"Enter"}}
INFO     [controller] ⌨️  Input 《提振消费专项行动方案》 近期发布 into index 17
INFO     [controller] ⌨️  Sent keys: Enter
INFO     [agent]   Step 3
INFO     [agent]   Eval: Success - Search results for the query are loaded.
INFO     [agent]   Memory: Successfully searched for '《提振消费专项行动方案》 近期发布'. Need to extract relevant content about this scheme's highlights from the content below on the search results page.
INFO     [agent]   Next goal: Extract content about highlights of the scheme from this search results page.
INFO     [agent]  ️  Action 1/1: {"extract_content":{"goal":"提振消费专项行动方案 的 值得关注的 内容"}}
INFO     [controller]    Extracted from page
: json
{
    "title": "《提振消费专项行动方案》值得关注的内容",
    "content": [
        {
            "section": "政策背景",
            "details": "由中共中央办公厅和国务院办公厅联合印发，方案体现最高层的意志，意在强调提振消费在经济增长中的重要性。"
        },
        {
            "section": "八大方面",
            "details": "该方案部署了8个方面的30项重点任务，包括城乡居民增收促进行动、消费能力保障支持行动、服务消费提质惠民行动等，旨在解决制约消费的突出矛盾问题。"
        },
        {
            "section": "具体任务",
            "details": [
                "城乡居民增收促进行动",
                "消费能力保障支持行动",
                "服务消费提质惠民行动",
                "大宗消费更新升级行动",
                "消费品质提升行动",
                "消费环境改善提升行动",
                "限制措施清理优化行动",
                "完善支持政策"
            ]
        },
        {
            "section": "发布会解读",
            "details": "在新闻发布会上，多部门负责人对方案作出解读，强调增收、减负、提升消费能力，并介绍了相关政策的具体实施路径。"
        },
        {
            "section": "预期效果",
            "details": "相关机构认为，该方案有助于扩大国内需求，抵消出口不确定性，使2025年GDP增长5%左右，彰显出在消费领域发力的决心与力度。"
        }
    ]
}
INFO     [agent]   Step 4
INFO     [agent]   Eval: Success - Extracted relevant content about the highlights of the scheme.
INFO     [agent]   Memory: Extracted details of the scheme's highlights from current page. Task of extracting content is complete. Next step is to finalize the task by providing results in Chinese.
INFO     [agent]   Next goal: Provide the summarized details of the scheme in Chinese to complete the user's task.
INFO     [agent]  ️  Action 1/1: {"done":{"text":"《提振消费专项行动方案》值得关注的内容如下：\\n1. **政策背景**：由中共中央办公厅和国务院办公厅联合印发，方案体现最高层的意志，意在强调提振消费在经济增长中的重要性。\\n2. **八大方面**：方案部署了8个方面的30项重点任务，包括城乡居民增收促进行动、消费能力保障支持行动、服务消费提质惠民行动等，旨在解决制约消费的突出矛盾问题。\\n3. **具体任务**：涉及到城乡居民增收促进行动、消费能力保障支持行动、服务消费提质惠民行动、大宗消费更新升级行动、消费品质提升行动、消费环境改善提升行动、限制措施清理优化行动以及完善支持政策。\\n4. **发布会解读**：新闻发布会上强调增收、减负、提升消费能力，介绍了相关政策的具体实施路径。\\n5. **预期效果**：该方案有助于扩大国内需求，抵消出口不确定性，并有望在2025年使GDP增长达到5%左右。","success":true}}
INFO     [agent]   Result: 《提振消费专项行动方案》值得关注的内容如下：\n1. **政策背景**：由中共中央办公厅和国务院办公厅联合印发，方案体现最高层的意志，意在强调提振消费在经济增长中的重要性。\n2. **八大方面**：方案部署了8个方面的30项重点任务，包括城乡居民增收促进行动、消费能力保障支持行动、服务消费提质惠民行动等，旨在解决制约消费的突出矛盾问题。\n3. **具体任务**：涉及到城乡居民增收促进行动、消费能力保障支持行动、服务消费提质惠民行动、大宗消费更新升级行动、消费品质提升行动、消费环境改善提升行动、限制措施清理优化行动以及完善支持政策。\n4. **发布会解读**：新闻发布会上强调增收、减负、提升消费能力，介绍了相关政策的具体实施路径。\n5. **预期效果**：该方案有助于扩大国内需求，抵消出口不确定性，并有望在2025年使GDP增长达到5%左右。
INFO     [agent] ✅ Task completed
INFO     [agent] ✅ Successfully


```

根据搜索结果，大模型返回的回答：

```txt
Result: 《提振消费专项行动方案》值得关注的内容如下：\n
1. **政策背景**：由中共中央办公厅和国务院办公厅联合印发，方案体现最高层的意志，意在强调提振消费在经济增长中的重要性。\n
2. **八大方面**：方案部署了8个方面的30项重点任务，包括城乡居民增收促进行动、消费能力保障支持行动、服务消费提质惠民行动等，旨在解决制约消费的突出矛盾问题。\n
3. **具体任务**：涉及到城乡居民增收促进行动、消费能力保障支持行动、服务消费提质惠民行动、大宗消费更新升级行动、消费品质提升行动、消费环境改善提升行动、限制措施清理优化行动以及完善支持政策。\n
4. **发布会解读**：新闻发布会上强调增收、减负、提升消费能力，介绍了相关政策的具体实施路径。\n
5. **预期效果**：该方案有助于扩大国内需求，抵消出口不确定性，并有望在2025年使GDP增长达到5%左右。
```

## 搜索豆瓣深度学习相关 top 10 书籍

代码逻辑：

1.  定义 Book 类、Books 类，创建 Controller 对象，要求搜索结果以 Books 形式返回。
2.  由于豆瓣读书需要账号密码登录。这里指定使用本地已安装的 chrome 浏览器（保存了登录豆瓣的 cookies）。
3.  设置任务提示词，要求 AI 按照具体步骤操作。先搜索获取前 10 的书的链接，然后进入每一本书的链接，获取具体信息。
4.  根据 Agent 运行返回的结构化数据（Books），打印每本书的信息。

python 代码：

```python
from langchain_openai import ChatOpenAI
import asyncio
from pydantic import BaseModel
from typing import List
from browser_use import ActionResult, Agent, Controller
from browser_use import BrowserConfig, Browser


class Book(BaseModel):
    book_title: str  # 书名
    douban_url: str  # 豆瓣链接
    author: str  # 作者
    brief_introduction: str  # 简介
    score: float  # 评分


class Books(BaseModel):
    books: List[Book]


controller = Controller(output_model=Books)
config = BrowserConfig(
    chrome_instance_path="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
)
browser = Browser(config=config)


async def main():
    task = '''请按照以下步骤执行:
    1、进入豆瓣读书，搜索深度学习相关的书籍，获取排名前 10 的每本书的详情链接。并记录下来。
    2、遍历步骤 1 记录的链接，进入每本书的详情链接，获取书的信息; 
    3、返回前 10 的书的信息
    '''
    model = ChatOpenAI(model='gpt-4o')
    agent = Agent(browser=browser,
                  task=task,
                  llm=model,
                  controller=controller)

    history = await agent.run()

    result = history.final_result()
    if result:
        parsed: Books = Books.model_validate_json(result)

        for book in parsed.books:
            print('\n--------------------------------')
            print(f'书名:         {book.book_title}')
            print(f'豆瓣链接:      {book.douban_url}')
            print(f'作者:         {book.author}')
            print(f'简介:         {book.brief_introduction}')
            print(f'评分:         {book.score}')
    else:
        print('No result')


if __name__ == '__main__':
    asyncio.run(main())


```

AI 操作浏览器，进入豆瓣读书页，搜索 “深度学习” 相关书籍：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1753715551806.png)

进入书的详情页，获取书的具体信息：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1753715551979.png)

最后，AI 将深度学习相关的 top 10 书本，以结构化形式返回（**操作过程，符合提示词的要求，先记录了十本书的链接，然后进入每本书详情页获取具体信息**)：

```
--------------------------------
书名:         深度学习入门
豆瓣链接:      https://book.douban.com/subject/30270959/
作者:         斋藤康毅
简介:         本书是深度学习真正意义上的入门书，深入浅出地剖析了深度学习的原理和相关技术。书中使用Python3，尽量不依赖外部库或工具，从基本的数学知识出发，带领读者从零创建一个经典的深度学习网络，使读者在此过程中逐步理解深度学习。
评分:         9.5

--------------------------------
书名:         深度学习
豆瓣链接:      https://book.douban.com/subject/27087503/
作者:         伊恩·古德费洛, 约书亚·本吉奥, 亚伦·库维尔
简介:         《深度学习》是深度学习领域奠基性的经典教材，由全球知名的专家Ian Goodfellow、Yoshua Bengio和Aaron Courville撰写。全书内容包括三部分：第1部分涉及基本数学工具和机器学习概念，为深度学习的预备知识；第2部分系统深入地讲解成熟的深度学习方法和技术；第3部分讨论具有前瞻性的研究方向和想法，适合各类读者，包括专业大学生、研究生及软件工程师。
评分:         8.4

--------------------------------
书名:         深度学习入门2
豆瓣链接:      https://book.douban.com/subject/36303408/
作者:         [日] 斋藤康毅
简介:         《深度学习入门：基于Python的理论与实现》作者的又一力作。本书延续前作的风格，通过通俗的语言和大量示意图讲解，帮助读者深入理解现代深度学习框架。本书引导读者从零创建一个深度学习框架DeZero，在此过程中加深对Python编程和深度学习框架机制的理解。
评分:         9.6

--------------------------------
书名:         动手学深度学习（PyTorch版）
豆瓣链接:      https://book.douban.com/subject/36142067/
作者:         阿斯顿·张, 扎卡里·C. 立顿, 李沐, 亚历山大·J. 斯莫拉
简介:         本书是《动手学深度学习》的升级版，采用PyTorch框架，提供深度学习的互动式学习体验。书中修订了所有内容并新增注意力机制、预训练等。目前已有全球400多所大学采用该书作为教材。主要面向在校大学生、技术和研究人员，适合对Python编程有基本了解的读者。
评分:         9.4

--------------------------------
书名:         Python深度学习 (第2版)
豆瓣链接:      https://book.douban.com/subject/36078304/
作者:         弗朗索瓦·肖莱
简介:         近年来，深度学习在自然语言处理、计算机视觉等领域取得了非凡的进展。从机器翻译和文本生成到自动驾驶和虚拟助手，我们受益于深度学习技术的逐渐普及。然而，深度学习还远未发挥全部潜力。欢迎来到深度学习的世界！在这个规模呈爆发式增长的领域，仍有许多“宝藏”等待你去发掘。本书由流行深度学习框架 Keras 之父弗朗索瓦·肖莱执笔，不用数学公式，而用Python代码帮助你直观理解深度学习的核心思想。
评分:         9.5

--------------------------------
书名:         深度学习入门4
豆瓣链接:      https://book.douban.com/subject/36991430/
作者:         [日]斋藤康毅
简介:         本书前半部分介绍强化学习的重要思想和基础知识，后半部分介绍如何将深度学习应用于强化学习，遴选讲解了深度强化学习的最新技术。
评分:         9.3

--------------------------------
书名:         机器学习与深度学习算法基础
豆瓣链接:      https://book.douban.com/subject/35218628/
作者:         贾壮
简介:         本书共分为上下两篇，共18章：第一篇为经典机器学习模型部分，讲解常用的机器学习经典模型。第二篇为深度学习和神经网络部分，介绍时下流行和通用的模型。
评分:         9.5

--------------------------------
书名:         深度学习进阶：自然语言处理
豆瓣链接:      https://book.douban.com/subject/35225413/
作者:         斋藤康毅
简介:         《深度学习进阶：自然语言处理》是《深度学习入门：基于Python 的理论与实现》的续作，围绕自然语言处理和时序数据处理，介绍深度学习中的重要技术，包括word2vec、RNN、LSTM、GRU、seq2seq 和Attention 等。
评分:         9.5

--------------------------------
书名:         深度学习: 智能时代的核心驱动力量
豆瓣链接:      https://book.douban.com/subject/30425822/
作者:         特伦斯·谢诺夫斯基
简介:         本书探讨了深度学习在科技领域的广泛应用，深度学习是人工智能实现繁荣的核心技术。
评分:         7.6

--------------------------------
书名:         神经网络与深度学习
豆瓣链接:      https://book.douban.com/subject/35044046/
作者:         邱锡鹏
简介:         新一代“炫目”的人工智能技术之核心本质就是神经网络与深度学习
评分:         8.5


```

