---
title: "How we built our multi-agent research system - Anthropic"
date: 2025-09-15 20:58:53
categories: AI
tags:
- Agent智能体
description: "Anthropic官方技术文章，详细介绍了Claude研究功能背后的多智能体系统架构。文章分享了从原型到生产环境的工程实践经验，包括系统架构设计、工具设计和提示工程三大核心领域。重点阐述了协调器-工作者模式、子智能体的上下文隔离优势、评估方法以及生产环境中的可靠性挑战，为构建生产级多智能体系统提供了宝贵的实战经验。"
---

# 译文

>我们的研究功能使用多个Claude智能体，更有效地探索复杂主题。我们分享了构建此系统所面临的工程挑战和学到的经验教训。

<!-- more -->

> Claude现在具备了[研究能力](https://www.anthropic.com/news/research)，使其能够跨网络、Google Workspace和任何集成进行搜索，以完成复杂的任务。

这个多智能体系统从原型到生产的历程，教会了我们关于系统架构、工具设计和提示工程的关键经验。多智能体系统由多个智能体（LLM在循环中自主使用工具）协同工作组成。我们的研究功能涉及一个智能体，它根据用户查询规划研究过程，然后使用工具创建并行智能体，同时搜索信息。多智能体系统在智能体协调、评估和可靠性方面带来了新的挑战。

本文将分解对我们有效的一些原则——我们希望您在构建自己的多智能体系统时也能发现它们有用。

## 多智能体系统的好处

研究工作涉及开放性问题，很难提前预测所需的步骤。您无法为探索复杂主题硬编码固定路径，因为这个过程本质上是动态且路径依赖的。当人们进行研究时，他们倾向于根据发现不断更新方法，追随调查过程中出现的线索。

这种不可预测性使得AI智能体特别适合研究任务。研究要求在调查展开时，能够灵活地调整方向或探索切线连接。模型必须自主运行多个回合，根据中间发现决定追求哪个方向。线性的、一次性的管道无法处理这些任务。

搜索的本质是压缩：从庞大的语料库中提炼见解。子智能体通过在各自的上下文窗口中并行操作来促进压缩，同时探索问题的不同方面，然后为主要研究智能体浓缩最重要的标记。每个子智能体还提供了关注点分离——不同的工具、提示和探索轨迹——这减少了路径依赖性，并实现了彻底、独立的调查。

一旦智能达到阈值，多智能体系统就成为扩展性能的关键方式。例如，尽管单个人类在过去10万年中变得更加智能，但人类社会在信息时代的能力却呈_指数级_增长，这得益于我们的_集体_智能和协调能力。即使是普遍智能的智能体，作为个体运行时也会面临限制；智能体群体可以完成更多任务。

我们的内部评估显示，多智能体研究系统在需要同时追求多个独立方向的广度优先查询方面表现尤为出色。我们发现，以Claude Opus 4作为主智能体、Claude Sonnet 4作为子智能体的多智能体系统，在我们的内部研究评估中，比单智能体Claude Opus 4的性能高出90.2%。例如，当被要求识别信息技术S&P 500公司所有董事会成员时，多智能体系统通过将任务分解给子智能体找到了正确答案，而单智能体系统则通过缓慢的顺序搜索未能找到答案。

多智能体系统之所以有效，主要是因为它们有助于花费足够的标记来解决问题。在我们的分析中，三个因素解释了[BrowseComp](https://openai.com/index/browsecomp/)评估（测试浏览智能体定位难以找到信息的能力）中95%的性能差异。我们发现，标记使用本身解释了80%的差异，工具调用次数和模型选择是另外两个解释因素。这一发现验证了我们的架构，该架构将工作分配给具有独立上下文窗口的智能体，以增加并行推理的能力。最新的Claude模型是标记使用效率的巨大乘数，因为升级到Claude Sonnet 4比将Claude Sonnet 3.7的标记预算翻倍能带来更大的性能提升。多智能体架构有效地扩展了超出单个智能体限制的任务的标记使用。

也有缺点：实际上，这些架构会快速消耗标记。在我们的数据中，智能体通常比聊天交互多使用约4倍的标记，而多智能体系统比聊天多使用约15倍的标记。为了经济可行性，多智能体系统需要任务的价值足够高，以支付增加的性能成本。此外，一些需要所有智能体共享相同上下文或涉及智能体之间许多依赖关系的领域，目前不适合多智能体系统。例如，大多数编码任务比研究任务的真正并行化程度较低，而且LLM智能体在实时协调和委托给其他智能体方面尚未表现出色。我们发现，多智能体系统擅长涉及大量并行化、超出单个上下文窗口的信息以及与众多复杂工具交互的有价值任务。

## 研究的架构概览

我们的研究系统采用多智能体架构，使用协调器-工作器模式，其中主智能体协调过程，同时委托给并行操作的专业子智能体。

![image-20250916151338217](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/image-20250916151338217.png)



当用户提交查询时，主智能体分析查询，制定策略，并生成子智能体以同时探索不同方面。如上图所示，子智能体充当智能过滤器，通过迭代使用搜索工具收集信息（在本例中是关于2025年AI智能体公司），然后将公司列表返回给主智能体，以便其汇总最终答案。

使用检索增强生成（RAG）的传统方法采用静态检索。也就是说，它们获取一组与输入查询最相似的块，并使用这些块生成响应。相比之下，我们的架构使用多步搜索，动态查找相关信息，适应新发现，并分析结果以形成高质量的答案。

![image-20250916152014190](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/image-20250916152014190.png)



## 研究智能体的提示工程和评估

多智能体系统与单智能体系统有关键区别，包括协调复杂性的快速增长。早期的智能体犯了错误，例如为简单查询生成50个子智能体，无休止地在网上搜索不存在的来源，以及通过过多的更新互相干扰。由于每个智能体都由一个提示引导，提示工程是我们改进这些行为的主要手段。以下是我们为提示智能体学到的一些原则：

1.  **像您的智能体一样思考。** 要迭代提示，您必须了解它们的效果。为了帮助我们做到这一点，我们使用[Console](https://console.anthropic.com/)构建了模拟，其中包含我们系统中的精确提示和工具，然后逐步观察智能体的工作。这立即揭示了失败模式：智能体在已经有足够结果时继续工作，使用过于冗长的搜索查询，或选择不正确的工具。有效的提示依赖于开发准确的智能体心智模型，这可以使最具影响力的改变变得显而易见。
2.  **教导协调器如何委派。** 在我们的系统中，主智能体将查询分解为子任务并将其描述给子智能体。每个子智能体都需要一个目标、一个输出格式、关于要使用的工具和来源的指导，以及清晰的任务边界。如果没有详细的任务描述，智能体就会重复工作、留下空白或未能找到必要的信息。我们最初允许主智能体给出简单的、简短的指令，例如“研究半导体短缺”，但发现这些指令通常模糊不清，以至于子智能体误解了任务或执行了与其他智能体完全相同的搜索。例如，一个子智能体探索了2021年的汽车芯片危机，而另外两个子智能体则重复工作调查当前的2025年供应链，没有有效的劳动分工。
3.  **根据查询复杂性调整工作量。** 智能体难以判断不同任务的适当工作量，因此我们在提示中嵌入了缩放规则。简单的事实查找只需要1个智能体进行3-10次工具调用，直接比较可能需要2-4个子智能体进行10-15次调用，而复杂研究可能需要10个以上具有明确分工的子智能体。这些明确的指导方针有助于主智能体高效分配资源，并防止对简单查询过度投入，这是我们早期版本中常见的失败模式。
4.  **工具设计和选择至关重要。** 智能体-工具接口与人机接口同样重要。使用正确的工具是高效的——通常，它是绝对必要的。例如，一个在网上搜索只存在于Slack中的上下文的智能体注定会失败。有了[MCP服务器](https://modelcontextprotocol.io/introduction)让模型访问外部工具，这个问题会变得更加复杂，因为智能体会遇到描述质量差异很大的未见工具。我们给智能体明确的启发式规则：例如，首先检查所有可用工具，将工具使用与用户意图匹配，在网上进行广泛的外部探索，或优先选择专用工具而非通用工具。糟糕的工具描述可能会让智能体走上完全错误的道路，因此每个工具都需要一个独特的目的和清晰的描述。
5.  **让智能体自我改进。** 我们发现Claude 4模型可以成为优秀的提示工程师。当给定一个提示和一种失败模式时，它们能够诊断智能体失败的原因并提出改进建议。我们甚至创建了一个工具测试智能体——当给定一个有缺陷的MCP工具时，它会尝试使用该工具，然后重写工具描述以避免失败。通过数十次测试该工具，该智能体发现了关键的细微差别和错误。这种改进工具人体工程学的方法使未来使用新描述的智能体任务完成时间减少了40%，因为它们能够避免大多数错误。
6.  **先广后窄。** 搜索策略应模仿专家人类研究：先探索全貌，再深入细节。智能体通常默认使用过长、过于具体的查询，导致结果很少。我们通过提示智能体从简短、宽泛的查询开始，评估可用内容，然后逐步缩小范围来对抗这种倾向。
7.  **引导思维过程。** [扩展思考模式](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)，它引导Claude在可见的思考过程中输出额外的标记，可以作为可控的草稿本。主智能体使用思考来规划其方法，评估哪些工具适合任务，确定查询复杂性和子智能体数量，并定义每个子智能体的角色。我们的测试表明，扩展思考改进了指令遵循、推理和效率。子智能体也进行规划，然后在工具结果后使用[交错思考](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking#interleaved-thinking)来评估质量、识别差距并完善其下一个查询。这使得子智能体在适应任何任务时更加有效。
8.  **并行工具调用改变速度和性能。** 复杂的研发任务自然涉及探索许多来源。我们早期的智能体执行顺序搜索，速度慢得令人痛苦。为了提高速度，我们引入了两种并行化：(1) 主智能体并行启动3-5个子智能体，而不是串行；(2) 子智能体并行使用3个以上工具。这些改变使复杂查询的研究时间缩短了高达90%，使研究能够在几分钟内完成更多工作，同时覆盖比其他系统更多的信息。

我们的提示策略侧重于灌输良好的启发式方法，而不是僵化的规则。我们研究了熟练的人类如何处理研究任务，并将这些策略编码到我们的提示中——例如将难题分解为更小的任务，仔细评估来源质量，根据新信息调整搜索方法，以及识别何时应侧重深度（详细调查一个主题）与广度（并行探索多个主题）。我们还通过设置明确的护栏来主动缓解意外的副作用，以防止智能体失控。最后，我们专注于具有可观察性和测试用例的快速迭代循环。

## 智能体的有效评估

良好的评估对于构建可靠的AI应用程序至关重要，智能体也不例外。然而，评估多智能体系统带来了独特的挑战。传统评估通常假设AI每次都遵循相同的步骤：给定输入X，系统应遵循路径Y以产生输出Z。但多智能体系统并非如此运作。即使起点相同，智能体也可能采取完全不同的有效路径来达到目标。一个智能体可能搜索三个来源，而另一个搜索十个，或者它们可能使用不同的工具找到相同的答案。因为我们并不总是知道正确的步骤是什么，所以我们通常不能仅仅检查智能体是否遵循了我们预先规定的“正确”步骤。相反，我们需要灵活的评估方法，既能判断智能体是否达到了正确的结果，又能判断其是否遵循了合理的过程。

**立即开始使用小样本进行评估。** 在智能体开发的早期阶段，变化往往会产生巨大影响，因为有大量的低垂果实。一个提示的微调可能会将成功率从30%提高到80%。在效果如此之大的情况下，您只需几个测试用例就能发现变化。我们从一组大约20个代表真实使用模式的查询开始。测试这些查询通常能让我们清楚地看到变化的影响。我们经常听到AI开发团队延迟创建评估，因为他们认为只有包含数百个测试用例的大型评估才有用。然而，最好立即开始小规模测试，使用几个示例，而不是等到可以构建更全面的评估。

**LLM作为评判者在做得好时可以扩展。** 研究输出很难通过编程方式评估，因为它们是自由格式的文本，很少有单一的正确答案。LLM天然适合对输出进行评分。我们使用了一个LLM评判者，它根据评分标准评估每个输出：事实准确性（声明是否与来源匹配？）、引用准确性（引用的来源是否与声明匹配？）、完整性（是否涵盖了所有请求的方面？）、来源质量（是否使用了主要来源而非低质量的次要来源？）和工具效率（是否合理地使用了正确的工具？）。我们尝试了多个评判者来评估每个组件，但发现单个LLM调用，使用单个提示输出0.0-1.0的分数和通过/失败等级，是最一致且与人类判断相符的。当评估测试用例_确实_有明确答案时，这种方法尤其有效，我们可以使用LLM评判者简单地检查答案是否正确（即，它是否准确列出了研发预算前三名的制药公司？）。使用LLM作为评判者使我们能够可扩展地评估数百个输出。

**人工评估能发现自动化遗漏的问题。** 测试智能体的人会发现评估遗漏的边缘情况。这包括对不寻常查询的幻觉答案、系统故障或微妙的来源选择偏差。在我们的案例中，人工测试人员注意到我们早期的智能体始终选择SEO优化的内容农场，而不是权威但排名较低的来源，如学术PDF或个人博客。在我们的提示中添加来源质量启发式方法有助于解决这个问题。即使在自动化评估的世界中，手动测试仍然至关重要。

多智能体系统具有涌现行为，这些行为是在没有特定编程的情况下产生的。例如，对主智能体的微小更改可能会不可预测地改变子智能体的行为。成功需要理解交互模式，而不仅仅是单个智能体的行为。因此，这些智能体的最佳提示不仅仅是严格的指令，而是定义了劳动分工、问题解决方法和工作量预算的协作框架。要做到这一点，需要仔细的提示和工具设计、可靠的启发式方法、可观察性以及紧密的反馈循环。请参阅[我们Cookbook中的开源提示](https://github.com/anthropics/anthropic-cookbook/tree/main/patterns/agents/prompts)以获取我们系统中的示例提示。

## 生产可靠性和工程挑战

在传统软件中，一个bug可能会破坏某个功能、降低性能或导致中断。在智能体系统中，微小的变化会级联成巨大的行为变化，这使得为必须在长时间运行过程中维护状态的复杂智能体编写代码变得异常困难。

**智能体是有状态的，错误会累积。** 智能体可以长时间运行，在许多工具调用中维护状态。这意味着我们需要持久地执行代码并在此过程中处理错误。如果没有有效的缓解措施，微小的系统故障可能对智能体造成灾难性影响。当发生错误时，我们不能简单地从头开始：重新启动既昂贵又令用户沮丧。相反，我们构建了可以从智能体发生错误的地方恢复的系统。我们还利用模型的智能来优雅地处理问题：例如，让智能体知道工具何时出现故障并让它适应，效果出奇地好。我们将基于Claude构建的AI智能体的适应性与重试逻辑和定期检查点等确定性保障措施结合起来。

**调试受益于新方法。** 智能体做出动态决策，并且在运行之间是非确定性的，即使使用相同的提示也是如此。这使得调试更加困难。例如，用户会报告智能体“找不到明显的信息”，但我们无法看到原因。智能体是否使用了糟糕的搜索查询？选择了劣质来源？遇到了工具故障？添加完整的生产跟踪使我们能够诊断智能体失败的原因并系统地修复问题。除了标准的可观察性之外，我们还监控智能体决策模式和交互结构——所有这些都不监控单个对话的内容，以维护用户隐私。这种高层次的可观察性帮助我们诊断根本原因，发现意外行为，并修复常见故障。

**部署需要仔细协调。** 智能体系统是高度有状态的提示、工具和执行逻辑网络，几乎持续运行。这意味着每当我们部署更新时，智能体可能处于其过程中的任何位置。因此，我们需要防止我们善意的代码更改破坏现有智能体。我们不能同时将每个智能体更新到新版本。相反，我们使用[彩虹部署](https://brandon.dimcheff.com/2018/02/rainbow-deploys-with-kubernetes/)来避免中断正在运行的智能体，通过逐渐将流量从旧版本转移到新版本，同时保持两者同时运行。

**同步执行造成瓶颈。** 目前，我们的主智能体同步执行子智能体，等待每组子智能体完成才能继续。这简化了协调，但在智能体之间的信息流中造成了瓶颈。例如，主智能体无法引导子智能体，子智能体无法协调，并且整个系统可能会在等待单个子智能体完成搜索时被阻塞。异步执行将实现额外的并行性：智能体并发工作并在需要时创建新的子智能体。但这种异步性增加了结果协调、状态一致性和跨子智能体的错误传播方面的挑战。随着模型能够处理更长、更复杂的研究任务，我们预计性能提升将证明这种复杂性是合理的。

## 结论

在构建AI智能体时，最后一英里往往成为整个旅程的大部分。在开发人员机器上运行的代码库需要大量的工程工作才能成为可靠的生产系统。智能体系统中错误的复合性质意味着传统软件中的小问题可能会完全破坏智能体。一个步骤的失败可能导致智能体探索完全不同的轨迹，从而导致不可预测的结果。由于本文中描述的所有原因，原型与生产之间的差距通常比预期的要大。

尽管面临这些挑战，多智能体系统已被证明对开放式研究任务很有价值。用户表示，Claude帮助他们发现了以前未曾考虑的商机，导航复杂的医疗保健选项，解决了棘手的技术错误，并通过发现他们独自无法找到的研究联系节省了数天的工作。多智能体研究系统可以通过精心的工程、全面的测试、注重细节的提示和工具设计、强大的操作实践以及研究、产品和工程团队之间对当前智能体能力有深刻理解的紧密协作，实现可靠的规模化运行。我们已经看到这些系统正在改变人们解决复杂问题的方式。

![image-20250916152302976](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/image-20250916152302976.png)



## 致谢

由Jeremy Hadfield、Barry Zhang、Kenneth Lien、Florian Scholz、Jeremy Fox和Daniel Ford撰写。这项工作反映了Anthropic多个团队的集体努力，他们使研究功能成为可能。特别感谢Anthropic应用程序工程团队，他们的奉献使这个复杂的多智能体系统投入生产。我们还要感谢早期用户提供的宝贵反馈。

## 附录

以下是关于多智能体系统的一些额外杂项提示。

**对在多轮中改变状态的智能体进行终态评估。** 评估在多轮对话中修改持久状态的智能体带来了独特的挑战。与只读研究任务不同，每个动作都可以改变后续步骤的环境，从而创建传统评估方法难以处理的依赖关系。我们发现专注于终态评估而不是逐轮分析是成功的。与其判断智能体是否遵循了特定的过程，不如评估它是否达到了正确的最终状态。这种方法承认智能体可能会找到通往相同目标的替代路径，同时仍确保它们交付预期的结果。对于复杂的工作流，将评估分解为应发生特定状态更改的离散检查点，而不是尝试验证每个中间步骤。

**长周期对话管理。** 生产智能体通常会进行数百轮对话，需要仔细的上下文管理策略。随着对话的延长，标准上下文窗口变得不足，需要智能压缩和记忆机制。我们实施了模式，智能体总结已完成的工作阶段，并将基本信息存储在外部内存中，然后继续执行新任务。当上下文限制接近时，智能体可以生成具有干净上下文的新子智能体，同时通过仔细的交接保持连续性。此外，它们可以从内存中检索存储的上下文，例如研究计划，而不是在达到上下文限制时丢失之前的工作。这种分布式方法可以防止上下文溢出，同时在扩展对话中保持对话连贯性。

**子智能体输出到文件系统以最小化“传话游戏”。** 对于某些类型的结果，子智能体可以直接输出，绕过主协调器，从而提高保真度和性能。与其要求子智能体通过主智能体传达所有信息，不如实现工件系统，让专业智能体可以创建独立持久化的输出。子智能体调用工具将其工作存储在外部系统中，然后将轻量级引用传递回协调器。这可以防止多阶段处理过程中的信息丢失，并减少通过对话历史复制大量输出的标记开销。这种模式特别适用于结构化输出，如代码、报告或数据可视化，其中子智能体的专业提示比通过通用协调器过滤产生更好的结果。

# 原文

>Our Research feature uses multiple Claude agents to explore complex topics more effectively. We share the engineering challenges and the lessons we learned from building this system.

> Claude now has [Research capabilities](https://www.anthropic.com/news/research) that allow it to search across the web, Google Workspace, and any integrations to accomplish complex tasks.

The journey of this multi-agent system from prototype to production taught us critical lessons about system architecture, tool design, and prompt engineering. A multi-agent system consists of multiple agents (LLMs autonomously using tools in a loop) working together. Our Research feature involves an agent that plans a research process based on user queries, and then uses tools to create parallel agents that search for information simultaneously. Systems with multiple agents introduce new challenges in agent coordination, evaluation, and reliability.

This post breaks down the principles that worked for us—we hope you'll find them useful to apply when building your own multi-agent systems.

## Benefits of a multi-agent system

Research work involves open-ended problems where it’s very difficult to predict the required steps in advance. You can’t hardcode a fixed path for exploring complex topics, as the process is inherently dynamic and path-dependent. When people conduct research, they tend to continuously update their approach based on discoveries, following leads that emerge during investigation.

This unpredictability makes AI agents particularly well-suited for research tasks. Research demands the flexibility to pivot or explore tangential connections as the investigation unfolds. The model must operate autonomously for many turns, making decisions about which directions to pursue based on intermediate findings. A linear, one-shot pipeline cannot handle these tasks.

The essence of search is compression: distilling insights from a vast corpus. Subagents facilitate compression by operating in parallel with their own context windows, exploring different aspects of the question simultaneously before condensing the most important tokens for the lead research agent. Each subagent also provides separation of concerns—distinct tools, prompts, and exploration trajectories—which reduces path dependency and enables thorough, independent investigations.

Once intelligence reaches a threshold, multi-agent systems become a vital way to scale performance. For instance, although individual humans have become more intelligent in the last 100,000 years, human societies have become _exponentially_ more capable in the information age because of our _collective_ intelligence and ability to coordinate. Even generally-intelligent agents face limits when operating as individuals; groups of agents can accomplish far more.

Our internal evaluations show that multi-agent research systems excel especially for breadth-first queries that involve pursuing multiple independent directions simultaneously. We found that a multi-agent system with Claude Opus 4 as the lead agent and Claude Sonnet 4 subagents outperformed single-agent Claude Opus 4 by 90.2% on our internal research eval. For example, when asked to identify all the board members of the companies in the Information Technology S&P 500, the multi-agent system found the correct answers by decomposing this into tasks for subagents, while the single agent system failed to find the answer with slow, sequential searches.

Multi-agent systems work mainly because they help spend enough tokens to solve the problem. In our analysis, three factors explained 95% of the performance variance in the [BrowseComp](https://openai.com/index/browsecomp/) evaluation (which tests the ability of browsing agents to locate hard-to-find information). We found that token usage by itself explains 80% of the variance, with the number of tool calls and the model choice as the two other explanatory factors. This finding validates our architecture that distributes work across agents with separate context windows to add more capacity for parallel reasoning. The latest Claude models act as large efficiency multipliers on token use, as upgrading to Claude Sonnet 4 is a larger performance gain than doubling the token budget on Claude Sonnet 3.7. Multi-agent architectures effectively scale token usage for tasks that exceed the limits of single agents.

There is a downside: in practice, these architectures burn through tokens fast. In our data, agents typically use about 4× more tokens than chat interactions, and multi-agent systems use about 15× more tokens than chats. For economic viability, multi-agent systems require tasks where the value of the task is high enough to pay for the increased performance. Further, some domains that require all agents to share the same context or involve many dependencies between agents are not a good fit for multi-agent systems today. For instance, most coding tasks involve fewer truly parallelizable tasks than research, and LLM agents are not yet great at coordinating and delegating to other agents in real time. We’ve found that multi-agent systems excel at valuable tasks that involve heavy parallelization, information that exceeds single context windows, and interfacing with numerous complex tools.

## Architecture overview for Research

Our Research system uses a multi-agent architecture with an orchestrator-worker pattern, where a lead agent coordinates the process while delegating to specialized subagents that operate in parallel.

![image-20250916151338217](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/image-20250916151338217.png)



When a user submits a query, the lead agent analyzes it, develops a strategy, and spawns subagents to explore different aspects simultaneously. As shown in the diagram above, the subagents act as intelligent filters by iteratively using search tools to gather information, in this case on AI agent companies in 2025, and then returning a list of companies to the lead agent so it can compile a final answer.

Traditional approaches using Retrieval Augmented Generation (RAG) use static retrieval. That is, they fetch some set of chunks that are most similar to an input query and use these chunks to generate a response. In contrast, our architecture uses a multi-step search that dynamically finds relevant information, adapts to new findings, and analyzes results to formulate high-quality answers.

![image-20250916152014190](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/image-20250916152014190.png)


## Prompt engineering and evaluations for research agents

Multi-agent systems have key differences from single-agent systems, including a rapid growth in coordination complexity. Early agents made errors like spawning 50 subagents for simple queries, scouring the web endlessly for nonexistent sources, and distracting each other with excessive updates. Since each agent is steered by a prompt, prompt engineering was our primary lever for improving these behaviors. Below are some principles we learned for prompting agents:

1.  **Think like your agents.** To iterate on prompts, you must understand their effects. To help us do this, we built simulations using our [Console](https://console.anthropic.com/) with the exact prompts and tools from our system, then watched agents work step-by-step. This immediately revealed failure modes: agents continuing when they already had sufficient results, using overly verbose search queries, or selecting incorrect tools. Effective prompting relies on developing an accurate mental model of the agent, which can make the most impactful changes obvious.
2.  **Teach the orchestrator how to delegate.** In our system, the lead agent decomposes queries into subtasks and describes them to subagents. Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries. Without detailed task descriptions, agents duplicate work, leave gaps, or fail to find necessary information. We started by allowing the lead agent to give simple, short instructions like 'research the semiconductor shortage,' but found these instructions often were vague enough that subagents misinterpreted the task or performed the exact same searches as other agents. For instance, one subagent explored the 2021 automotive chip crisis while 2 others duplicated work investigating current 2025 supply chains, without an effective division of labor.
3.  **Scale effort to query complexity.** Agents struggle to judge appropriate effort for different tasks, so we embedded scaling rules in the prompts. Simple fact-finding requires just 1 agent with 3-10 tool calls, direct comparisons might need 2-4 subagents with 10-15 calls each, and complex research might use more than 10 subagents with clearly divided responsibilities. These explicit guidelines help the lead agent allocate resources efficiently and prevent overinvestment in simple queries, which was a common failure mode in our early versions.
4.  **Tool design and selection are critical.** Agent-tool interfaces are as critical as human-computer interfaces. Using the right tool is efficient—often, it’s strictly necessary. For instance, an agent searching the web for context that only exists in Slack is doomed from the start. With [MCP servers](https://modelcontextprotocol.io/introduction) that give the model access to external tools, this problem compounds, as agents encounter unseen tools with descriptions of wildly varying quality. We gave our agents explicit heuristics: for example, examine all available tools first, match tool usage to user intent, search the web for broad external exploration, or prefer specialized tools over generic ones. Bad tool descriptions can send agents down completely wrong paths, so each tool needs a distinct purpose and a clear description.
5.  **Let agents improve themselves**. We found that the Claude 4 models can be excellent prompt engineers. When given a prompt and a failure mode, they are able to diagnose why the agent is failing and suggest improvements. We even created a tool-testing agent—when given a flawed MCP tool, it attempts to use the tool and then rewrites the tool description to avoid failures. By testing the tool dozens of times, this agent found key nuances and bugs. This process for improving tool ergonomics resulted in a 40% decrease in task completion time for future agents using the new description, because they were able to avoid most mistakes.
6.  **Start wide, then narrow down.** Search strategy should mirror expert human research: explore the landscape before drilling into specifics. Agents often default to overly long, specific queries that return few results. We counteracted this tendency by prompting agents to start with short, broad queries, evaluate what’s available, then progressively narrow focus.
7.  **Guide the thinking process.** [Extended thinking mode](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking), which leads Claude to output additional tokens in a visible thinking process, can serve as a controllable scratchpad. The lead agent uses thinking to plan its approach, assessing which tools fit the task, determining query complexity and subagent count, and defining each subagent’s role. Our testing showed that extended thinking improved instruction-following, reasoning, and efficiency. Subagents also plan, then use [interleaved thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking#interleaved-thinking) after tool results to evaluate quality, identify gaps, and refine their next query. This makes subagents more effective in adapting to any task.
8.  **Parallel tool calling transforms speed and performance.** Complex research tasks naturally involve exploring many sources. Our early agents executed sequential searches, which was painfully slow. For speed, we introduced two kinds of parallelization: (1) the lead agent spins up 3-5 subagents in parallel rather than serially; (2) the subagents use 3+ tools in parallel. These changes cut research time by up to 90% for complex queries, allowing Research to do more work in minutes instead of hours while covering more information than other systems.

Our prompting strategy focuses on instilling good heuristics rather than rigid rules. We studied how skilled humans approach research tasks and encoded these strategies in our prompts—strategies like decomposing difficult questions into smaller tasks, carefully evaluating the quality of sources, adjusting search approaches based on new information, and recognizing when to focus on depth (investigating one topic in detail) vs. breadth (exploring many topics in parallel). We also proactively mitigated unintended side effects by setting explicit guardrails to prevent the agents from spiraling out of control. Finally, we focused on a fast iteration loop with observability and test cases.

## Effective evaluation of agents

Good evaluations are essential for building reliable AI applications, and agents are no different. However, evaluating multi-agent systems presents unique challenges. Traditional evaluations often assume that the AI follows the same steps each time: given input X, the system should follow path Y to produce output Z. But multi-agent systems don't work this way. Even with identical starting points, agents might take completely different valid paths to reach their goal. One agent might search three sources while another searches ten, or they might use different tools to find the same answer. Because we don’t always know what the right steps are, we usually can't just check if agents followed the “correct” steps we prescribed in advance. Instead, we need flexible evaluation methods that judge whether agents achieved the right outcomes while also following a reasonable process.

**Start evaluating immediately with small samples**. In early agent development, changes tend to have dramatic impacts because there is abundant low-hanging fruit. A prompt tweak might boost success rates from 30% to 80%. With effect sizes this large, you can spot changes with just a few test cases. We started with a set of about 20 queries representing real usage patterns. Testing these queries often allowed us to clearly see the impact of changes. We often hear that AI developer teams delay creating evals because they believe that only large evals with hundreds of test cases are useful. However, it’s best to start with small-scale testing right away with a few examples, rather than delaying until you can build more thorough evals.

**LLM-as-judge evaluation scales when done well.** Research outputs are difficult to evaluate programmatically, since they are free-form text and rarely have a single correct answer. LLMs are a natural fit for grading outputs. We used an LLM judge that evaluated each output against criteria in a rubric: factual accuracy (do claims match sources?), citation accuracy (do the cited sources match the claims?), completeness (are all requested aspects covered?), source quality (did it use primary sources over lower-quality secondary sources?), and tool efficiency (did it use the right tools a reasonable number of times?). We experimented with multiple judges to evaluate each component, but found that a single LLM call with a single prompt outputting scores from 0.0-1.0 and a pass-fail grade was the most consistent and aligned with human judgements. This method was especially effective when the eval test cases _did_ have a clear answer, and we could use the LLM judge to simply check if the answer was correct (i.e. did it accurately list the pharma companies with the top 3 largest R&D budgets?). Using an LLM as a judge allowed us to scalably evaluate hundreds of outputs.

**Human evaluation catches what automation misses.** People testing agents find edge cases that evals miss. These include hallucinated answers on unusual queries, system failures, or subtle source selection biases. In our case, human testers noticed that our early agents consistently chose SEO-optimized content farms over authoritative but less highly-ranked sources like academic PDFs or personal blogs. Adding source quality heuristics to our prompts helped resolve this issue. Even in a world of automated evaluations, manual testing remains essential.

Multi-agent systems have emergent behaviors, which arise without specific programming. For instance, small changes to the lead agent can unpredictably change how subagents behave. Success requires understanding interaction patterns, not just individual agent behavior. Therefore, the best prompts for these agents are not just strict instructions, but frameworks for collaboration that define the division of labor, problem-solving approaches, and effort budgets. Getting this right relies on careful prompting and tool design, solid heuristics, observability, and tight feedback loops. See the [open-source prompts in our Cookbook](https://github.com/anthropics/anthropic-cookbook/tree/main/patterns/agents/prompts) for example prompts from our system.

## Production reliability and engineering challenges

In traditional software, a bug might break a feature, degrade performance, or cause outages. In agentic systems, minor changes cascade into large behavioral changes, which makes it remarkably difficult to write code for complex agents that must maintain state in a long-running process.

**Agents are stateful and errors compound.** Agents can run for long periods of time, maintaining state across many tool calls. This means we need to durably execute code and handle errors along the way. Without effective mitigations, minor system failures can be catastrophic for agents. When errors occur, we can't just restart from the beginning: restarts are expensive and frustrating for users. Instead, we built systems that can resume from where the agent was when the errors occurred. We also use the model’s intelligence to handle issues gracefully: for instance, letting the agent know when a tool is failing and letting it adapt works surprisingly well. We combine the adaptability of AI agents built on Claude with deterministic safeguards like retry logic and regular checkpoints.

**Debugging benefits from new approaches.** Agents make dynamic decisions and are non-deterministic between runs, even with identical prompts. This makes debugging harder. For instance, users would report agents “not finding obvious information,” but we couldn't see why. Were the agents using bad search queries? Choosing poor sources? Hitting tool failures? Adding full production tracing let us diagnose why agents failed and fix issues systematically. Beyond standard observability, we monitor agent decision patterns and interaction structures—all without monitoring the contents of individual conversations, to maintain user privacy. This high-level observability helped us diagnose root causes, discover unexpected behaviors, and fix common failures.

**Deployment needs careful coordination.** Agent systems are highly stateful webs of prompts, tools, and execution logic that run almost continuously. This means that whenever we deploy updates, agents might be anywhere in their process. We therefore need to prevent our well-meaning code changes from breaking existing agents. We can’t update every agent to the new version at the same time. Instead, we use [rainbow deployments](https://brandon.dimcheff.com/2018/02/rainbow-deploys-with-kubernetes/) to avoid disrupting running agents, by gradually shifting traffic from old to new versions while keeping both running simultaneously.

**Synchronous execution creates bottlenecks.** Currently, our lead agents execute subagents synchronously, waiting for each set of subagents to complete before proceeding. This simplifies coordination, but creates bottlenecks in the information flow between agents. For instance, the lead agent can’t steer subagents, subagents can’t coordinate, and the entire system can be blocked while waiting for a single subagent to finish searching. Asynchronous execution would enable additional parallelism: agents working concurrently and creating new subagents when needed. But this asynchronicity adds challenges in result coordination, state consistency, and error propagation across the subagents. As models can handle longer and more complex research tasks, we expect the performance gains will justify the complexity.

## Conclusion

When building AI agents, the last mile often becomes most of the journey. Codebases that work on developer machines require significant engineering to become reliable production systems. The compound nature of errors in agentic systems means that minor issues for traditional software can derail agents entirely. One step failing can cause agents to explore entirely different trajectories, leading to unpredictable outcomes. For all the reasons described in this post, the gap between prototype and production is often wider than anticipated.

Despite these challenges, multi-agent systems have proven valuable for open-ended research tasks. Users have said that Claude helped them find business opportunities they hadn’t considered, navigate complex healthcare options, resolve thorny technical bugs, and save up to days of work by uncovering research connections they wouldn't have found alone. Multi-agent research systems can operate reliably at scale with careful engineering, comprehensive testing, detail-oriented prompt and tool design, robust operational practices, and tight collaboration between research, product, and engineering teams who have a strong understanding of current agent capabilities. We're already seeing these systems transform how people solve complex problems.

![image-20250916152302976](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/image-20250916152302976.png)



## Acknowlegements

Written by Jeremy Hadfield, Barry Zhang, Kenneth Lien, Florian Scholz, Jeremy Fox, and Daniel Ford. This work reflects the collective efforts of several teams across Anthropic who made the Research feature possible. Special thanks go to the Anthropic apps engineering team, whose dedication brought this complex multi-agent system to production. We're also grateful to our early users for their excellent feedback.

## Appendix

Below are some additional miscellaneous tips for multi-agent systems.

**End-state evaluation of agents that mutate state over many turns.** Evaluating agents that modify persistent state across multi-turn conversations presents unique challenges. Unlike read-only research tasks, each action can change the environment for subsequent steps, creating dependencies that traditional evaluation methods struggle to handle. We found success focusing on end-state evaluation rather than turn-by-turn analysis. Instead of judging whether the agent followed a specific process, evaluate whether it achieved the correct final state. This approach acknowledges that agents may find alternative paths to the same goal while still ensuring they deliver the intended outcome. For complex workflows, break evaluation into discrete checkpoints where specific state changes should have occurred, rather than attempting to validate every intermediate step.

**Long-horizon conversation management.** Production agents often engage in conversations spanning hundreds of turns, requiring careful context management strategies. As conversations extend, standard context windows become insufficient, necessitating intelligent compression and memory mechanisms. We implemented patterns where agents summarize completed work phases and store essential information in external memory before proceeding to new tasks. When context limits approach, agents can spawn fresh subagents with clean contexts while maintaining continuity through careful handoffs. Further, they can retrieve stored context like the research plan from their memory rather than losing previous work when reaching the context limit. This distributed approach prevents context overflow while preserving conversation coherence across extended interactions.

**Subagent output to a filesystem to minimize the ‘game of telephone.’** Direct subagent outputs can bypass the main coordinator for certain types of results, improving both fidelity and performance. Rather than requiring subagents to communicate everything through the lead agent, implement artifact systems where specialized agents can create outputs that persist independently. Subagents call tools to store their work in external systems, then pass lightweight references back to the coordinator. This prevents information loss during multi-stage processing and reduces token overhead from copying large outputs through conversation history. The pattern works particularly well for structured outputs like code, reports, or data visualizations where the subagent's specialized prompt produces better results than filtering through a general coordinator.
