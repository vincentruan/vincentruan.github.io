---
title: "别让 AI 做它不擅长的事：Agent 在业务场景中的工程实践"
date: 2025-09-07 00:00:00
categories: AI
tags:
- Agent工程实践
- MCP协议
- 业务场景应用
- 浏览器自动化
- 智能播报助手
- 工程与AI结合
- 提效实践
- Agent智能体
description: "本文通过智能播报助手和批量建任务两个真实业务场景，深刻阐述了Agent与传统工程系统深度融合才是实现业务提效的有效路径。文章详细介绍了MCP协议的三种通信方式、playwright-mcp浏览器自动化工具的使用，以及如何在实践中识别Agent擅长的语义匹配任务与工程擅长的精确处理任务，最终提出了Agent与工程的选型指南和能力对比。"
---

本文通过分享将 AI Agent 技术应用于 “智能播报助手” 和“批量建任务”两个真实业务场景的实践历程，深刻阐述了当下将 AI Agent 与传统工程系统深度融合，而非追求完全替代，才是实现业务提效和价值落地的有效路径。

<!-- more -->

Agent 随着 Agent 相关技术的快速发展，验证其在企业实际业务场景中的价值已成为当务之急。脱离应用场景的技术创新终将沦为 “空中楼阁”。本文分享我将 agent 与工程结合并应用于两个业务场景的历程，并在最后给出 agent 与工程的选型总结。

# 一、Agent + MCP 打造智能播报助手

## 1.1. 业务背景与问题

在我们的日常工作中会制作或使用大量统计报表。淘天会在一款数据产品上制作报表相关内容，制作好的报表会由关心报表数据的同学每隔一定周期去查看报表的数据是否出现异常。比如每天早上十点查看表 A 的数据、大促上下线时每隔半小时查看表 B 的数据。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256131342.png)

定时看报表的整体流程，简单概括就是打开网页，找到异常数据，基于异常数据采取某些行为。FBI 拥有定时播报的能力，但是存在以下局限性：

*   表格类型报表只能播报图片，若要导出报表数据，只能选择「邮件格式」并且只能把数据导出为 excel 格式。若用工程（编码）处理，需要对每一个表格类型定义接收对象。
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256131558.png)

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256131768.png)

*   文本类型报表可以定义异常指标，但只能修改异常指标的展示样式，满足不了「只有某指标出现异常时才播报给某些特定的联系人」的需求，并且无法基于异常数据进行后续动作。
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256131946.png)

*   虽然底表的数据我们可以直接获取，但无法拿到 FBI 加工过的数据如日环比。
    

比如下图中，定义异常数据为「指标 1 < 10% 或指标 2 < 30%」。同学甲只关注 A-aa1 的数据、同学乙只关注 A-aa2 的数据、同学丙只关注 B-bb1 的数据。那么就期望在周期到达时，向同学甲和同学丙播报异常数据，甚至是基于异常数据进行下一步动作。FBI 目前做不到这一点。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256132127.png)

## 1.2. MCP 介绍

事情的转折点在于 LLM 的不断进化（如 claude4）以及 MCP 的横空出世。MCP （Model Context Protocol） ，翻译过来就是模型上下文协议，简单来说，它定义了一套标准规则，让 LLM 模型能够安全、有序地访问和使用各种外部资源，从而大大扩展 Agent 的能力边界。MCP 中有两个重要角色：MCP Client 和 MCP Server。MCP Server 提供各种各样的能力与工具，MCP Client 是 MCP Server 的调用者。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256132278.png)

举一个通俗的例子，把 MCP Client 想象成 DVD 播放器，DVD 播放器可以放入不同的碟片（MCP Server），不同的碟片有不同的内容（能力），但肯定不能向 DVD 播放器中放入磁带（不符合 MCP 的 Server）。在 AI 场景下，就是给予 Agent 通用地调用各种各样工具的能力。

可能会有同学好奇：让 Agent 调用工具难道是最近才有的能力吗？其实并不是这样，工具调用（Function Calling）是早于 MCP 提出来的能力，也就是说 agent 在 MCP 出现前就可以进行工具调用。过去只有 Function Calling 时，不同厂商（OpenAI、Anthropic......）的 Function Calling 协议都不同，并且许多开源模型不支持 Function Calling。比如为 OpenAI 的某个模型开发了一个 tool，想要复用到 Anthropic（Claude 的开发者）的某个模型，先要查看模型是否支持 Function Calling，若支持还需要重新对 tool 进行适配开发。而 MCP 提供了一套通用的协议，免去了重复开发工具的问题，大大降低了工具使用的复杂度。

