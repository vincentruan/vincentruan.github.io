---
title: "Agent 实战教程：LangGraph 中工作流与智能体区别与实现"
date: 2025-09-07 00:00:00
categories: AI
tags:
- LangGraph
- 智能体开发
- 工作流模式
- 提示词链
- 并行处理
- 编排者-工作者模式
- Agent实战
- Agent智能体
- Agent开发
description: "本文基于Anthropic的《Building Effective Agents》，详细讲解LangGraph中的工作流与智能体模式。工作流是预定义代码路径的LLM和工具编排系统，智能体是LLM动态指导自身流程的系统。文章涵盖提示词链、路由、并行化、编排者-工作者、评估者-优化器五种工作流模式，以及智能体的实现方式，为开发者提供Graph API和Functional API两种实现途径。"
---

本教程将探讨智能体系统常见的几种模式。在描述这些系统时，区分 “工作流” 和“智能体 (Agent)” 会很有帮助。Anthropic 在其博客文章《构建高效智能体》中很好地解释了二者之间的区别：

<!-- more -->

https://langchain-ai.github.io/langgraph/tutorials/workflows/#evaluator-optimizer

工作流是指通过预定义代码路径，对大型语言模型（LLM）和工具进行编排的系统。 而智能体则指的是大型语言模型能够动态地指导自身流程和工具使用，并掌控任务完成方式的系统。

以下是一个简单的可视化图示，展现了这些差异：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255922454.png)

原文在此： https://langchain-ai.github.io/langgraph/tutorials/workflows/

在构建智能体和工作流时，LangGraph 提供了诸多优势，包括**持久化、流式传输，以及对调试和部署的支持**。

# **设置对话模型**

我们可以使用任何支持结构化输出和工具调用的聊天模型。下面以 DeepSeek 为例，演示了安装软件包、设置 API 密钥以及测试结构化输出和工具调用的过程。

安装依赖项：

```shell

pip install langchain_core langchain-deepseek langgraph

```

初始化一个大型语言模型（LLM）。

API 参考资料：**ChatDeepSeek**

```python
import getpass
import os

from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek
load_dotenv()


def _set_env(var: str):
    ifnot os.environ.get(var):
        os.environ[var] = getpass.getpass(f"{var}: ")


_set_env("DEEPSEEK_API_KEY")

llm = ChatDeepSeek(model="deepseek-chat")



```

# **构建模块：增强型大型语言模型（LLM）**

大型语言模型（LLM）通过增强功能支持工作流和智能体的构建。这些增强功能包括结构化输出和工具调用，如下图所示（摘自 Anthropic 文章《Building Effective Agents》）：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255922546.png)

augmented_llm.png

```python
# 结构化输出的 Schema (模式)
from pydantic import BaseModel, Field

class SearchQuery(BaseModel):
    search_query: str = Field(None, description="为网络搜索优化过的查询。")
    justification: str = Field(
        None, description="说明此查询与用户请求的相关性。"
    )

# 使用结构化输出的 schema 增强 LLM
structured_llm = llm.with_structured_output(SearchQuery)

# 调用增强后的 LLM
output = structured_llm.invoke("钙化分数（Calcium CT score）与高胆固醇之间有什么关系？")# 定义一个工具
print(output)

```

模型输出如下：

```python
search_query='钙化分数 Calcium CT score 高胆固醇 关系 相关性' justification='搜索钙化分数与高胆固醇之间的直接关系和相关研究'


```

我们可以看到大模型通过结构化输出字段的描述，帮我生成两个字段对应的值

下面是使用工具增强大模型能力

```python
def multiply(a: int, b: int) -> int:
    return a * b

# 使用工具增强 LLM
llm_with_tools = llm.bind_tools([multiply])

# 调用 LLM，输入触发工具调用
msg = llm_with_tools.invoke("2 乘以 3 是多少？")

# 获取工具调用的输出

print(msg.tool_calls)

```

工具调用输出结果如下：

```json

[{'name': 'multiply', 'args': {'a': 2, 'b': 3}, 'id': 'call_0_d0a37fbd-3b1f-49b1-b115-9e76784f364f', 'type': 'tool_call'}]

```

# **提示词的链式调用**

在提示词链式调用中，每个大型语言模型（LLM）的调用都会处理**前一个调用的输出**。

正如 Anthropic 博客文章《Building Effective Agents》中所述：

提示词链式调用将一个任务分解成一系列步骤，其中每个大型语言模型（LLM）的调用都会处理前一个调用的输出。你可以在任何中间步骤添加程序化检查（参见下图中的 “门控”），以确保流程仍在正轨。

适用场景：这种工作流非常适合任务能够轻松、清晰地分解为固定子任务的情况。主要目标是通过让每个 LLM 调用成为一个更简单的任务，平衡延迟与更高的准确性。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255922706.png)


**Graph API**

