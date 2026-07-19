---
title: "分布式跨节点的数据排序 - Lamport Clock"
date: 2025-09-23 00:00:00
categories: 架构
tags:
- Lamport时钟
- 分布式排序
- 因果一致性
- 逻辑时钟
- 偏序关系
- MVCC
- 分布式系统
- 版本控制
description: "本文深入讲解了Lamport Clock在分布式系统中的应用原理。文章从为什么需要Lamport Clock出发，分析了分布式节点间时钟漂移导致无法使用物理时间戳的问题，详细阐述了Lamport逻辑时钟的实现机制、偏序关系建立、Versioned Key存储设计等核心技术。同时结合即时通讯群聊、分布式数据库冲突解决等实际场景，展示了Lamport Clock在捕获因果关系、实现跨节点数据排序方面的应用价值及其局限性。"
---

在前面的[多版值设计](https://mp.weixin.qq.com/s?__biz=MzI5MTIyODc4NA==&mid=2247485082&idx=1&sn=7527fd262097e721618d0c559e557f33&scene=21#wechat_redirect)中我们聊了如何针对单主复制解决冲突的问题, 但是其存在的不足就是在 Multi-Leader 或者是 Leaderless 复制模型的情况无法保证其操作前后的顺序性, 从而在解决冲突的层面上无法决策. 今天我们来聊聊 Lamport Clock, 它是一个关注如何捕获操作事件的 Happen Before 关系的顺序性, 从而实现跨节点的数据逻辑因果顺序. 由于篇幅有点长, 请耐心阅读! 

<!-- more -->

# 为什么需要 Lamport Clock

在讲述之前, 我们先来分析下在多个 Replica 节点允许写操作的场景, 比如在下面的一个 Multi-Leader 双数据中心的部署架构, 我们有一个 UserA 向我们系统依次发起一系列的 key = x 以及 key = y 的写操作, 如下:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614434744.png)

在上述的架构中我特意多画了终端机器, 用户的终端机器可能是电脑、平板或者手机等设备, 对于用户而言, key = x 是先于 key = y 的写操作, 如果我想看到 UserA 的操作序列记录, 那么按时间倒序排序依次为 key = y , key = x 这样的操作记录. 也就是对于 UserA 而言这一系列的操作是具备顺序性的. 如果我们在写操作的时候携带对应的时间戳是不是就可以解决问题了呢?