MCP 目前有三种通讯方式：STDIO（Standard Input/Output）、SSE（Server-Sent Events，基于 HTTP 的单向数据流传输方式）和 StreamableHttp。Mcp Client 和 Mcp Server 部署在同一台机器上，通过标准输入输出通信的方式就是 STDIO 模式。部署在不同机器通过 Http 请求通信就是 SSE 模式和 StreamableHttp 模式。STDIO 因为在本地运行，是绝对安全的；但 SSE 和 StreamableHttp 模式若暴露连接方式，可能会有安全问题。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256132426.png)
cherryStudio 中连接类型设置

2025 年 3 月 26 日，Anthropic 在 MCP 规范中正式弃用 SSE 传输，全面转向 StreamableHttp。为什么要用 StreamableHttp 替换 SSE？SSE 的原理是 MCP Client 与 MCP Server 通过 HTTP 建立 SSE 长链接，之后 MCP Server 就可以不断向 Client 发送数据，而不需要每次都进行三次握手；MCP Client 可以主动关闭 SSE 长链接。问题在于 SSE 的整个通讯过程都需要依赖 SSE 长链接，一旦出现网络毛刺（短暂中断），那么 MCP Server 向 MCP Client 发送的数据就会丢失，并且 MCP Server 无法感知到数据的丢失。而 Streamable 方式中，MCP Server 可以感知到数据丢失，连接恢复时可以持续地将没有发送给 MCP Client 的数据再次发送，保证长链接的高可用性。

随着 MCP 的流行，其社区也不断壮大，出现了越来越多符合 MCP 的工具，相关平台也在积极适配 MCP 模块。（mcp.so、魔搭社区）MCP 就是模型进行工具调用的未来。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256132597.png)

  mcp.so

## 1.3. agent + MCP 快速上手

没有使用过 MCP 的同学可以按照以下步骤快速上手体验一下，非常简单。

1. 首先需要一个 AI 对话客户端。ideaLab 就是这样的产品，但 ideaLab 目前不支持 STDIO 模式。市场上现在有大量的客户端，我们选择 Cherry Studio 快速体验。首先安装客户端。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256132762.png)

Cherry Studio 官网

2. 安装完成后，点击设置 -- 模型服务 -- 添加。随便填写 “提供商名称”。若使用 ideaLab 的 sk，提供商类型选择默认的 OpenAI。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256132949.png)

3. 添加完成后，输入 ideaLab 的 sk，填入 API 地址。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256133103.png)

4. 点击模型平台中的 “添加”，这里需要填入模型 ID。进入 ideaLab 提供的模型清单，复制模型 ID，填入即可。注意，选择的模型必须要有工具调用能力。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256133255.png)

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256133399.png)

ideaLab 模型清单

5. 点击 “助手”，选择配置的模型，测试连通性。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256133556.png)

6. 回到设置，选择 “MCP 设置”，点击添加服务器 -- 快速创建。（若需要安装依赖，跟着客户端教程无脑安装即可）

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256133728.png)

7. 配置 MCP Server。这里以魔搭社区提供的文件系统服务为例。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256133892.png)
魔搭社区

8. 进入后可以看到服务提供的工具，我们以 stdio 方式安装。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256134059.png)

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256134242.png)

9. 点击助手 --MCP 设置，选择刚才配置好的 MCP Server。（再次强调，模型必须要有工具调用能力）

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256134390.png)

10. 测试工具调用效果。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256134537.png)

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256134699.png)

实际体验后，不知道大家有没有体会到 MCP 的作用：MCP Client 使用统一的配置方式，可以快速接入各种各样的工具。没有工具调用能力的 agent，最多就是充当「百科全书」的角色。而当 agent 可以进行工具调用，就可以把 agent 当作是一个「人」来看待了。工具调用大大拓展了 agent 的能力边界，它可以像我们一样写文件或是操作浏览器。那么上述的看报表场景痛点，或许可以通过 agent + MCP 的方式解决。