```python
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from IPython.display import Image, display


# 图状态
class State(TypedDict):
    topic: str
    joke: str
    improved_joke: str
    final_joke: str


# 节点
def generate_joke(state: State):
    """第一次 LLM 调用，生成初始笑话"""

    msg = llm.invoke(f"写一个关于{state['topic']}的短笑话")
    return {"joke": msg.content}


def check_punchline(state: State):
    """门控函数，检查笑话是否有包袱"""

    # 简单检查 - 笑话是否包含"?"或"!"
    if"?"in state["joke"] or"!"in state["joke"]:
        return"Pass"
    return"Fail"


def improve_joke(state: State):
    """第二次 LLM 调用，改进笑话"""

    msg = llm.invoke(f"通过添加双关语让这个笑话更有趣: {state['joke']}")
    return {"improved_joke": msg.content}


def polish_joke(state: State):
    """第三次 LLM 调用，进行最终润色"""

    msg = llm.invoke(f"给这个笑话添加一个出人意料的转折: {state['improved_joke']}")
    return {"final_joke": msg.content}


# 构建工作流
workflow = StateGraph(State)

# 添加节点
workflow.add_node("generate_joke", generate_joke)
workflow.add_node("improve_joke", improve_joke)
workflow.add_node("polish_joke", polish_joke)

# 添加边以连接节点
workflow.add_edge(START, "generate_joke")
workflow.add_conditional_edges(
    "generate_joke", check_punchline, {"Fail": "improve_joke", "Pass": END}
)
workflow.add_edge("improve_joke", "polish_joke")
workflow.add_edge("polish_joke", END)

# 编译
chain = workflow.compile()

# 显示工作流
display(Image(chain.get_graph().draw_mermaid_png()))
png_data=chain.get_graph().draw_mermaid_png()
# 保存PNG格式
with open("workflow_graph.png", "wb") as f:
    f.write(png_data)



# 调用
state = chain.invoke({"topic": "猫"})
print("初始笑话:")
print(state["joke"])
print("\n--- --- ---\n")
if"improved_joke"in state:
    print("改进后的笑话:")
    print(state["improved_joke"])
    print("\n--- --- ---\n")
    print("最终笑话:")
    print(state["final_joke"])
else:
    print("笑话未能通过质量门检查 - 未检测到包袱！")



```

输出如下：

```
初始笑话: 好的，这里有一个关于猫的短笑话：  ---  一个人回到家，发现他的猫正坐在电脑前，爪子飞快地敲着键盘。   他惊讶地问：“你在干什么？”   猫头也不回地答：“别吵，我在给你写差评。”   人更疑惑了：“为什么？我对你不好吗？”   猫冷冷地说：“你买的猫粮口味单一，快递送货太慢，晒太阳的窗户角度总差一点，差评！——另外，你昨晚偷偷撸隔壁家的狗，我已经知道了。”    ---  希望这个小笑话能让你开心！ 😸  --- --- ---  改进后的笑话: 好的，我尝试加入一些双关语来提升幽默效果：  ---  一个人回到家，发现他的猫正坐在电脑前，爪子飞快地敲着键盘。   他惊讶地问：“你在干什么？是在给我搞‘爪机’营销吗？”   猫头也不回地答：“别吵，我在给你写‘喵’评（差评）。”   人更疑惑了：“为什么？我对你不够‘喵’（妙）吗？”   猫冷冷地说：“你买的猫粮口味单一，快递送货太慢，晒太阳的窗户角度总差一点，差评！——另外，你昨晚偷偷撸隔壁家的狗，我已经知道了，你这是‘狗’改不了吃屎，但我可是‘猫’怨已久！”    ---  希望这个加强版能让你更开心！ 😸  --- --- ---  最终笑话: 一个人回到家，发现他的猫正坐在电脑前，爪子飞快地敲着键盘。   他惊讶地问：“你在干什么？是在给我搞‘爪机’营销吗？”   猫头也不回地答：“别吵，我在给你写‘喵’评（差评）。”   人更疑惑了：“为什么？我对你不够‘喵’（妙）吗？”   猫冷冷地说：“你买的猫粮口味单一，快递送货太慢，晒太阳的窗户角度总差一点，差评！——另外，你昨晚偷偷撸隔壁家的狗，我已经知道了，你这是‘狗’改不了吃屎，但我可是‘猫’怨已久！”    人正想辩解，猫突然转过身，摘下脸上的金丝眼镜，叹了口气：“其实我是‘喵星人社工局’派来的调查员，你的‘奴籍’考核不及格——现在正式通知你，你被降级为‘实习猫奴’，试用期三个月，并强制参加《如何精准揣摩主子心思》线上课程。”   它推了推眼镜，补充道：“顺便说一句，你刚才回家忘了换鞋踩脏地板，扣十分。”  --- **改写说明**： - **加入身份和规则反转**：将猫设定为具有考核权力的外星或高等机构调查员，赋予故事系统性和出人意料的秩序感。 - **强化结局的惩罚和幽默转折**：通过新增的“实习猫奴”“线上课程”及细节扣分，增强结局的意外性和现实幽默。 - **保留并呼应原有双关和情节**：延续了原文的双关语和矛盾，确保新内容与原有笑话风格衔接自然。  如果您有其他风格或平台方向的偏好，我可以进一步为您调整。

```

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255922835.png)

下面是基于 Function 的实现：**Functional API**

```python
from langgraph.func import entrypoint, task

# 任务
@task
def generate_joke(topic: str):
    """第一次 LLM 调用，生成初始笑话"""
    msg = llm.invoke(f"写一个关于{topic}的短笑话")
    return msg.content

def check_punchline(joke: str):"""门控函数，检查笑话是否有包袱"""
    # 简单检查 - 笑话是否包含"?"或"!"
    if"?"in joke or"!"in joke:
        return"Fail"return"Pass"

@task
def improve_joke(joke: str):
    """第二次 LLM 调用，改进笑话"""
    msg = llm.invoke(f"通过添加双关语让这个笑话更有趣: {joke}")
    return msg.content

@task
def polish_joke(joke: str):
    """第三次 LLM 调用，进行最终润色"""
    msg = llm.invoke(f"给这个笑话添加一个出人意料的转折: {joke}")
    return msg.content

@entrypoint()
def prompt_chaining_workflow(topic: str):
    original_joke = generate_joke(topic).result()
    if check_punchline(original_joke) == "Pass":
        return original_joke

    improved_joke = improve_joke(original_joke).result()
    return polish_joke(improved_joke).result()

# 调用
for step in prompt_chaining_workflow.stream("猫", stream_mode="updates"):
    print(step)
    print("\n")

```

# **并行化**

通过并行化，大型语言模型（LLM）可以同时处理任务：

