---
title: "好文解读：面向 AI Agent 的有效上下文工程 from Anthropic"
date: 2025-10-10 00:00:00
categories: AI
tags:
- 上下文工程
- 提示工程
- Anthropic
- Agent架构
- 动态检索
- 上下文压缩
- 子智能体
- Claude
- Agent智能体
description: "本文解读Anthropic关于上下文工程的技术文章，系统阐述了上下文工程与提示工程的本质区别。文章详细介绍了有效上下文的构造方法，包括动态检索、压缩技术、结构化笔记记录和子智能体架构等核心策略。通过Claude Code的实践经验，展示了如何在推理过程中管理和维护最佳信息的策略集，为Agent开发者提供了从提示工程进阶到上下文工程的完整指南。"
---

随着大模型能力的快速发展，人们对大语言模型的使用方式越来越多的从简单的 ChatBot，变成了各种 Agent，而一个新的术语——上下文工程（Context Engineering），也逐步取代了提示工程（Prompt Engineering）。

<!-- more -->

最近 Anthropic 发表了一篇文章，分享了他们在上下文工程上的探索，本文基于原文做了适当解读，大家可以点击 “阅读原文” 查看官方原始文章（Effective context engineering for AI agents）。

# 上下文工程和提示工程的区别

简单来说，提示工程重点关注的是为了获得最佳结果而编写和组织的 LLM 指令的方法，各种在公众号、B 站、小红书上所介绍的如何在某一款软件中输入特定的指令从而能够获得某种效果的方法，都属于提示工程，它通常涉及需要完成的任务、任务的背景信息、如何更好的完成任务、哪些是禁止的、受众是谁等，例如如何使用 AI 写文章、如何去除 AI 味、如何使用豆包生成特定的图片等。

而上下文工程指的是，在 LLM 推理过程中，如何管理和维护要输入给 LLM 的**最佳信息**的**策略集**，之所以叫信息，而没有叫 Prompt 或者提示语，是因为在上下文工程中，除了涉及给 LLM 安排任务，还涉及到工具、当前任务所需要的参考资料、之前交互过程中的记忆等，参考资料和记忆其实也看做是背景信息，但与提示工程中背景信息的区别是他们通常是随任务动态变化的，我们以用户输入 “帮我调研一下新能源车目前的发展状况，并根据调研情况对未来的发展趋势做一个判断” 为例，对比提示工程和上下文工程的区别：

*   **提示工程**：豆包、元宝之类的软件所能接收到的**全部输入**就是 “帮我调研一下新能源车目前的发展状况，并根据调研情况对未来的发展趋势做一个判断”，如果开启了联网搜索可能会搜索一些背景信息，然后把这些信息送入大模型，让大模型直接生成调研报告，这个地方可能存在的问题包括：
    
*   报告的受众是什么
    
*   报告的篇幅是多少
    
*   行文风格是什么
    
*   是只调研与提问语言相同的地区对应市场的发展情况，还是全球
    
*   报告所引用的参考文件需不需要再核实一下信息源的权威性
    
*   ……
    

*   **上下文工程**：用户输入问题后，Agent 首先会尝试理解问题，检查用户问题是否需要澄清，如果不需要，则可能会开启如下流程：
    
*   检索 Agent 的记忆，获取用户对报告生成的偏好
    
*   根据用户意图组织不同的工具列表，对于报告生成最常用的可能就是网络搜索、获取网络正文，除此以外一般还有文件系统读写、TODO 读写等
    
*   组织 System Prompt，告知模型要完成什么任务、哪些是硬性约束、哪些是尽量避免的、工具使用原则、输出结果格式等
    
*   如果用户在提问时提供了额外的参考资料，或者用户知识库中有对应的领域知识，加入模型上下文
    
*   将这些上下文送入模型后，根据模型响应来调整上下文，包括移除部分工具、移除不需要的参考资料、对历史消息压缩等，并发起下一轮 LLM 调用
    

简而言之，提示工程更多的是说，作为一个用户，我该怎么组织输入，才能用好大模型，普通用户是可能会涉及的，只要你能够根据你的输入、大模型的响应来调整你的输入，让结果变得更好，那你就是在做提示工程的事情。