## 1.4. 浏览器操作探索过程

### 1.4.1. 服务选择

浏览器相关的 MCP Server 主要分为以下两类：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256134858.png)

playwright-mcp：一个模型上下文协议（MCP）服务器，利用 Playwright 提供浏览器自动化功能。该服务器使大型语言模型能够通过结构化的可访问性快照与网页进行交互，无需依赖截图或视觉调优模型。目前仍在活跃更新中。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256135038.png)
playwright Releases 版本

其提供的工具列表如下，可以直接在 github 中查看：

<table><tbody><tr><td><p><span data-cangjie-key="368:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="368:0"><span leaf=""><span textstyle="">能力</span></span></span></p></td><td><p><span data-cangjie-key="373:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="373:0"><span leaf=""><span textstyle="">工具</span></span></span></p></td><td><p><span data-cangjie-key="378:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="378:0"><span leaf=""><span textstyle="">解释</span></span></span></p></td></tr><tr><td rowspan="18"><p><span data-cangjie-key="433:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="433:0"><span leaf=""><span textstyle="">核心自动化功能</span></span></span></p></td><td><p><span data-cangjie-key="438:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="438:0"><span leaf=""><span textstyle="">browser_click</span></span></span></p></td><td><p><span data-cangjie-key="443:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="443:0"><span leaf=""><span textstyle="">点击操作</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="455:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="455:0"><span leaf=""><span textstyle="">browser_close</span></span></span></p></td><td><p><span data-cangjie-key="460:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="460:0"><span leaf=""><span textstyle="">关闭浏览器</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="472:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="472:0"><span leaf=""><span textstyle="">browser_console_messages</span></span></span></p></td><td><p><span data-cangjie-key="477:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="477:0"><span leaf=""><span textstyle="">获取控制台消息</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="489:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="489:0"><span leaf=""><span textstyle="">browser_drag</span></span></span></p></td><td><p><span data-cangjie-key="494:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="494:0"><span leaf=""><span textstyle="">按住鼠标左键进行拖拽</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="506:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="506:0"><span leaf=""><span textstyle="">browser_evaluate</span></span></span></p></td><td><p><span data-cangjie-key="511:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="511:0"><span leaf=""><span textstyle="">评估 JavaScript</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="523:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="523:0"><span leaf=""><span textstyle="">browser_file_upload</span></span></span></p></td><td><p><span data-cangjie-key="528:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="528:0"><span leaf=""><span textstyle="">上传文件</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="540:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="540:0"><span leaf=""><span textstyle="">browser_hover</span></span></span></p></td><td><p><span data-cangjie-key="545:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="545:0"><span leaf=""><span textstyle="">将鼠标悬停在页面上的某元素</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="557:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="557:0"><span leaf=""><span textstyle="">browser_navigate</span></span></span></p></td><td><p><span data-cangjie-key="562:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="562:0"><span leaf=""><span textstyle="">导航到指定 URL</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="574:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="574:0"><span leaf=""><span textstyle="">browser_navigate_back</span></span></span></p></td><td><p><span data-cangjie-key="579:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="579:0"><span leaf=""><span textstyle="">返回上一页</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="591:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="591:0"><span leaf=""><span textstyle="">browser_navigate_forward</span></span></span></p></td><td><p><span data-cangjie-key="596:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="596:0"><span leaf=""><span textstyle="">前进到下一页</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="608:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="608:0"><span leaf=""><span textstyle="">browser_network_requests</span></span></span></p></td><td><p><span data-cangjie-key="613:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="613:0"><span leaf=""><span textstyle="">获取所有网络请求</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="625:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="625:0"><span leaf=""><span textstyle="">browser_press_key</span></span></span></p></td><td><p><span data-cangjie-key="630:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="630:0"><span leaf=""><span textstyle="">模拟键盘操作</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="642:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="642:0"><span leaf=""><span textstyle="">browser_resize</span></span></span></p></td><td><p><span data-cangjie-key="647:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="647:0"><span leaf=""><span textstyle="">调整浏览器窗口大小</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="659:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="659:0"><span leaf=""><span textstyle="">browser_select_option</span></span></span></p></td><td><p><span data-cangjie-key="664:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="664:0"><span leaf=""><span textstyle="">在下拉列表选择选项</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="676:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="676:0"><span leaf=""><span textstyle="">browser_snapshot</span></span></span></p></td><td><p><span data-cangjie-key="681:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="681:0"><span leaf=""><span textstyle="">获取页面快照</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="693:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="693:0"><span leaf=""><span textstyle="">browser_take_screenshot</span></span></span></p></td><td><p><span data-cangjie-key="698:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="698:0"><span leaf=""><span textstyle="">截图</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="710:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="710:0"><span leaf=""><span textstyle="">browser_type</span></span></span></p></td><td><p><span data-cangjie-key="715:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="715:0"><span leaf=""><span textstyle="">在可编辑元素中输入文本</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="727:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="727:0"><span leaf=""><span textstyle="">browser_wait_for</span></span></span></p></td><td><p><span data-cangjie-key="732:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="732:0"><span leaf=""><span textstyle="">等待文本出现或消失，或等待指定时间</span></span></span></p></td></tr><tr><td rowspan="4"><p><span data-cangjie-key="745:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="745:0"><span leaf=""><span textstyle="">标签页管理</span></span></span></p></td><td><p><span data-cangjie-key="750:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="750:0"><span leaf=""><span textstyle="">browser_tab_close</span></span></span></p></td><td><p><span data-cangjie-key="755:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="755:0"><span leaf=""><span textstyle="">关闭标签页</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="767:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="767:0"><span leaf=""><span textstyle="">browser_tab_list</span></span></span></p></td><td><p><span data-cangjie-key="772:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="772:0"><span leaf=""><span textstyle="">列出标签页</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="784:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="784:0"><span leaf=""><span textstyle="">browser_tab_new</span></span></span></p></td><td><p><span data-cangjie-key="789:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="789:0"><span leaf=""><span textstyle="">打开新标签页</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="801:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="801:0"><span leaf=""><span textstyle="">browser_tab_select</span></span></span></p></td><td><p><span data-cangjie-key="806:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="806:0"><span leaf=""><span textstyle="">选择标签页</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="813:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="813:0"><span leaf=""><span textstyle="">浏览器安装</span></span></span></p></td><td><p><span data-cangjie-key="818:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="818:0"><span leaf=""><span textstyle="">browser_install</span></span></span></p></td><td><p><span data-cangjie-key="823:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="823:0"><span leaf=""><span textstyle="">安装配置中指定的浏览器</span></span></span></p></td></tr><tr><td rowspan="3"><p><span data-cangjie-key="836:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="836:0"><span leaf=""><span textstyle="">基于坐标</span></span></span></p><p><span data-cangjie-key="839:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="839:0"><span leaf=""><span textstyle="">使用 --caps=vision 开启</span></span></span></p></td><td><p><span data-cangjie-key="844:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="844:0"><span leaf=""><span textstyle="">browser_mouse_click_xy</span></span></span></p></td><td><p><span data-cangjie-key="849:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="849:0"><span leaf=""><span textstyle="">点击指定坐标</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="861:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="861:0"><span leaf=""><span textstyle="">browser_mouse_drag_xy</span></span></span></p></td><td><p><span data-cangjie-key="866:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="866:0"><span leaf=""><span textstyle="">按住鼠标左键，拖拽到指定坐标</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="878:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="878:0"><span leaf=""><span textstyle="">browser_mouse_move_xy</span></span></span></p></td><td><p><span data-cangjie-key="883:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="883:0"><span leaf=""><span textstyle="">把鼠标移动到指定坐标</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="890:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="890:0"><span leaf=""><span textstyle="">PDF 生成</span></span></span></p><p><span data-cangjie-key="893:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="893:0"><span leaf=""><span textstyle="">使用 --caps=pdf 开启</span></span></span></p></td><td><p><span data-cangjie-key="898:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="898:0"><span leaf=""><span textstyle="">browser_pdf_save</span></span></span></p></td><td><p><span data-cangjie-key="903:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="903:0"><span leaf=""><span textstyle="">将页面另存为 PDF</span></span></span></p></td></tr></tbody></table>