大型语言模型有时可以同时处理一个任务，并通过程序化方式聚合它们的输出。这种并行化工作流主要有两种变体：分段式并行 (Sectioning)：将任务分解为独立的子任务并行运行。投票式并行 (Voting)：多次运行相同的任务以获得多样化的输出。

适用场景：并行化在以下情况下非常有效：分解后的子任务可以并行执行以提高速度；或者需要多个视角或多次尝试来获得更高置信度的结果。对于包含多方面考虑的复杂任务，当每项考虑都由单独的 LLM 调用处理时，它们通常表现更好，从而能够专注于每个特定方面。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255922905.png)

parallelization.png

**Graph API**

```python
# 图状态
class State(TypedDict):
    topic: str
    joke: str
    story: str
    poem: str
    combined_output: str# 节点
def call_llm_1(state: State):
    """第一次 LLM 调用，生成初始笑话"""

    msg = llm.invoke(f"写一个关于{state['topic']}的笑话")
    return {"joke": msg.content}

def call_llm_2(state: State):
    """第二次 LLM 调用，生成故事"""

    msg = llm.invoke(f"写一个关于{state['topic']}的故事")
    return {"story": msg.content}

def call_llm_3(state: State):
    """第三次 LLM 调用，生成诗歌"""

    msg= llm.invoke(f"写一首关于{state['topic']}的诗歌")
    return {"poem": msg.content}

def aggregator(state: State):
    """将笑话、故事和诗歌合并为单个输出"""

    combined = f"这里有一个关于{state['topic']}的故事、笑话和诗歌!\n\n"
    combined += f"故事:\n{state['story']}\n\n"
    combined += f"笑话:\n{state['joke']}\n\n"
    combined += f"诗歌:\n{state['poem']}"
    return {"combined_output": combined}# 构建工作流
parallel_builder = StateGraph(State)

# 添加节点
parallel_builder.add_node("call_llm_1", call_llm_1)
parallel_builder.add_node("call_llm_2", call_llm_2)
parallel_builder.add_node("call_llm_3", call_llm_3)
parallel_builder.add_node("aggregator", aggregator)

# 添加边以连接节点
parallel_builder.add_edge(START, "call_llm_1")
parallel_builder.add_edge(START, "call_llm_2")
parallel_builder.add_edge(START, "call_llm_3")
parallel_builder.add_edge("call_llm_1", "aggregator")
parallel_builder.add_edge("call_llm_2", "aggregator")
parallel_builder.add_edge("call_llm_3", "aggregator")
parallel_builder.add_edge("aggregator", END)
parallel_workflow = parallel_builder.compile()

# 显示工作流
display(Image(parallel_workflow.get_graph().draw_mermaid_png()))

# 调用
state = parallel_workflow.invoke({"topic":"猫"})
print(state["combined_output"])

```

下面是基于 Function 的实现：

**Functional API**

```python

@task
def call_llm_1(topic: str):
    """第一次 LLM 调用，生成初始笑话"""
    msg= llm.invoke(f"写一个关于{topic}的笑话")
    return msg.content

@task
def call_llm_2(topic: str):
    """第二次 LLM 调用，生成故事"""
    msg = llm.invoke(f"写一个关于{topic}的故事")
    return msg.content

@task
def call_llm_3(topic):
    """第三次 LLM 调用，生成诗歌"""
    msg = llm.invoke(f"写一首关于{topic}的诗歌")
    return msg.content

@task
def aggregator(topic, joke, story,poem):
    """将笑话、故事和诗歌合并为单个输出"""

    combined = f"这里有一个关于{topic}的故事、笑话和诗歌!\n\n"
    combined += f"故事:\n{story}\n\n"
    combined += f"笑话:\n{joke}\n\n"
    combined += f"诗歌:\n{poem}"
    return combined

# 构建工作流
@entrypoint()
def parallel_workflow(topic: str):
    joke_fut = call_llm_1(topic)
    story_fut = call_llm_2(topic)poem_fut = call_llm_3(topic)
    return aggregator(
        topic, joke_fut.result(), story_fut.result(), poem_fut.result()
    ).result()

# 调用for step in parallel_workflow.stream("猫", stream_mode="updates"):
    print(step)
    print("\n")

```

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255922972.png)

输出如下：