如果 UserA 只有一台设备可能问题不大, 我们直接利用携带的时间戳作为版本号, 然后根据版本号存储对应的记录, 就如同之前的[多版本值设计](https://mp.weixin.qq.com/s?__biz=MzI5MTIyODc4NA==&mid=2247485082&idx=1&sn=7527fd262097e721618d0c559e557f33&scene=21#wechat_redirect)讨论那样, 我们有了基于时间戳作为版本号的顺序性依靠, 这个时候我们可以利用时间戳本身天然的顺序性进行决策.

但是如果是多台不同设备呢? 比如 UserA 在电脑发起 write key = x, time = t1, 接着在手机也发起 write key = y, time = t2, 这个时候我们是无法保证两个不同设备的时间戳具备连续性. 

其实你也可以把对应的设备看成两台分布式的节点, 在前面我们讲述到[分布式不可靠的时钟](https://mp.weixin.qq.com/s?__biz=MzI5MTIyODc4NA==&mid=2247484718&idx=1&sn=32d2dceb9a702deb7c63616347ab255f&scene=21#wechat_redirect)带来的问题, 系统时间戳不具备单调性, 系统时间戳表示一天中的时间，通常由带有晶体振荡器的时钟机制来测量。这种机制的一个已知问题是，它可能会偏离实际的一天中的时间。为了解决这个问题，计算机通常会配备如 NTP（网络时间协议）之类的服务，该服务会将计算机时钟与互联网上的参考时间源进行同步。正因为如此，在特定服务器上连续两次读取系统时间时，时间可能会出现倒退。

由于分布式节点 / 设备之间的时钟漂移没有上限，因此无法比较两台不同节点 / 设备上的时间戳。这个时候才会考虑逻辑时钟的实现方式, 也就是今天我们讲述的 Lamport Clock.


# Lamport Clock 实现原理

什么是 Lamport Clock 呢? Lamport Clock 是由莱斯利 · 兰波特（Leslie Lamport）在其开创性论文《时间、时钟与分布式系统中的事件排序》（[Lamport1978]）（“Time, Clocks, and the Ordering of Events in a Distributed System” [Lamport1978]）中提出了一种解决方案，即使用逻辑时间戳来追踪操作事件 “Happen Before” 的关系。因此这种利用逻辑时间戳追踪因果性的技术被称为 Lamport Timestamp, 这里我称之为 Lamport Clock.

根据上述的定义, 我们可以看到 Lamport Clock 关注的是事件操作的 Happen Before 关系, 并非是为了解决数据值冲突的问题, 但由于引入顺序性从而间接帮助我们解决数据值的冲突问题, 由此我们可以得到一个隐藏的细节:

*   如果事件 A Happen Before 事件 B, 即 A -> B, 那么对于引入 Lamport Clock 的两个事件逻辑时钟 L(a) 以及 L(b) 满足 L(a) < L(b), 从事件推导逻辑时钟的前后关系.
    
*   但是反过来如果 L(a) < L(b), 那么事件 A 不一定 Happen Before 于事件 B, 比如前面我们提及的版本号, 版本值的设置取决于服务端在 CPU 层面的执行顺序, 它们可能是并发关系.
    

从而我们得到一个结论就是: 通过 Lamport Clock 我们可以捕获事件 A 以及 事件 B 之间的 Happen Before 关系, 从而推导出对应的 L(a) 与 L(b) 的大小, 从而间接让我们对操作的一系列值实现跨节点排序, 但是 Lamport Clock 却无法帮助我们识别事件之间的并发关系.

那么如何实现一个 Lamport Clock 呢? 首先, 在先前[多版本值设计](https://mp.weixin.qq.com/s?__biz=MzI5MTIyODc4NA==&mid=2247485082&idx=1&sn=7527fd262097e721618d0c559e557f33&scene=21#wechat_redirect)我们提及采用 MVCC 存储多个版本值, 这里我们存储多版本 key, 那么 多版本 key(Versioned Key) 中的版本号 version 则采用我们的 Lamport Clock.

而 MVCCStore 则是作为存储多版本 key 以及对应的数据值的容器, 在容器中为了实现快速的范围检索, 基于 Lamport Clock 具备有序性的前提下, 我们采用版本号作为后缀, 即 key@version(lamport clock) , 通过 key 后缀的版本号使得多版本 key 组成一个自然排序的序列.

如下我们采用链表的方式存储组成一个不同 key 的多版本序列, 类似于我们 LevelDB 的跳表结构, 假设有 k1, k2, k3 三个 key, 分别对应 4 个递增的版本号 L1, L2, L3 且满足 k1 <k2 < k3, 我们定义 versionedKey 值越大越靠右边, 假如这个时候我们已经向 MVCCStore 存储依次写入对应的一系例 versionedKey, 如果此时插入 < k1, L3> 没有发生层级跳跃, 那么就会在 L0 层插入在 < k1,L2 > 与 < k2, L1> 之间, 如下:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614435011.png)

如果发生层级跳跃, 那么就会新建一层跳表插入对应的 versionedkey, 如下:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614435195.png)

最后我们的存储多版本的结构可能就形成如下的方式:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614435441.png)

由此我们可以得到以下多版本 Key 以及 MVCC 存储的伪代码:

```java
class VersionedKey implements Comparable<VersionedKey> {
  int ver;
  String key;
  // 自己实现版本的比较
  public int compareTo(VersionedKey other) {
    int keyCompare = this.key.compareTo(other.key);
    if(keyCompare != 0) {
      return keyCompare;
    }
    return  Integer.compare(this.version, other.version);
  }
}
class MVCCStroe {
  Map<VersionedKey,String> skipMap = new ConcurrentSKipListMap<>();
}

```

而 Lamport Clock 的实现伪代码, 其中 tick 是 Lamport Clock 的核心方法如下:

```java
class LamportClock {
  int clock;
  public LamportClock(int clock){
    this.clock = clock;
  }
  // 实现LamportTimestamp的核心要素
  public int tick(int reqClock) {
    int max = Math.max(reqClock, clock);
    clock = max + 1;
    return clock;
  } 
}

```

可见 Lamport Clock 核心原理是接收客户端携带的 reqClock, 与当前存储于服务端的 clock 进行比较取 max 值并递增 1 返回给客户端.

如果我们从请求的角度看 Lamport Clock 的操作, 同样以 KV 存储为例, 客户端 client 向两个存储副本节点, 即分别称之为 Blue 以及 Green 节点, 这个时候我们很直观看到客户端操作事件上的顺序性, 如下:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614435603.png)

此时 Server 节点对应操作的伪代码如下:

```java
 public int write(String key, String value, int reqVer) {
      //update own clock to reflect causality
      int writeVer = clock.tick(reqVer);
      mvccStore.put(new VersionedKey(key, writeVer), value);
      return writeVer;
}

```

有了上述原理基础, 我们再回顾下之前在[顺序与因果关系一致性](https://mp.weixin.qq.com/s?__biz=MzI5MTIyODc4NA==&mid=2247485042&idx=1&sn=7732632b7dd5f9d38b1745ed3dbd9a49&scene=21#wechat_redirect)提及的 Lamport Clock 例子, 其中组成的 versionedKey 为 <Clock, NodeId> 如下:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614435765.png)

*   ClientA 向 Node1 节点发送写入事件操作, 携带 max = 0 (即 Lamport Clock), 由于 Node1 之前没有接收到写操作, 于是 max = 0 并递增 1 返回 ClientA 数据对 <1, 1>, 于是 ClientA 以及 Node1 保存当前最大 counter 的 max = 1.
    
*   ClientB 向 Node2 节点发送写入事件操作, 其过程也和 ClientA 一样, 最终 Node2 以及 ClientB 保存的 counter 最大值为 max = 4.
    
*   ClientA 再次发起写入事件操作, 但是这个时候给路由到 Node2, 并携带自己的 counter 最大值 max = 1 到 Node2 节点上, 由于 Node2 最大值 max = 4, 于是基于 max = 4 递增 1 返回给 Client 为 <5, 2>, 此时 ClientA 存储的最大值为 max = 5.
    
*   接着我们再看 ClientA 携带上一次的请求时钟 max = 5 落到 Node1 节点, 而 Node1 节点会根据 ClientA 携带的 reqClock = 5 以及自身节点 clock = 1 进行比较取 max 得到当前的最大值 max = 5, 然后递增 1 得到 clock = 6 并返回给 ClientA 为 <6, 1>, 由此 ClinetA 存储最大值为 6 . 同理 ClientB 携带 max = 4 落到 Node2 节点也是一样的逻辑.
    

不知道你在上述的例子得到了什么信息呢? 对此我自己总结如下: 

*   不论是 ClientA 还是 ClientB, 用户在往存储系统发起的系列写操作是具备顺序的, 因为我们看到不论 ClientA 还是 ClinetB 其携带的 clock 总是递增的.
    
*   Node1 以及 Node2 节点也各自保证自身节点 clock 的顺序, 也就是在自己的节点上 clock 是递增的.
    

细心的你是否会发现, 如果我们 ClientA 以及 ClientB 操作的是相同的 key, 那么由于 Node1 节点存储 <6, 1> 以及 Node2 节点存储 < 6, 2> 的版本, 该以哪个为准呢? 如何进行决策呢? 正如下面的两个用户 Bob 以及 Alice 分别向 Node1 以及 Node2 服务节点发起相同的数据 key 的写入操作如下:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614435988.png)

这个其实没法衡量的, 因为我们这里需要引入对应的业务场景分析, 如果是作为分布式锁 Id 的获取或者是集群的 leader 选举投票, 那么我们可以接受用 NodeId 大小来判断进行决策.