测试 playwright-mcp 的效果，还是以 cherry studio 举例。

1. 在设置 --MCP 服务器中，添加一个服务器，类型选择「stdio」，命令输入「npx」，写入参数如图。-y 可以让 agent 自动进行工具调用而无需等待用户同意；@playwright/mcp@0.0.27 指定安装的工具及版本，也可以指定 @playwright/mcp@latest；--headless 开启无头模式，agent 的浏览器操作不会打开一个可见的浏览器，如果想要看浏览器的调用过程就移除这个参数。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256135214.png)

2. 回到聊天助手页面，打开 MCP 服务器，选择刚才配置好的 MCP Server。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256135378.png)

3. 让 agent 总结网页内容，效果如下。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256135528.png)

### 1.4.2. 环境准备

若要在项目环境中使用 agent 和 mcp 服务，需要以下准备。

1. 工程 dockerFile 中需安装 playwright，并解决大量的依赖问题。（也可以新建 docker，但只能用 sse 或 streamableHttp 模式）

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256135707.png)

2.Java 工程中需要使用 Spring-Ai 或 Spring-Ai-Alibaba 框架进行 Agent 开发。创建 MCP Client 时需确保是无头模式且要指定 playwright 的无头浏览器路径。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256135873.png)

### 1.4.3. agent 构建