```
这里有一个关于猫的故事、笑话和诗歌!  故事: # 猫的巡礼  老陈又一次在半夜惊醒，心脏咚咚敲着胸腔，冷汗浸透了背心。他摸索着打开床头灯，昏黄光线刺得他眯起眼。三年了，自从那场车祸带走妻女，每个夜晚都成了煎熬。  “咪咪？”他习惯性地呼唤，随即想起那只橘猫已经两天没回家了。  屋子里静得可怕。老陈挣扎着起身，倒水时手抖得厉害。医生说是创伤后应激障碍，药开了一堆，却没什么效果。唯有那只三年前突然出现在门口的橘猫，偶尔能让他获得片刻安宁。  第二天清晨，老陈打印了寻猫启事，在小区里张贴。邻居们同情地看着这个佝偻着背的老人，都知道他家的不幸。  “陈叔，我看见您的猫往废弃的老钢厂去了。”小区保安告诉他，“那地方快拆了，野狗多，不安全。”  老陈道了谢，毫不犹豫地往钢厂方向走去。那是城市边缘被遗忘的角落，锈迹斑斑的厂房像巨兽的骨架匍匐在地。  进入厂区后，老陈意外地发现，这里并非只有他一人。几个年轻人拿着相机四处拍摄，记录这座即将消失的工业遗迹。  “大爷，您也是来参观的吗？”一个戴眼镜的年轻人问道。  “我找猫，橘色的，这么大小。”老陈比划着。  年轻人摇摇头表示没看见，但热心地提议：“我们帮您找吧，这地方大，容易迷路。”  老陈本想拒绝，但心脏又开始不适，只好点头同意。年轻人叫来同伴——一个短发女孩和一个高个子男生。他们自我介绍是大学生，来做钢厂最后的影像记录。  搜索过程中，老陈不知不觉讲起了猫的来历：三年前的雨夜，它浑身湿透地蹲在门口，脖子上挂着个小铃铛，眼里仿佛有着与猫不相称的哀伤。  “就像它也知道我失去了什么。”老陈说。  女孩忽然指着前方：“那儿是不是有猫爪印？”  他们跟随若隐若现的痕迹深入厂房。阳光透过破碎的窗玻璃，在积尘的地面上切出明亮的光斑。老陈的气喘越来越重，不得不频繁停下来休息。  “大爷，您脸色不好，要不先回去？我们找到猫给您送过去。”年轻人担心地说。  老陈摇头：“我得亲自找到它。”  他们来到一座高大的车间，空中走廊横跨两侧，机器上覆盖着厚厚的灰尘。就在这里，老陈听见了微弱的铃铛声。  “咪咪！”他呼唤着。  回应他的是猫叫声，从上面的空中走廊传来。老陈不顾劝阻，攀上锈蚀的铁梯。梯子摇摇晃晃，每一步都让人心惊胆战。  到达空中走廊时，老陈看见了它的猫——正在走廊另一端，蹲在一个奇怪的东西旁边。老陈小心地走过去，心脏跳得厉害。  走近后，他倒抽一口气。那是一只破旧的玩具熊，和他女儿生前最爱的那个一模一样。熊旁边放着一个塑料发卡，也是他女儿常戴的款式。  猫轻柔地叫了一声，用头蹭着那些物品。  老陈颤抖着拾起发卡，记忆如潮水涌来。三年前，他们一家曾来这个即将关闭的钢厂参观。女儿那时七岁，对巨大的机器充满好奇，跑来跑去。  “我记得这里了，”老陈喃喃自语，“那天我们还在这条走廊上拍了照片。”  随着这句话，被压抑的记忆豁然打开——女儿把发卡和玩具熊忘在了这里，临走前发现不见了，哭得伤心。老陈答应下周再来找，可是再也没有下周了。  猫继续叫着，向前走了几步，回头看他，仿佛要他跟随。老陈跟着猫走到走廊尽头，那里有一扇锈蚀的铁门。猫从门下的缝隙钻了进去，老陈费力地推开门。  门后是个小房间，墙上贴满了已经发黄的照片和图画。正中央的桌子上，放着一个手工做的纪念牌，上面稚气地写着：“纪念最好的爸爸——永远爱你的小雨。”  老陈想起来了。那是钢厂关闭前举办的“记忆展览”，邀请市民提交与钢厂有关的回忆。他们一家来参观时，女儿偷偷提交了这份作品，想给他惊喜。  泪水模糊了老人的双眼。他抚摸着女儿歪歪扭扭的字迹，三年来的第一次，心中涌起的不是尖锐的疼痛，而是温暖的怀念。  猫跳上桌子，轻柔地叫着。老陈注意到猫项圈上的铃铛有些特别，他从未仔细看过。现在他解下来，发现铃铛上刻着一行小字：“记忆会指引回家的路。”  大学生们这时也找了过来，看到房间里的景象，都静默不语。女孩轻声说：“好像一切都是安排好的。”  老陈抱起猫，忽然觉得心中的重压减轻了许多。他感谢了年轻人们，带着猫和女儿的纪念物回家了。  那晚，老陈睡了三年来第一个整觉。梦中，妻女微笑着向他告别，不再是痛苦的情景。  第二天，老陈联系了拆迁负责人，请求保留那个小房间。出乎意料，对方同意了，还决定将整个钢厂改造成工业遗产公园，那个房间将成为公园的一部分。  老陈开始参与公园的规划工作，给志愿者们讲述钢厂的故事。他的猫总是跟在身边，像是守护着这些珍贵的记忆。  一年后，工业遗产公园开幕。老陈被邀请剪彩。人群中，他看见曾经帮助他寻找猫的大学生们，笑着向他们招手。  晚上回家时，老陈抱着猫坐在门廊上，轻轻挠着它的下巴。  “你到底是从哪儿来的呢？”他低声问。  猫只是呼噜着，眼里闪烁着奇异的光亮。老陈忽然觉得，答案并不重要。有些谜就让它永远是谜，有些治愈不需要解释。  远处，新公园的灯光亮起，照亮了过去的记忆，也照亮了前行的路。老陈抚摸着怀中的猫，第一次感到未来可期。  笑话: 好的，这里有一个关于猫的笑话：  ---  **笑话：猫的“加密”语言**  有一天，一位程序员和他的猫坐在电脑前。   程序员正忙着写代码，突然，猫跳上了键盘，乱按了一通，屏幕上出现了一堆乱码。    程序员无奈地说：“嘿，别捣乱！我在工作呢！”    猫转过头，一脸不屑地看着他，说：“喵？（你说我捣乱？我刚刚是在帮你修复代码里的bug！）”    程序员哭笑不得：“真的吗？那你修复了什么？”    猫淡定地回答：“喵喵呜。（我帮你把‘愚蠢的人类错误’模块删除了。）”    程序员：“……”    ---  希望这个笑话让你开心！😸  诗歌: 《绒毯上的君王》  ——仿里尔克式咏物诗  你以尾尖丈量午后的光隙， 瞳孔里藏着未勘测的疆域。 肉垫轻触之处，毛线团开始叛离地心引力， 跃起！将混沌揉成有序的圆弧。  胡须是丈量世界的罗盘， 在窗帘褶皱里标注星图。 偶尔对虚空发出咕噜的密语， 让整个房间沉入振频的湖。  总在梦境边缘巡逻， 爪尖勾起月光的丝缕。 那些被您踩碎的晨昏， 皆化作绒毯上开花的光斑。  当黑暗吞没最后一道门缝， 您便昂首踱步于自己的星座—— 所有佯装驯服的身躯里， 都住着未被驯服的旷野。

```