但是如果是上述的 Bob 以及 Alice 的例子, 应用相同的 key 对应不同的数据值, 那么是不可行, 因为我们无法捕获到 Bob 以及 Alice 的写入操作事件 Happen Before 关系, 如果直接基于 NodeId(Clock 相同的条件下) 的大小采用 LWW 机制进行判断就会导致数据丢失问题. 可见 Lamport Clock 无法做到全序, 仅能满足某个维度下的全序顺序性, 即接下来我们来聊聊 Lamport Clock 的偏序机制.

  

# 基于 Lamport Clock 实现偏序


首先我们有一个前提基础, 那就是基于多 Replica 节点都提供外部写入操作的能力, 那么我先从一个简单的场景开始. 

以开头的 UserA 向双主部署架构的 Replica 发起一系列的写入操作, 这个时候我们将系统时间戳替换为 Lamport Clock, 那么基于 Lamport Clock 的原理可知, 需要存储 UserA 持有的 clock, 而这个 clock 对于持有多端设备的 UserA 而言是相同, 那么这个时候我们就需要增加维护一份 UserA 对应的 clock 存储: 

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614436173.png)

可见我们的架构相比之前更为复杂, 因为这里引入一个额外的存储来维持 UserA 以及 Clock 的数据存储, 那么这个额外的存储就需要做到数据可靠性以及高可用, 防止数据丢失. 

你会发现在上述的流程我不再是写 write key = x 以及 key = y 而是分别用 write A seq 以及 write B seq 去替换, 为什么呢? 如果 A 操作 Happen Before B, 那么对应 write A seq 的操作数据是什么其实没那么重要, 它可以是任意数据值, 也可以是日志记录. 

如果是日志记录, 我们记录为 logA 以及 logB, 由于 A Happen Before B, 因此对于 UserA 而言看到的操作记录按时间倒序则依次为 logB -> logA, 这就是我们的偏序关系, 其中 logA 以及 logB 本身就不具备可比较的属性, 但由于我们施以 Clock 来捕获操作事件 A 与 事件 B 的 Happen Before 关系, 从而得到 Lx < Ly, 因此也可推导出 logA < logB, 即操作记录 A 是先于操作记录 B, 而这个顺序仅针对 UserA 而言是有序的.

那如果是我想看操作同一个 key 的顺序性呢? 对于这种我觉得大家会更为熟悉的场景, 因为 kafka 的 partition 机制正是基于 key 进行 hash / 自定义指定分区路由到指定的 partition, 类似于如下的方式, 不同的 key 路由到相同的 IDC 数据中心, 即:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614436382.png)

从上述的架构可以看出: IDC1 存储 key 为 name 的全序关系, IDC2 存储 key 为 title 也为全序关系, 即我们可以捕获到 write name = xxx 以及 write title = xxx 的操作因果关系, 但无法捕获 write name = xxx 以及 title = xxx 的操作因果关系. 

因此我们的偏序关系取决于我们采取 key 的策略, 如果我们想看用户层面的全序关系, 那么就基于 UserId 作为 key 来维护对应的 clock, 如果是想看某一个维度层面的全序关系, 那么就基于对应维度的 key 来维护对应的 clock, 入比如上述的 name 或者是 title 各自的维度.

除了上述的场景, 我们之前也遇到过一个例子, 那就是在一个对话聊天中由于 Replication Lag 出现了一致性前缀读的情况, 即在一个 IM 系统中 Mr.Poons 以及 Mrs.Cake 都是在一个多人的群聊中, 并且聊天有这样的简短对话, 如下:

```
Mr. Poons
How far into the future can you see, Mrs. Cake?
Mrs. Cake
About ten seconds usually, Mr. Poons.

```

但是在群聊的第三个用户 Observer 用户, 我们称之为观察者, 其发起的请求路由如下:

```
Mrs. Cake
About ten seconds usually, Mr. Poons.
Mr. Poons
How far into the future can you see, Mrs. Cake? 

```

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614436600.png)

上述这种情况我们称之为一致性前缀读 (Consistent Prefix Reads), 其中 Mr.Poons 以及 Mrs.Cake 在群聊中前后发起的对话是具备因果关系, 因此如果我们考虑采用 Lamport Clock 来捕获群聊发起的对话事件操作, 那么要怎么实现呢?