而上下文工程，更多的是某个 Agent 产品背后所用到的技术，普通用户是不会接触到的，同样是为了让结果变得更好，但它会使用更多的技术手段来组织模型的输入（上下文），涉及到更广阔的调整空间，因此会更底层，它主要是由 Agent 开发人员来进行的。

下图是 Anthropic 给出的提示工程和上下文工程的对比图：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/4dafaf4934e23f60aa6680d4b7154e0bf2c12a01.png)

对提示工程而言，使用编写好的提示语（Prompt）通常在一个轮次就可以得到结果，而上下文工程是迭代性的，它通常需要根据 LLM 的响应动态组织上下文，大家使用 Manus、扣子空间之类的这些产品时，看它很忙碌的样子，背后就经历了多个轮次的上下文调整，而这些上下文该以什么方式进行调整，背后对应的就是上下文工程。

# 上下文工程没做好会有什么问题

简单说，可能会**答非所问**、**结果不理想**，就好像你让 Agent 帮你写新能源车方面的调研报告，结果它给你输出了一篇 “当前该买什么车” 的文章。这个问题的底层原因在于，虽然大模型的长上下文能力越来越强（可以参考[使用 RAG 技术构建企业级文档问答系统：生成优化 (1) 超长上下文 LLM vs. RAG](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496920&idx=1&sn=62ce630357ac083d5d2b1096a626e252&scene=21#wechat_redirect) 了解这个能力的评估方式），但当你给它输入越来越长时，它会在某个点失去注意力，就像一个思维混乱的领导，一直在给下属安排任务，说了几个小时，下属很有可能在某个时间点懵了——这领导到底要让我干啥。

# 有效上下文应该是什么结构

简而言之，有效的上下文应该是不长不短，恰到好处。在这里有两个极端：

*   一个极端是过于复杂、脆弱的逻辑，期望能够让 Agent 精确按期望行动，但这种方式通常会造成脆弱性，一旦条件不满足，则会呈现垮塌的态势，而且随着时间推移会增加复杂性，比如 “帮我判断一下这个句子好不好，如果... 那么，如果... 那么，如果... 那么，如果... 那么，如果... 那么，如果... 那么，如果... 那么……”，作为一个人看到如此复杂的指令，恐怕都很难不出错
    
*   另一个极端是过于模糊、高层次的指示，比如 “帮我判断一下这句话好不好”
    

Anthropic 建议将提示语（这里更多的是指系统提示语 System Prompt）组织成不同的部分，比如 `<background_information>` 、 `<instructions>` 、 `## Tool guidance` 、 `## Output description` 等，并使用 XML 标签或 Markdown 标题等技术来区分这些部分。

无论怎么构建系统提示语，都应该完整地概述你的预期行为，这是最核心的信息。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/7f0116e8d9e86aff5035d3a4c652f5949e74a16c.png)

Anthropic 在实践中观察到，构建 Agent 最常见的失败模式之一是工具集冗余，导致模型在工具选择上出现困难。**如果人类工程师在给定相关信息后无法判断该什么工具，那也别指望人工智能做得有多好。**

提示样例，或者小样本提示（Few Shot），是一种众所周知的最佳实践，联想上面提到的过于复杂、脆弱的逻辑，开发者倾向于往提示中加入各种边缘判断情况，试图把 LLM 在特定情况下应遵循的所有规则都加入进去，Anthropic 不建议这样做，建议使用提示样例。

# 如何构造有效的上下文

这里的核心，是需要对上下文做动态检索。

Claude Code 的实践经验就是，将所有需要的数据进行预先处理，模型上下文中只保留这些处理结果的标识符（例如文件路径、存储插叙、网页链接等），让智能体采用按需取用的方式，通过工具动态将数据加载到上下文中。

这样会使上下文的使用效率很高，同时，放入上下文的引用元数据，还提供了额外的信息，例如文件夹的层级结果、文件名、时间戳等，它能帮助人类和 Agent 理解何时该如何使用信息。