# **路由**

路由 (Routing) 负责对输入进行分类，并将其导向后续任务。正如 Anthropic 博客文章《Building Effective Agents》中所述：

路由将输入进行分类，并将其导向专门的后续任务。这种工作流实现了关注点分离，并能够构建更专业的提示词。如果没有这种工作流，针对一种输入进行优化可能会损害对其他输入的性能。

适用场景：路由适用于那些存在明显类别且最好单独处理的复杂任务，并且分类可以由 LLM 或更传统的分类模型 / 算法准确处理的情况。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923036.png)

**Graph API**

```python
from typing_extensions import Literal
from langchain_core.messages import HumanMessage, SystemMessage

# 用于路由逻辑的结构化输出 Schema
class Route(BaseModel):
    step: Literal["poem", "story", "joke"] = Field(
        None, description="路由过程中的下一步"
    )

# 使用结构化输出的 Schema 增强 LLM
router = llm.with_structured_output(Route)# 状态
class State(TypedDict):
    input: str
    decision: str
    output: str

# 节点
def llm_call_1(state: State):
    """写一个故事"""

    result = llm.invoke(state["input"])
    return {"output": result.content}

def llm_call_2(state: State):
    """写一个笑话"""

    result= llm.invoke(state["input"])
    return {"output": result.content}

def llm_call_3(state: State):
    """写一首诗歌"""

    result = llm.invoke(state["input"])
    return {"output": result.content}

def llm_call_router(state: State):
    """将输入路由到适当的节点"""

    # 运行带有结构化输出的增强型 LLM，作为路由逻辑
    decision = router.invoke(
        [
            SystemMessage(
                content="根据用户的请求，将输入路由到故事、笑话或诗歌。"
            ),HumanMessage(content=state["input"]),
        ]
    )

    return {"decision": decision.step}

# 条件边函数，用于路由到相应的节点
def route_decision(state: State):
    # 返回要访问的下一个节点名称
    if state["decision"] == "story":
        return"llm_call_1"
    elif state["decision"] == "joke":
        return"llm_call_2"
    elif state["decision"] == "poem":
        return"llm_call_3"

# 构建工作流
router_builder = StateGraph(State)

# 添加节点
router_builder.add_node("llm_call_1", llm_call_1)
router_builder.add_node("llm_call_2", llm_call_2)
router_builder.add_node("llm_call_3", llm_call_3)
router_builder.add_node("llm_call_router", llm_call_router)

# 添加边以连接节点
router_builder.add_edge(START, "llm_call_router")
router_builder.add_conditional_edges(
    "llm_call_router",
    route_decision,
    {# route_decision 返回的名称 : 要访问的下一个节点的名称
        "llm_call_1": "llm_call_1",
        "llm_call_2": "llm_call_2",
        "llm_call_3": "llm_call_3",
    },
)
router_builder.add_edge("llm_call_1", END)
router_builder.add_edge("llm_call_2", END)
router_builder.add_edge("llm_call_3", END)

# 编译工作流
router_workflow = router_builder.compile()

#显示工作流
display(Image(router_workflow.get_graph().draw_mermaid_png()))

# 调用
state = router_workflow.invoke({"input": "给我写一个关于猫的笑话"})
print(state["output"])

```

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923103.png)

**Functional API**

```python
from typing_extensions import Literal
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, SystemMessage

# 用于路由逻辑的结构化输出 Schema
class Route(BaseModel):
    step: Literal["poem", "story", "joke"] = Field(
        None, description="路由过程中的下一步"
    )

# 使用结构化输出的 Schema 增强 LLM
router =llm.with_structured_output(Route)

@task
def llm_call_1(input_: str):
    """写一个故事"""
    result = llm.invoke(input_)
    returnresult.content

@task
def llm_call_2(input_: str):
    """写一个笑话"""
    result = llm.invoke(input_)
    return result.content

@taskdef llm_call_3(input_: str):
    """写一首诗歌"""
    result = llm.invoke(input_)
    return result.content

def llm_call_router(input_: str):
    """将输入路由到适当的节点"""
    # 运行带有结构化输出的增强型 LLM，作为路由逻辑
    decision = router.invoke(
        [
            SystemMessage(content="根据用户的请求，将输入路由到故事、笑话或诗歌。"
            ),
            HumanMessage(content=input_),
        ]
    )
    return decision.step

# 创建工作流
@entrypoint()
def router_workflow(input_: str):
    next_step = llm_call_router(input_)
    if next_step == "story":
        llm_call = llm_call_1
    elif next_step == "joke":
        llm_call = llm_call_2
    elif next_step == "poem":
        llm_call = llm_call_3

    return llm_call(input_).result()

# 调用
for step in router_workflow.stream("给我写一个关于猫的笑话", stream_mode="updates"):
    print(step)print("\n")

```

# **编排者 - 工作者模式**

在编排者 - 工作者模式中，一个编排者 (Orchestrator) 将任务分解并将其子任务委托给各个工作者 (Worker)。正如 Anthropic 博客文章《构建高效智能体》中所述：

在编排者 - 工作者工作流中，一个中央 LLM 动态地分解任务，将其委托给工作者 LLM，并整合它们的结果。

适用场景：这种工作流非常适合复杂的任务，在这些任务中无法预测所需的步骤数量（例如，在编码中，需要更改的文件数量和每个文件更改的性质很可能取决于任务），并且其中不能硬编码固定路径。与并行化在拓扑结构上相似，但关键区别在于其灵活性——子任务不是预先定义好的，而是由编排者根据特定输入动态确定的。