有了工具的支持，就可以设置定时任务让 agent 看报表了。对于不同的报表场景，定时时间、具体的网页操作、要关注的指标、联系人等都各不相同。对数据类型进行划分，主要分为以下两类。

<table><tbody><tr><td><p><span data-cangjie-key="976:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="976:0"><span leaf=""><span textstyle="">配置类</span></span></span><span data-cangjie-key="976:3" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="976:3"><span leaf=""><span textstyle="">：</span><span textstyle="">触发 agent</span></span></span></p></td><td><p><span data-cangjie-key="981:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="981:0"><span leaf=""><span textstyle="">补充信息类</span></span></span><span data-cangjie-key="981:5" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="981:5"><span leaf=""><span textstyle="">：</span><span textstyle="">agent 拿到后执行具体任务与生成结果</span></span></span></p></td></tr><tr><td><p><span data-cangjie-key="988:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="988:0"><span leaf=""><span textstyle="">模型相关配置（选择什么模型，模型的温度）、定时时间、触发提示词。如图就是一段期望每天早上 09:30 执行的场景配置。</span></span></span></p><p><span data-cangjie-key="991:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="991:0"></span><span data-cangjie-void="true" data-block-uuid="mdgsdynhwjh4p00bpd9" data-cangjie-key="992"><span data-testid="editor-image-real-box" data-image-cangjie-key="992"><span leaf=""></span></span></span></p><div class="sr-rd-content-center"><img class="" src="https://mmbiz.qpic.cn/mmbiz_jpg/Z6bicxIx5naJelSoVkgGuDF89LPUY8dBDjzdsnC6XibVHYrHuicasB9PnTqN8jFDP06FqZzwpvdVKYM2NyKH2tw3Q/640?wx_fmt=other&amp;from=appmsg#imgIndex=29"></div><span></span><span data-cangjie-key="995:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="995:0"></span><p></p></td><td><p><span data-cangjie-key="1003:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="1003:0"><span leaf=""><span textstyle="">不同场景的工作流、要打开的 url、浏览器窗口大小、结果标题与内容格式、规定异常数据、具体示例等。</span></span></span></p><p><span data-cangjie-key="1009:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="1009:0"></span><span data-cangjie-void="true" data-block-uuid="mdgsdynh6z23ldkvk8x" data-cangjie-key="1010"><span data-testid="editor-image-real-box" data-image-cangjie-key="1010"><span leaf=""></span></span></span></p><div class="sr-rd-content-center"><img class="" src="https://mmbiz.qpic.cn/mmbiz_jpg/Z6bicxIx5naJelSoVkgGuDF89LPUY8dBDXvMBfCMLric2Yq0yzOXFknXTCticoL48hqkemibUfx3nnLWqe8hDfmAKQ/640?wx_fmt=other&amp;from=appmsg#imgIndex=30" style="width: auto;"></div><span></span><span data-cangjie-key="1013:0" data-cangjie-leaf="true" data-cangjie-mark="true" data-testid="1013:0"></span><p></p></td></tr></tbody></table>