让 Agent 自主探索和检索数据，还能实现额外的好处，例如文件大小通常暗示了文件的复杂性（越大的文件越复杂）、命名规范暗示了文件的用途（例如 test.py 结尾的文件可能是测试文件），这些信息，都可以让 Agent 在运行时自主探索，逐渐理解，仅在上下文中保留必要的信息，避免上下文被大量可能无关的信息淹没。

当然这种动态导航和探索的方式也不是没有缺点，最主要的一点就是，它会比直接加载预计算好的信息慢。

Anthropic 的实践是采用混合策略，像 CLAUDE.md（里面一般会有开发需要用到的配置信息、开发规范等）这样的文件，会直接加载入上下文，而其他信息，则会在需要的时候，通过 glob、grep 等工具动态检索。

混合策略算是效率和效果的一种平衡，可以理解成高频要用的信息，直接加载入上下文，不要再浪费时间探索了，低频信息采用动态检索的方式，这跟计算机压缩算法中，高频字符用短编码，低频信息用长编码的做法真是有异曲同工之妙。

## 压缩

压缩是指对接近模型最大上下文长度时对对话进行内容总结，并重新初始化一个新的上下文窗口。压缩通常作为上下文工程的第一种手段，以提升长期连贯性。其核心在于以高保真方式提炼上下文窗口的内容，使智能体能够以最小的性能下降继续执行。

像在 Claude Code 中，就会在上下文长度达到模型最大上下文长度的 92% 时自动压缩，通过将消息历史传递给模型来实现这一点，以总结和压缩最关键的信息。模型保留了架构决策、未解决的错误和实现细节，同时丢弃了冗余的工具输出或消息。

压缩的艺术在于选择保留什么与丢弃什么，因为过于激进的压缩可能导致后来才显现重要性的关键的上下文信息丢失。对于实施压缩系统的工程师，建议在复杂的 Agent 构建时仔细调整 Prompt。调整 Prompt 时，首先从确保压缩后能最大化召回所有相关信息开始，然用开始迭代，通过逐步删除冗余内容的方式来提高精确度。

这个方法挺值得借鉴的，因为很难一次性写出一个完美的压缩 Prompt，甚至你可能都不知道该怎么评价这个 Prompt 的好坏，这里给出的方法就是把目标分解成先确保信息少丢失（最大化召回），再权衡（还要精准），给出了一个清晰可操作的流程。 有点像分类模型调整分类阈值，先保 Recall，然后开始提高分类阈值，让 Precision 升高、Recall 下降别太多，来寻找一个最佳决策点。