![worker.png](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923173.png)



**Graph API**

```python
from typing importAnnotated, List
import operator

# 用于规划的结构化输出 Schema
class Section(BaseModel):
    name: str = Field(
        description="报告此部分的名称。",
    )
    description: str = Field(
        description="本部分将涵盖的主要主题和概念的简要概述。",
    )

class Sections(BaseModel):
    sections: List[Section] = Field(
        description="报告的各个部分。",)

# 使用结构化输出的 Schema 增强 LLM
planner = llm.with_structured_output(Sections)

```

**在 LangGraph 中创建工作者**

由于编排者 - 工作者工作流很常见，LangGraph **提供了`**Send**`API 来支持此功能**。它允许你动态创建工作者节点并向每个节点发送特定的输入。每个工作者都有自己的状态，并且所有工作者的输出都会被写入一个可供编排者图访问的 * 共享状态键 (shared state key)*。这使得编排者可以访问所有工作者输出，并能够将其合成最终输出。如你所见，我们迭代一个部分列表，然后使用`Send`API 将每个部分发送到一个工作者节点。更多文档请参阅**此处**和**此处**。

```python
from langgraph.types import Send

# 图状态
class State(TypedDict):
    topic: str# 报告主题
    sections: list[Section]  # 报告部分列表
    completed_sections: Annotated[
        list, operator.add
    ]  # 所有工作者并行写入此键
    final_report: str  # 最终报告

# 工作者状态
class WorkerState(TypedDict):
    section: Section
    completed_sections: Annotated[list, operator.add]

# 节点
def orchestrator(state: State):
    """生成报告计划的编排者"""

    # 生成查询
    report_sections = planner.invoke(
        [
            SystemMessage(content="生成报告的计划。"),
            HumanMessage(content=f"这是报告主题: {state['topic']}"),
        ]
    )

    return {"sections": report_sections.sections}

def llm_call(state: WorkerState):
    """工作者编写报告的一个部分"""

    # 生成部分
    section = llm.invoke(
        [
            SystemMessage(
                content="按照提供的名称和描述编写报告的一个部分。不要包含每个部分的前导语。使用 Markdown格式。"
            ),
            HumanMessage(
                content=f"这是部分名称: {state['section'].name} 和描述: {state['section'].description}"
            ),
        ]
    )# 将更新后的部分写入已完成部分
    return {"completed_sections": [section.content]} # 这里需要是一个列表，因为 Annotated[list, operator.add] 要求

def synthesizer(state: State):"""从各部分合成完整报告"""

    # 已完成部分列表
    completed_sections = state["completed_sections"]

    # 将已完成部分格式化为字符串，用作最终部分的上下文
    completed_report_sections = "\n\n---\n\n".join(completed_sections)

    return {"final_report": completed_report_sections}

# 条件边函数，用于创建每个编写报告部分的 llm_call 工作者
def assign_workers(state: State):
    """为计划中的每个部分分配一个工作者"""

    # 通过 Send() API 并行启动部门编写
    return [Send("llm_call",{"section": s}) for s in state["sections"]]

# 构建工作流
orchestrator_worker_builder = StateGraph(State)

# 添加节点
orchestrator_worker_builder.add_node("orchestrator", orchestrator)
orchestrator_worker_builder.add_node("llm_call", llm_call)
orchestrator_worker_builder.add_node("synthesizer", synthesizer)

# 添加边以连接节点
orchestrator_worker_builder.add_edge(START, "orchestrator")
orchestrator_worker_builder.add_conditional_edges(
    "orchestrator", assign_workers, ["llm_call"]
)
orchestrator_worker_builder.add_edge("llm_call", "synthesizer")
orchestrator_worker_builder.add_edge("synthesizer", END)

# 编译工作流
orchestrator_worker = orchestrator_worker_builder.compile()

# 显示工作流
display(Image(orchestrator_worker.get_graph().draw_mermaid_png()))

# 调用
state = orchestrator_worker.invoke({"topic": "创建一份关于 LLM 扩展定律的报告"})

from IPython.display import Markdown
Markdown(state["final_report"])

```

**Functional API**

```python
from typing import List

# 用于规划的结构化输出 Schema
class Section(BaseModel):
    name: str = Field(
        description="报告此部分的名称。",
    )description: str = Field(
        description="本部分将涵盖的主要主题和概念的简要概述。",
    )

class Sections(BaseModel):
    sections: List[Section] = Field(
        description="报告的各个部分。",
    )

# 使用结构化输出的 Schema 增强 LLM
planner = llm.with_structured_output(Sections)

@task
def orchestrator(topic: str):"""生成报告计划的编排者"""
    # 生成查询
    report_sections = planner.invoke(
        [
            SystemMessage(content="生成报告的计划。"),
            HumanMessage(content=f"这是报告主题: {topic}"),
        ]
    )

    return report_sections.sections

@task
def llm_call(section: Section):
    """工作者编写报告的一个部分"""# 生成部分
    result = llm.invoke(
        [
            SystemMessage(content="编写报告的一个部分。"),
            HumanMessage(
                content=f"这是部分名称: {section.name} 和描述: {section.description}"
            ),
        ]
    )

    # 将更新后的部分写入已完成部分
    return result.content

@task
def synthesizer(completed_sections: list[str]):
    """从各部分合成完整报告"""
    final_report = "\n\n---\n\n".join(completed_sections)
    return final_report

@entrypoint()
def orchestrator_worker(topic: str):
    sections = orchestrator(topic).result()
    section_futures = [llm_call(section) for section in sections]
    final_report = synthesizer([section_fut.result() for section_fut in section_futures]
    ).result()
    return final_report

# 调用
report = orchestrator_worker.invoke("创建一份关于 LLM 扩展定律的报告")
from IPython.display import Markdown
Markdown(report)

```

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923242.png)