构建系统提示词时，先使用 agent 生成一个提示词框架（[Agent 构建：Prompt 工程、工作流设计与知识库优化实战](https://mp.weixin.qq.com/s?__biz=MzIzOTU0NTQ0MA==&mid=2247552381&idx=1&sn=966dfc91ab7e75d349fcc82f0713ab04&scene=21#wechat_redirect)），然后基于 agent 的行为与结果不断调整。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256136022.png)

最开始构建时，我把不同的场景全部放到了系统提示词中，通过 mermaid 的选择节点来区分不同的场景，如下图。但随着场景的增多，会导致流程描述越来越复杂，这种方案肯定是不行的。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256136206.png)

于是想到把不同场景的不同信息保存到向量数据库中，但向量数据库更适合保存非结构化文本。现在需要保存的是不同场景的元数据信息，不太适合保存到向量数据库中。于是尝试把数据保存到关系型数据库中，表结构中我设置了 keywords 列，用户提问后 agent 会先查询 keywords，进行语意匹配，返回最适合的 id，再查询 id 对应的其他信息。若没有匹配的 keywords，则按照用户提供的信息进行任务，这一步其实就是 RAG 做的事情。流程如下。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256136365.png)

若担心 agent 生成危险的 sql，也可以直接在系统提示词中写好需要执行的 sql，并且创建一个只用来让 agent 调用的数据库，不要直接让 agent 调用线上的库表，降低风险。

### 1.4.4. 消息推送

消息推送可以在工程中结合钉钉机器人实现。只需要在知识库（数据库）中配置好场景结果的联系人工号或群 id，让 agent 按照指定 JSON 格式返回结果，工程解析后就可以实现钉钉消息推送。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256136539.png)

为了避免把消息发送给无关的人或群，在 Switch 中配置工号 / 群号白名单，工程中作强校验。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256136705.png)

### 1.4.5. 已有场景介绍

目前有如下三个场景已验证且稳定执行，并且有其他场景待接入：

1. 每天 09:30 查看某报表是否存在异常数据（指定日环比小于 - 20%），如果有异常数据，就发送钉钉消息给相应负责人。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256136862.png)

2. 大促上线时，每半小时查看某任务的的执行情况并在群中播报。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256137028.png)

3. 每天 11:00 查看报表某指标，若小于 90%，则打开另一个指定页面，筛选后关闭开关。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256137180.png)

### 1.4.6. 问题汇总

使用过程中遇到的问题如下：

1. 浏览器窗口大小会影响快照结果。基于实际经验设置窗口大小为 3840*2160 可以满足大部分场景。也可以在提示词中说 “为了获取完整结果，你需要调整合适的窗口大小”。

2. 表格数据容易出现数据错乱的情况，可能需要在 examples 中模拟表格数据。需要在灵活性与准确性中找到平衡点。

3. 提示词中约束 agent 可以获取的快照内容，如 “遵守快照内容最小获取原则”。否则容易导致 token 直接超出限制。

4. 提示词中限制失败重试最大次数，否则 agent 可能会重复调用失败方法。如 “若某操作执行失败，重试三次之后换一种操作方式。若仍然失败，则结束任务”。

5. 浏览器操作最后一定要关闭浏览器。playwright 执行新任务会默认打开新的浏览器窗口，若不关闭，可能出现资源泄漏和端口冲突问题。

6. 钉钉 markdown 消息不支持表格类型，不适合返回大量数据的场景。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256137392.png)

### 1.4.7. Agent 看报表与 FBI 播报对比

对比如下表。总体来说，前者可以不局限于 FBI 平台，任何页面都可以通过 agent + playwright-mcp 的方式进行操作处理，并且可以轻松获取页面的数据。但若只是定时播报，直接使用 FBI 的播报能力即可。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256137540.png)

# 二、Agent 批量建任务

## 1.1. 业务背景与问题

在大促与日常切换时，运营会在某平台基于 excel 的内容进行批量任务的创建与暂停操作。目前存在以下痛点：

1. 任务量过多，任务的配置都不相同，每次操作需一小时左右。

2. 需人肉对比 excel 中的任务与线上的任务，判断哪些任务应该新增创建、哪些任务应该修改，且要找到所有不存在于 excel 中的任务并暂停。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256137681.png)