其实我们转换下思路, 在一个 IM 群聊系统中, 用户聊天上下文对话其实就是一个向群聊 Id 不断进行写操作的事件, 那么我们仅需要捕获到基于群聊 Id 的写操作事件顺序即可, 我们姑且将群聊 Id 称之为 groupId, 那么这个时候对于 Mr.Poons 以及 Mrs.Cake 对话则变成如下:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614436861.png)

那么要怎么查询呢? 同样以下是我们的一个查询流程:

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1758614437085.png)

这个时候我们再思考一个问题, 查询方式是不是太复杂了呢? 那我们能不能简化下, 可以考虑两种方式: 

*   其一是基于上述 groupId 进行分区, 即相同的 groupId 路由到相同的 IDC 中, 那么我们的查询就仅是单个 IDC 数据中心查询, 此时在一个 IDC 中就具备一个维度的全序排序顺序的因果逻辑.
    
*   第二种方式是提供给外部系统或者伴生系统 (非系统内部的, 比如在自建的电商系统中采用第三方支付系统完成支付功能, 第三方支付系统非当前系统职责范围所在, 因此这个支付系统我们称之为伴生系统) 使用, 那么这个时候我们可以采用异构数据存储的方式, 通过协调者将 <groupId, clock> 组成的以 groupId 维度, 以 clock 作为逻辑全序的顺序事件通过 CDC 的方式发送到对应的异构存储系统进行回放即可.
    

经过上述的不同场景分析, 可见借助 Lamport Clock 的机制可以帮助我们实现跨节点的值排序, 这个值排序并不是我们所谓的自然排序, 而是一种偏序关系.

这种偏序是我们通过捕获操作事件的 Happen Before 关系从而推导出事件对应的 Clock 之间的排序关系. 同时这种偏序关系是基于某一个维度而言, 比如上述的维度有 userId、数据 key 以及群聊 groupId, 因此在分布式系统中如果我们只是实现部分维度下的全序关系, 那么 Lamport Clock 的设计方式将是我们一个比较好的参考范例.

# Lamport Clock 应用场景与局限性

## Lamport Clock 应用场景

谈完 Lamport Clock 原理机制, 那么它在我们分布式系统中有哪些应用呢? Lamport 时间戳的核心价值在于其简单性和对因果关系的保证。它适用于以下需要轻量级事件排序的场景, 我将自己工作中遇到的各种可能场景进行汇总如下:

| 应用场景           | 具体系统/案例                                    | Lamport Clock 的作用                     | 实现细节与关键点                                                                                                        |
| -------------- | ------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **分布式数据库冲突解决** | Amazon Dynamo, Apache Cassandra (轻量级事务)    | 为数据更新提供逻辑时间戳，用于识别并发更新和解决冲突（如 LWW 策略）。 | **写入时**：客户端或协调节点生成并附加 Lamport 时间戳。<br>**读取时**：系统比较不同副本的时间戳，确定最新值或返回多个冲突版本由客户端解决。                                |
| **分布式锁与协调服务**  | Apache ZooKeeper (Zxid), etcd (Raft Index) | 为所有状态变更操作提供全局唯一的、单调递增的 ID，保证操作的全序关系。  | **Lamport 思想的变体**：这些系统使用类似 Lamport 逻辑的单调递增计数器（如 Zxid 由 epoch 和 counter 组成）。<br>**作用**：实现锁的公平性、消息的顺序广播、状态机的日志复制。 |
| **消息队列顺序保证**   | Apache Kafka, RabbitMQ (自定义插件)             | 保证同一分区内消息的因果顺序，帮助消费者理解消息间的逻辑顺序。       | **生产者**：为消息分配 Lamport 时间戳。<br>**消费者**：处理消息并可能产生新消息时，基于收到消息的时间戳更新自己的时钟，确保输出消息逻辑上在后。                              |
| **版本控制系统**     | Git (逻辑相似)                                 | 为提交事件提供逻辑上的先后关系，辅助解决合并冲突。             | **间接应用**：Git 的提交哈希 DAG 结构本身捕获了因果历史，其理念与 Lamport Clock 的 "happened-before" 关系高度一致。                               |
| **分布式调试与追踪**   | Jaeger, Zipkin, Dapper                     | 跨服务的分布式追踪中，帮助重建事件流的因果链，辅助故障诊断。        | **与物理时钟结合**：通常将 Lamport 时间戳或类似逻辑与高精度物理时间戳、TraceID 结合使用，以分析跨服务调用的事件顺序和延迟。                                        |
# Lamport Clock 存在的局限性