一个可摘取的低垂果实是，清理工具调用和调用结果，为什么？因为调用工具通常是为了使用工具调用结果，一般大模型都会根据 System Prompt 中的指令对工具调用结果做处理（可以阅读[动手学 Agent：工具使用 (2) 工具使用基础](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497276&idx=1&sn=cec52ba78302e067eb80deb3b1c74c1d&scene=21#wechat_redirect)来了解工具调用基础流程），既然已经有了模型处理结果，那原始的工具调用、工具调用结果信息就不再需要了，可以直接清除。

## 结构化笔记记录

结构化笔记记录，或代理式记忆，是一种技术，其中代理定期将笔记保存在上下文窗口之外的存储（例如硬盘）中，这些笔记在稍后会被拉回上下文窗口。

把大模型的上下文窗口想象成电脑的内存，把上下文窗口之外的存储想象成硬盘，就好理解了，跟电脑内存不足，把内存中的页先交换到硬盘的真是一样一样的。

像有些介绍 Cursor、Roo Code、Claude Code 的教程，一开始先让 Agent 生成需求文档、设计文档和待办事项，并写入硬盘的做法，都属于这一类，在后续某个步骤需要这些内容时，再加载回上下文。

此处不知道大家有没有疑问，把原来一整段的内容先写入硬盘，需要的时候再读取回来放入上下文，上下文窗口不一样会变长吗，跟直接放到上下文中有啥区别？核心是 Agent 一般都会有文件读写的工具，而文件读取后，在大模型消化完这个信息后，读取的内容就可以丢弃了（回想一下上面提到的清理工具调用结果的部分），举个例子就好理解了，比如代码智能体前期做好了系统设计，并将设计文档写入了硬盘，等开始实现用户管理模块时，它只需要先检索到这部分内容（或者粗暴点，直接整个设计文档加载入上下文），那么当智能体将用户管理模块编码完成后，这个设计文档的内容就可以移出上下文了，所以这种按需取用的方式，可以显著降低上下文占用。

## 子智能体架构

原文中所说的这种子智能体架构模式（Sub-agent architectures），是多智能体架构中常见的一种设计方式，它通常由主智能体（Orchestrator）、子智能体组成。由主智能体分拆协调任务、子智能体处理特定任务。

这种架构最核心的作用是**上下文隔离**，这种方式从某种角度上看其实是扩大了模型所能支持的最大上下文长度，相当于把之前巨长、可能已经超过模型最大输入长度的上下文，分成了不同的部分，每个部分都不会超长，同时缓解了信息过载对模型造成的认知负担。

通过给每个智能体组织不同的上下文，让它集中所有能力解决它的问题，从而可以带来比单智能体更好的效果。

当然它的实现也是有挑战的，否则现在所有的智能体架构都是多智能体架构了，比如有如下几点：

*   **任务拆分**：主智能体在向各子智能体安排任务时，如何做到不重不漏，任务依赖关系合理，重复以外这更长的耗时和更多的 token 消耗，遗漏意味着最终任务可能无法完成，依赖关系不合理意味着某个智能体可能会存在信息缺失风险
    
*   **上下文传递**：主智能体安排了若干子智能体完成不同的任务，如何很好地将子智能体的结果传递给别的子智能体，比如编写一份调研报告时，报告撰写智能体已经完成了初版报告，审阅智能体看到后提出意见 “调研报告不够全面，为什么报告中有中国市场、日韩市场、欧洲市场、东南亚市场相关的调研结果，没有北美市场的”，它不知道的是，报告撰写智能体其实调研了北美市场，只是没有找到相关信息
    
*   **结果整合**：任务拆解让各子任务完成时，肯定是希望最终解决用户原始问题的，但各子智能体的处理结果，很有可能互相之间是没有关联的，比如目标是开发一个 FlappyBird 游戏，一个子智能体负责生成能够上下移动不断前进的小鸟，一个负责生成有一些烟囱的草坪，当这两者整合时，发现生成草坪的智能体，生成的是类似超级马里奥那样的草坪，两者根本无法整合（案例来自 https://cognition.ai/blog/dont-build-multi-agents）
    

# 结语

上下文工程目前还是一个快速发展的技术领域，用好它，可以激发出大模型的巨大潜能，正如 Andrej Karpathy 所说：上下文工程是一种微妙的艺术和科学（a delicate art and science）。

## 往期文章
### 动手学Agent

[动手学Agent：基础概念](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497186&idx=1&sn=440f8ebb411edb5c63ff9ab88a1a0ee8&scene=21#wechat_redirect)

[动手学Agent：Agent设计模式(1)](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497201&idx=1&sn=460b05da2b175ae4f5a970d20c4cf355&scene=21#wechat_redirect)

[动手学Agent：Agent设计模式(2)构建有效Agent的7种模型](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497214&idx=1&sn=c65d5720b206a1084cb463b23750140e&scene=21#wechat_redirect)

[动手学Agent：综合实战(1)使用ChatBI MCP Server构建数据洞察助手](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497246&idx=1&sn=598df83c24c07efd1eb2a0aa440c15d9&scene=21#wechat_redirect)

[动手学Agent：工具使用(2)工具使用基础&强制模型选择特定工具](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497276&idx=1&sn=cec52ba78302e067eb80deb3b1c74c1d&scene=21#wechat_redirect)

[动手学Agent：工具使用(3)流式工具调用](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497295&idx=1&sn=162095fae5cbd7bc0b931bc74a551f9e&scene=21#wechat_redirect)

[动手学Agent：工具使用(4)在不支持工具调用的模型上进行工具调用](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497298&idx=1&sn=95a4041c907246c8d15ce301ddd79116&scene=21#wechat_redirect)

[动手学Agent：工具使用(5)MCP工具调用](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497307&idx=1&sn=f31ac6d48df457912a2ea8b8085fcd22&scene=21#wechat_redirect)

[动手学Agent：综合实战(1)使用ChatBI MCP Server构建数据洞察助手](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497246&idx=1&sn=598df83c24c07efd1eb2a0aa440c15d9&scene=21#wechat_redirect)

[动手学Agent：评估(1)什么样的问题能难住GPT-5这样的“博士 ”](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497259&idx=1&sn=a374389b864309ded326fdf1d292184b&scene=21#wechat_redirect)

### RAG系列文章

**数据准备**

[使用RAG技术构建企业级文档问答系统之QA抽取](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496784&idx=1&sn=94a1afc05728f0c7d8cf92004125f392&chksm=a58df21692fa7b00104850fe8dfb287acb78f149df77bff7f7d23cc7d18c3998814f08924d8a&scene=21#wechat_redirect)  

**Baseline**

[使用RAG技术构建企业级文档问答系统之基础流程](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496795&idx=1&sn=811b9c2ff34d1c3f11a1bf47f3a87976&chksm=a58df21d92fa7b0bdcf9ecaef70c9bb4d5831c760a5b26288ff0e35d06f15d6a087c7d690844&scene=21#wechat_redirect)  

**评估**

[使用TruLens进行评估](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496805&idx=1&sn=ddfa5fa9b3c058b41cbca90b0297399c&chksm=a58df22392fa7b3530de0884c840c69527b1fda4f36424be6dfa834f210b248b53b016f98d7b&scene=21#wechat_redirect)  

[使用GPT4进行评估](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496813&idx=1&sn=69b1525dd341091330c76d2d233c3c22&chksm=a58df22b92fa7b3d4044e2acc3837f51ad58b3bbef5ffdd3f4d5119cddabbb84b554390751cc&scene=21#wechat_redirect)

**解析优化 **

[解析(1)使用MinerU将PDF转换为Markdown](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497083&idx=1&sn=4d8aed607cb04207569845588a5c60a5&scene=21#wechat_redirect)

**切分优化**

[切分(1)Markdown文档切分](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497098&idx=1&sn=519c8dccd59f6b5162ba11774022248f&scene=21#wechat_redirect)  

[切分(2)使用Embedding进行语义切分](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497107&idx=1&sn=a57c019fac629ca26a0f1c9fc8f28a18&scene=21#wechat_redirect)  

[切分(3)使用Jina API进行语义切分](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497115&idx=1&sn=91549f3c6f26bd7bafa1cb9444d40454&scene=21#wechat_redirect)  

[切分(4)Meta Chunking](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497123&idx=1&sn=e8bd46682fd93cff3a0e8d00e34921e4&scene=21#wechat_redirect)  

[切分(5)Late Chunking](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497149&idx=1&sn=adabc6f4dc45c7d54c314b442e7dca76&scene=21#wechat_redirect)  

**检索优化**  

[检索优化(1)Embedding微调](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496824&idx=1&sn=3c7eb89e239f5bc8d7ebb08c098f084c&chksm=a58df23e92fa7b2894b33aed714d2bbfae9003ab4986ce41c36cd82ebc0877e387c130f20720&scene=21#wechat_redirect)  

[检索优化(2)Multi Query](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496837&idx=1&sn=e89257464af2995d898cf43292d1f17f&chksm=a58df3c392fa7ad53befb4555b2b8dd1d9609600bdbebf91c65f157dff4f33ab2f47dbe40fbe&scene=21#wechat_redirect)  

[检索优化(3)RAG Fusion](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496845&idx=1&sn=0d9d781b2a525c76c5b013cac9ce3141&chksm=a58df3cb92fa7add707fa7a997c7895c8f8aabac50d2fab58cda32ee519428a908de804a184a&scene=21#wechat_redirect)  

[检索优化(4)BM25和混合检索](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496869&idx=1&sn=882a0b22a9242601d14bf5048f630cf2&chksm=a58df3e392fa7af56d1b9725e05330b1a708ce0d790214961d0c7b16d0bbde1054eac80fcfa9&scene=21#wechat_redirect)  

[检索优化(5) 常用Rerank对比](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496875&idx=1&sn=fa271451ec8fb2529002aceeb2c56898&chksm=a58df3ed92fa7afb82e66d58f380e18b9dba2a23a7a1a68cf508feb0a7b7f48804221b110240&scene=21#wechat_redirect)  

[检索优化(6) Rerank模型微调](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496884&idx=1&sn=7b4a54db6160058c756efbd04517885f&chksm=a58df3f292fa7ae40f387bd5a4fb91dfd5442d1ff89a7bec91f0e29249acd1af82da31ee390f&scene=21#wechat_redirect)  

[检索优化(7)HyDE](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496890&idx=1&sn=16fef23858c2c7019e35a43984a26a32&chksm=a58df3fc92fa7aea5f65ef7f46fcb0959922ec2cdbf2168806d6d6f4afe1452c9c53bdeebf02&scene=21#wechat_redirect)  

[检索优化(8)Step-Back Prompting](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496897&idx=1&sn=ada84a73ba20bbade030336e37ff5e08&chksm=a58df38792fa7a91d25e9b63c6c55befb1064bef5cc56b6e35ad09427649dcb84ffcdd9dca66&scene=21#wechat_redirect)

[检索优化(9)Parent Document Retriever](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496904&idx=1&sn=d01c04e71dc531fe74ba9e8ecfeb156d&chksm=a58df38e92fa7a985ec1b707c2900e630280d3765122f9f7a54bb15589458fefb09dcd72471e&scene=21#wechat_redirect)

[检索优化(10)上下文压缩](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496910&idx=1&sn=2176ab2744eccb7eee402e4862b44ad6&chksm=a58df38892fa7a9ebc2387e5349af5a5d02a92a66c1bae8c5b21be6b71c0086559481a3d1912&scene=21#wechat_redirect)

[检索优化(11)上下文片段数调参](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496935&idx=1&sn=20186aafbb76d9bd47d6b096b1daaf47&chksm=a58df3a192fa7ab701ad9c1112e419db89435f994beb91ebd30efc4241cd3273613f1b74fd37&scene=21#wechat_redirect)  

[检索优化(12)RAPTOR](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496960&idx=1&sn=77486cd190db3104703153c06bc81f9d&scene=21#wechat_redirect)  

[检索优化(13)Contextual Retrieval](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497061&idx=1&sn=cc7055151ec15b7e6a25e141256098db&scene=21#wechat_redirect)

[检索优化(14)CRAG——自动判断是否联网检索的RAG](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497071&idx=1&sn=b57faef271850c101165b785cca630e3&scene=21#wechat_redirect)  

**生成优化**  

[生成优化(1)超长上下文LLM vs. RAG](http://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257496920&idx=1&sn=62ce630357ac083d5d2b1096a626e252&chksm=a58df39e92fa7a887014011c82bc44d58192a930e2ff93c37b299e9dc9078a26327eda7addaa&scene=21#wechat_redirect)

[生成优化(2)使用Unsloth对LLM进行微调](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497177&idx=1&sn=46c61c28b658f8dd8191c61245f13ee4&scene=21#wechat_redirect)

**新架构**  

[新架构(1)LightRAG](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497139&idx=1&sn=8437eeb224433fdcc15f8a7e03bad41c&scene=21#wechat_redirect)

[新架构(2)HippoRAG 2](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497157&idx=1&sn=caf32d80f7a58613e7d761f5d4a92873&scene=21#wechat_redirect)  

[新架构(3)借助DeepSeek R1的反思型RAG](https://mp.weixin.qq.com/s?__biz=MjM5NTQ3NTg4MQ==&mid=2257497165&idx=1&sn=e21e34e4383b4d4d3a7763464a4a7271&scene=21#wechat_redirect)