在这个背景下，尝试引入 agent，期望让 agent 基于 excel 和已有的任务自动生成结果，解放人力。

## 1.2. Agent 批量建任务探索过程

### 1.2.1. 能力尝试：只让 Agent 处理最简单的场景

首先只考虑最简单的情况，试验可行性：对于上传的所有任务，统一按照新增处理。通过工程解析 excel，在 ideaLab 中配置 agent，并在提示词中增加字段转换规则（即将 excel 的字段内容转换为枚举值）和补充信息规则（即给每个任务添加默认属性和默认值），agent 处理流程图如下。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256137834.png)

在该场景下，任务范围需要由 agent 调用工具并基于一定规则进行匹配。可以在 ideaLab 中添加工具实现。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256137989.png)

最终效果如下。Agent 可以完成该场景下的 “NL2Task” 任务。于是继续探索更加复杂的场景。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256138145.png)

### 1.2.2. 初见端倪：完全让 Agent 处理复杂逻辑

现在需要让 agent 处理更加复杂的场景，要对比上传的任务和已经存在的任务。agent 处理流程图如下。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256138336.png)

相比于初版，复杂点在于：

1. 输入 token 更多：需要把已经存在的任务信息全部交给 agent；

2. 处理更加复杂：需要对比每一个上传对象和已有对象，寻找差异；

在与实际业务结合后，出现了以下问题：

1. 运营每次需要处理 50 个左右的任务，若一次性让 agent 处理所有任务，agent 的回答速度非常慢且质量很差；

2. 小二工作台限制 HSF 方法等待时间最大为 60s 且不支持 sse，无法保证 agent 在规定时间内完成响应；

解决方式如下：

1. 拆分任务，并发调用。经过测试，调用 ideaLab 的 agent 请求接口最多支持 10 并发；

2. 从同步等待改为异步轮询，将 agent 结果保存到 redis 中；

虽然拆分了任务，减少了每次处理的任务数量，但是我在调试时发现输入 token 数量非常庞大，一次调用就需要 4w 左右，再加上我把任务拆成了十份，那么调用一次成本就在 40000/1000*0.1*10=40 元左右。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256138499.png)

成本问题无法避免。并且因为 token 输入过多，模型响应速度很慢，平均在 25s 左右才会进行首次响应。且我花费了大量时间调整提示词，生成的结果依旧无法保证比较高的准确性，包括但不限于字段转换错误、范围匹配错误、漏处理任务等问题。

现在回过头来重新考虑这个场景：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256138661.png)

前面三点，工程不仅可以干，而且处理的更精准，更快！换句话说，这个事情本来就应该工程做，强行让 agent 做，耗费大量精力和财力，最终效果也是差到无法交付的地步！

### 1.2.3. 各取所长：工程 + agent 结合高效处理

最终对流程进行重构，工程处理除了任务范围的所有工作，agent 处理流程图如下。任务范围因为要根据 excel 的内容基于规则进行语意匹配，还是适合 agent 处理。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256138806.png)

最终 agent 只干一件事情，减少了输入输出 token，提高了响应速度和回答质量，再结合工程保障准确性，效果非常好。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256138972.png)

# 三、总结

以上两个场景都将 agent 与工程进行结合并作用于实际业务场景中，目的是为了利用 Agent 提效。但第二个场景起初让 agent 做了不适合的工作，反而降低了效率。以下列出 agent 和工程的能力对比。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757256139123.png)

agent 的本质还是概率游戏，它并不是万能的，千万不要把任何场景问题都一股脑全部丢给 agent，期望它可以给出一个完美的结果。现阶段的最优策略是将 agent 与工程结合使用，扬长避短。在做技术方案时，要充分考虑每一环适合用什么工具解决。在具体实践时，若发现方向不对且尝试调整过后仍然得不到比较好的结果，就及时更换方向，不要死磕。只有准确理解各种技术的边界和长处，才能构建出真正高效、稳健的解决方案。

# 参考链接

*   大模型 MCP 更高效的通信：StreamableHTTP 协议： https://blog.csdn.net/zhangzhentiyes/article/details/147855601
*   playwright-mcp： https://github.com/microsoft/playwright-mcp
*   魔搭社区： https://modelscope.cn/mcp
*   Cherry Studio： https://www.cherry-ai.com/