生成效果如下所示：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923314.png)

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923399.png)

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923515.png)

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923609.png)

# **评估者 - 优化器**

在评估者 - 优化器工作流中，一个大型语言模型 (LLM) 调用生成响应，而另一个 LLM 则在一个循环中提供评估和反馈：

适用场景：当拥有清晰的评估标准，并且迭代优化能带来可衡量价值时，这种工作流尤其有效。其适用的两个明显标志是：首先，大型语言模型 (LLM) 的响应在人类给出反馈后能够显著改进；其次，LLM 本身可以提供此类反馈。这类似于人类作者在编写一份精良文档时可能经历的迭代写作过程。

![evaluator_optimizer.png](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923740.png)


**Graph API**

```python
# 图状态
class State(TypedDict):
    joke: str
    topic: str
    feedback: str
    funny_or_not: str

# 用于评估的结构化输出 Schema
class Feedback(BaseModel):
    grade: Literal["funny", "not funny"] = Field(
        description="判断这个笑话是否好笑。",
    )
    feedback: str = Field(
        description="如果笑话不好笑，请提供改进建议。",
    )

# 使用结构化输出的 Schema 增强 LLM
evaluator = llm.with_structured_output(Feedback)

# 节点
def llm_call_generator(state: State):
    """LLM 生成一个笑话"""

    if state.get("feedback"):
        msg = llm.invoke(
            f"写一个关于{state['topic']}的笑话，但要考虑以下反馈: {state['feedback']}"
        )
    else:
        msg = llm.invoke(f"写一个关于{state['topic']}的笑话")
    return {"joke":msg.content}

def llm_call_evaluator(state: State):
    """LLM 评估这个笑话"""

    grade = evaluator.invoke(f"给这个笑话打分: {state['joke']}")
    return {"funny_or_not": grade.grade, "feedback": grade.feedback}

# 条件边函数，根据评估者的反馈，路由回笑话生成器或结束
def route_joke(state: State):
    """根据评估者的反馈，路由回笑话生成器或结束"""

    if state["funny_or_not"] == "funny":
        return"Accepted"
    elif state["funny_or_not"] == "not funny":
        return"Rejected + Feedback"

# 构建工作流
optimizer_builder = StateGraph(State)

# 添加节点
optimizer_builder.add_node("llm_call_generator", llm_call_generator)
optimizer_builder.add_node("llm_call_evaluator", llm_call_evaluator)

# 添加边以连接节点
optimizer_builder.add_edge(START, "llm_call_generator")
optimizer_builder.add_edge("llm_call_generator", "llm_call_evaluator")
optimizer_builder.add_conditional_edges(
    "llm_call_evaluator",
    route_joke,
    {  # route_joke 返回的名称 : 要访问的下一个节点的名称
        "Accepted": END,
        "Rejected + Feedback": "llm_call_generator",
    },
)

# 编译工作流
optimizer_workflow = optimizer_builder.compile()

# 显示工作流
display(Image(optimizer_workflow.get_graph().draw_mermaid_png()))

# 调用
state = optimizer_workflow.invoke({"topic": "猫"})
print(state["joke"])

```

**Functional API**

```python
# 用于评估的结构化输出 Schema
class Feedback(BaseModel):
    grade: Literal["funny", "not funny"] = Field(
        description="判断这个笑话是否好笑。",
    )
    feedback: str = Field(
        description="如果笑话不好笑，请提供改进建议。",
    )

# 使用结构化输出的 Schema 增强 LLM
evaluator= llm.with_structured_output(Feedback)

# 节点
@task
def llm_call_generator(topic: str, feedback: Feedback):
    """LLM 生成一个笑话"""if feedback:
        msg = llm.invoke(
            f"写一个关于{topic}的笑话，但要考虑以下反馈: {feedback}"
        )
    else:
        msg = llm.invoke(f"写一个关于{topic}的笑话")
    return msg.content

@task
def llm_call_evaluator(joke: str):
    """LLM 评估这个笑话"""
    feedback = evaluator.invoke(f"给这个笑话打分: {joke}")
    return feedback

@entrypoint()
def optimizer_workflow(topic: str):
    feedback = None
    whileTrue:
        joke = llm_call_generator(topic, feedback).result()
        feedback = llm_call_evaluator(joke).result()
        if feedback.grade == "funny":
            breakreturn joke

# 调用
for step in optimizer_workflow.stream("猫", stream_mode="updates"):
    print(step)
    print("\n")

```

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923838.png)

输出结果如下所示：

```
好的，这是一个关于猫的笑话：  ---  **笑话：猫的“加密”语言**  某人带着他的猫去看兽医，说：“医生，我的猫行为很奇怪，它总是对着电脑屏幕‘打字’，好像在写什么重要文件。”  兽医检查了一下猫，然后笑着说：“不用担心，你的猫只是在练习它的‘爪写’输入法，而且它可能觉得你的密码太简单了，想帮你重设一个。”  猫突然抬起头，冷冷地插了一句：“喵（翻译：你的密码是‘123456’，我昨晚已经帮你改成了‘鱼很好吃2024’，不用谢）。”  ---  希望这个笑话让你开心！🐱

```

# **智能体**

智能体 (Agent) 通常通过大型语言模型（LLM）根据环境反馈循环执行操作（通过工具调用）来实现。正如 Anthropic 博客文章《Building Effective Agents》中所述：

智能体可以处理复杂的任务，但其实现往往直接明了。它们通常只是大型语言模型根据环境反馈循环使用工具。因此，清晰周到地设计工具集及其文档至关重要。

适用场景：智能体可用于开放式问题，在这些问题中很难或无法预测所需步骤的数量，并且无法硬编码固定路径。大型语言模型可能会进行多次迭代，因此你必须对大模型决策能力有一定的信任。智能体的自主性使其成为在受信任环境中扩展任务的理想选择。