我们通过上述针对 Lamport Clock 的原理以及偏序的阐述, 现也将 Lamport Clock 存在的局限性总结如下:

| 不足类别        | 具体描述                                                                                                                    | 导致的问题与影响                                                                                          | 解决方案/备注                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **并发检测缺陷**  | 无法准确识别并发事件。这是其最核心的缺陷。Lamport Clock 仅能保证：如果 A -> B, 则 L(A) < L(B)。但其逆命题不成立，即 L(A) < L(B) 并**不**意味着 A -> B, A 和 B 可能是并发的。 | 系统无法仅凭时间戳判断两个操作是否冲突。例如，两个客户端同时修改同一个值，它们的时间戳可能不同但实际是并发操作，系统会错误地认为时间戳大的操作是“更新”的，从而覆盖另一个，造成数据丢失。     | 升级使用 **Vector Clock**，它可以明确检测出所有并发关系。        |
| **全局排序限制**  | 无法提供唯一的全局全序。Lamport Clock 只能产生一个偏序关系。要得到一个所有进程都认同的全序，通常需要附加规则（如比较进程ID）。                                                 | 不同进程产生的、无因果关系的时钟无法客观地排序。例如，进程A的时间戳 (10, A) 和进程B的时间戳 (8, B) 无法比较其实际发生的先后顺序，强制按PID排序可能产生与物理时间不符的序列。 | 需要引入额外的仲裁机制（如进程ID排序）来生成全序，但这个全序可能与实际物理时间不一致。 |
| **空间增长问题**  | 时间戳数值可能快速增长。在消息密集的系统中，接收消息时的时钟更新规则 `local_clock = max(local_clock, received_clock) + 1` 会导致计数器大幅跳增。                     | 虽然不影响逻辑正确性，但过大的时间戳数值会占用更多的存储空间和网络传输带宽。                                                            | 通常需要确保使用足够大范围的整数类型（如64位整数）并考虑极端的溢出处理。        |
| **因果信息缺失**  | 不同进程的时间戳比较意义有限。两个来自不同进程的 Lamport 时间戳，如果它们之间没有通过消息传递建立因果联系，那么比较其数值大小是没有因果含义的。                                            | 难以直接用于需要全局视角的复杂协调任务。例如，一个进程无法单独通过比较两个来自不同源的无关联事件的时间戳来判断它们的全局关系。                                   | 时钟本身不携带足够的因果历史信息，再次体现了其仅为偏序关系的特点。            |
| **与物理时间脱节** | 完全与物理时间无关。Lamport Clock 是纯逻辑的，其计数器增量与物理世界的时间流逝没有对应关系。                                                                   | 不能用于任何需要测量实际耗时、延迟或判断绝对发生时间的场景。例如，无法回答“操作A是在操作B之前多少秒发生的？”这样的问题。                                    | 如需物理时间，需结合系统物理时钟（但会引入时钟同步问题），或使用混合逻辑时钟（HLC）。 |

# 总结

最后我再从 Lamport Clock 的价值、限制以及协作模式做一个总结:

|          | 说明                                                                                     |
| -------- | -------------------------------------------------------------------------------------- |
| **核心价值** | 在分布式系统中，不依赖同步的物理时钟，仅通过逻辑就能为事件定义一个可靠的、反映因果关系的偏序关系。这是实现很多分布式算法（状态机复制、并发控制）的基础。           |
| **主要限制** | 无法检测所有并发：`L(A) < L(B)` 并不意味着 `A -> B`，它们可能是并发的。需要更复杂的机制（如 Vector Clock）来精确检测并发。        |
| **协作模式** | **“标记”与“承载”**：Lamport Clock 作为版本标识符生成器，而 Versioned Value 是存储数据和版本的容器。两者协同工作，实现冲突检测与解决。 |