![agent.png](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923903.png)


API 参考：**tool**

```python
from langchain_core.tools import tool

# 定义工具
@tool
def multiply(a: int, b: int) -> int:
    """计算 a 乘以 b 的结果。

    Args:
        a: 第一个整数
        b: 第二个整数"""
    return a * b

@tool
def add(a: int, b: int) -> int:
    """计算 a 加上 b 的结果。

    Args:
        a: 第一个整数b: 第二个整数
    """
    return a + b

@tool
def divide(a: int, b: int) -> float:
    """计算 a 除以 b 的结果。

    Args:
        a: 第一个整数
        b: 第二个整数
    """
    return a / b

# 使用工具增强 LLM
tools = [add, multiply, divide]
tools_by_name ={tool.name: tool for tool in tools}
llm_with_tools = llm.bind_tools(tools)

```

**Graph API**

```python

from langgraph.graph import MessagesStatefrom langchain_core.messages import SystemMessage, HumanMessage, ToolMessage

# 节点
def llm_call(state: MessagesState):
    """LLM 决定是否调用工具"""

    return {
        "messages": [
            llm_with_tools.invoke(
                [
                    SystemMessage(
                        content="你是一个乐于助人的助手，负责对一组输入执行算术运算。"
                    )
                ]+ state["messages"]
            )
        ]
    }

def tool_node(state: dict):
    """执行工具调用"""

    result = []
    for tool_call in state["messages"][-1].tool_calls:
        tool = tools_by_name[tool_call["name"]]
        observation = tool.invoke(tool_call["args"])
        result.append(ToolMessage(content=observation, tool_call_id=tool_call["id"]))
    return {"messages": result}

# 条件边函数，根据 LLM 是否进行了工具调用，路由到工具节点或结束
def should_continue(state:MessagesState) -> Literal["Action", END]:
    """根据 LLM 是否进行了工具调用，决定是否继续循环或停止"""

    messages = state["messages"]
    last_message = messages[-1]
    # 如果 LLM 进行了工具调用，则执行一个动作
    if last_message.tool_calls:
        return"Action"
    # 否则，我们停止（回复用户）
    return END

# 构建工作流
agent_builder = StateGraph(MessagesState)

# 添加节点
agent_builder.add_node("llm_call", llm_call)
agent_builder.add_node("environment", tool_node)# 添加边以连接节点
agent_builder.add_edge(START, "llm_call")
agent_builder.add_conditional_edges(
    "llm_call",
    should_continue,{
        # should_continue 返回的名称 : 要访问的下一个节点的名称
        "Action": "environment",
        END: END,
    },
)
agent_builder.add_edge("environment", "llm_call")

# 编译智能体
agent = agent_builder.compile()

# 显示智能体
display(Image(agent.get_graph(xray=True).draw_mermaid_png()))

# 调用
messages = [HumanMessage(content="计算 3 加 4。")]
messages = agent.invoke({"messages": messages})
for m in messages["messages"]:
    m.pretty_print()

```

**Functional API**

```python

from langgraph.graph import add_messages
from langchain_core.messages import (
    SystemMessage,
    HumanMessage,
    BaseMessage,ToolCall,
)

@task
def call_llm(messages: list[BaseMessage]):
    """LLM 决定是否调用工具"""
    return llm_with_tools.invoke([
            SystemMessage(
                content="你是一个乐于助人的助手，负责对一组输入执行算术运算。"
            )
        ]
        + messages
    )

@task
def call_tool(tool_call: ToolCall):
    """执行工具调用"""
    tool = tools_by_name[tool_call["name"]]
    return tool.invoke(tool_call)

@entrypoint()def agent(messages: list[BaseMessage]):
    llm_response = call_llm(messages).result()

    whileTrue:
        ifnot llm_response.tool_calls:
            break# 执行工具
        tool_result_futures = [
            call_tool(tool_call) for tool_call in llm_response.tool_calls
        ]
        tool_results = [fut.result() for fut in tool_result_futures]
        messages = add_messages(messages, [llm_response, *tool_results])
        llm_response = call_llm(messages).result()messages = add_messages(messages, llm_response)
    return messages

# 调用
messages = [HumanMessage(content="计算 3 加 4。")]
for chunk in agent.stream(messages, stream_mode="updates"):
    print(chunk)
    print("\n")

```

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1757255923988.png)

输出结果如下：

```
================================ Human Message =================================  计算 3 加 4。 ================================== Ai Message ==================================  我来帮您计算 3 加 4。 Tool Calls:   add (call_0_0cf24905-799b-4658-bd9c-64b9eb611814)  Call ID: call_0_0cf24905-799b-4658-bd9c-64b9eb611814   Args:     a: 3     b: 4 ================================= Tool Message =================================  7 ================================== Ai Message ==================================  3 加 4 的结果是 7。

```

## **预构建智能体**

LangGraph 还提供了一个**预构建方法**来创建如上定义的智能体（使用`**create_react_agent**`函数）：

https://langchain-ai.github.io/langgraph/how-tos/create-react-agent/

API 参考：**create_react_agent**

```python
from langgraph.prebuilt import create_react_agent

# 传入：
# (1) 带有工具的增强型 LLM
# (2) 工具列表（用于创建工具节点）
pre_built_agent = create_react_agent(llm, tools=tools)

# 显示智能体
display(Image(pre_built_agent.get_graph().draw_mermaid_png()))

# 调用
messages = [HumanMessage(content="计算 3 加 4。")]
messages = pre_built_agent.invoke({"messages": messages})
for m in messages["messages"]:
    m.pretty_print()

```


>/ 作者：致 Great

 >/ 作者：欢迎转载，标注来源即可