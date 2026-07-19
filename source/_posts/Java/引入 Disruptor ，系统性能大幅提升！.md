---
title: "引入 Disruptor ，系统性能大幅提升！"
date: 2025-07-13 00:00:00
categories: Java
tags:
- Disruptor
- 内存队列
- 高性能
- 并发编程
- 消息队列
- 无锁并发
- RingBuffer
description: "本文详细介绍高性能内存消息队列Disruptor的核心设计。文章深入解析Ring Buffer、Sequence、Sequencer、Sequence Barrier、Wait Strategy、Event Processor等核心组件，阐述无锁并发、伪共享问题的解决原理，以及Disruptor如何通过单线程写、内存屏障等技术实现比传统阻塞队列更高的吞吐量。"
---

## 简介

对于主流的分布式消息队列来说，一般会包含 Producer、Broker、Consumer、注册中心等模块。比如 RocketMQ 架构如下：

<!-- more -->

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131234815.png)

Disruptor 并不是分布式消息队列，它是一款内存消息队列，因此架构上跟分布式消息队列有很大差别。下面是一张 LMAX 使用 Disruptor 的案例图：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131234936.png)

我们介绍一下 Disruptor 架构中的核心概念。

### 1.1 Ring Buffer

Ring Buffer 通常被认为是 Disruptor 的最主要的设计，但是从 3.0 版本开始，Ring Buffer 只负责存储和更新经过 Disruptor 的数据。在一些高级的使用场景，它甚至完全可以被用户替换。

### 1.2 Sequence

Disruptor 使用 Sequence 来识别特定组件的位置。每个 Consumer（也就是事件处理器）都像 Disruptor 一样持有一个 Sequence。并发相关的核心代码依赖 Sequence 的自增值，因此 Sequence 具有跟 AtomicLong 相似的特性，事实上唯一的不同就是不同的 Sequence 之间不存在伪共享问题。

伪共享：CPU 缓存是以缓存行为单位进行加载和存储，CPU 每次从主存中拉取数据时，会把相邻的数据也存入同一个缓存行。即使多个线程操作的是同一缓存行中不同的变量，只要有一个线程修改了缓存行中的某一个变量值，该缓存行就会被标记为无效，需要重新从主从中加载。在多线程环境下，频繁地重新加载缓存行，会严重影响了程序执行效率。

### 1.3 Sequencer

Sequencer 是 Disrupter 的真正核心，有单个生产者和多个生产者两种实现（SingleProducerSequencer 和 MultiProducerSequencer）。为了让数据在生产者和消费者之间快速、准确地传输，它们都实现了所有并发算法。

### 1.4 Sequence Barrier

Sequencer 生成一个 Sequence Barrier，它包含由 Sequencer 生成的 Sequence 和消费者拥有的 Sequence 的引用。Sequence Barrier 决定是否有事件给消费者处理。

### 1.5 Wait Strategy

消费者怎样等待事件的到来。

### 1.6 Event Processor

主要负责循环处理来自 Disruptor 事件，它拥有消费者 Sequence 的所有权。有一个单独的实现类 BatchEventProcessor，这个类拥有高效的事件循环处理能力并且处理完成后可以回调实现 EventHandler 接口的用户。

### 1.7 Event Handler

由用户来实现并且代表 Disruptor 消费者的接口。

## 2 Disruptor 特性

### 2.1 多播事件

多播事件是 Disruptor 区别于其他队列的最大差异。其他队列都是一个事件消息只能被单个消费者消费，而 Disruptor 如果有多个消费者监听，则可以将所有事件消息发送给所有消费者。

在前面 LMAX 使用 Disruptor 的案例图中，有 JournalConsumer、ReplicationConsumer 和 ApplicationConsumer 三个消费者监听了 Disruptor，这三个消费者将收到来了 Disruptor 的所有消息。

### 2.2 消费者依赖关系图

为了支持并发处理在实际业务场景中的需要，有时消费者直接需要做协调。再回到前面 LMAX 使用 Disruptor 的案例，在 journalling 和 replication 这两个消费者处理完成之前，有必要阻止业务逻辑消费者开始处理。我们称这个特征为 “gating”（或者更准确地说，该特征是 “gating” 的一种形式）。

首先，确保生产者数量不会超过消费者。这通过调用 RingBuffer.addGatingConsumers（）来将相关消费者添加到 Disruptor。其次，消费者依赖关系的实现是通过构建一个 SequenceBarrier，SequenceBarrier 拥有需要在它前面完成处理逻辑的消费者的 Sequence。

就拿前面 LMAX 使用 Disruptor 的案例来说，ApplicationConsumer 的 SequenceBarrier 拥有 JournalConsumer 和 ReplicationConsumer 这 2 个消费者的 Sequence，所以 ApplicationConsumer 对 JournalConsumer 和 ReplicationConsumer 的依赖关系可以从 SequenceBarrier 到 Sequence 的连接中看到。

Sequencer 和下游消费者的关系也需要注意。Sequencer 的一个角色就是发布的事件消息不能超出 Ring Buffer。这就要求下游消费者的 Sequence 不能小于 Ring Buffer 的 Sequence，也不能小于 Ring Buffer 的大小。

上面图中，因为 ApplicationConsumer 的 Sequence 必须要保证小于等于 JournalConsumer 和 ReplicationConsumer 的 Sequence，因此 Sequencer 只需要关心 ApplicationConsumer 的 Sequence。

### 2.3 内存预分配

Disruptor 的目标是低延迟，因此减少或者去除内存分配是必要的。在基于 Java 的系统中，目标是减少 STW 次数。

为了支持这一点，用户可以在 Disruptor 中预分配事件所需的内存。在预分配内存时，用户提供的 EventFactory 将对 Ring Buffer 的所有元素进行调用。当生产者向 Disruptor 发送新的事件消息时，Disruptor 的 API 允许用户使用构造好的对象，他们可以调用对象的方法或者更新对象的字段。Disruptor 需要确保并发安全。

### 2.4 无锁并发

Disruptor 实现低延迟的另一个关键方法时使用无锁算法，通过使用内存屏障和 CAS 来实现内存可见性和正确性。Disruptor 唯一使用锁的地方就是在 BlockingWaitStrategy。

## 3 调优选项

虽然大多数场景下 Disruptor 可以表现出优秀的性能，但是仍然有一些调优参数可以改进 Disruptor 的性能。

### 3.1 单个 / 多个生产者

```java
Disruptor<LongEvent> disruptor = new Disruptor(
 factory,
 bufferSize,
 DaemonThreadFactory.INSTANCE,
 ProducerType.SINGLE, 
 new BlockingWaitStrategy() 
);


```

上面是 disruptor 的构造函数，ProducerType.SINGLE 表示创建单生产者的 Sequencer，ProducerType.MULTI 表示创建多生产者的 Sequencer。

在并发系统中提高系统性能的最好方式是遵循单写原则。下面是官方的一个 disruptor 吞吐量测试结果，测试环境是 i7 Sandy Bridge MacBook Air。

单生产者：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131235871.png)

多生产者：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131235922.png)

### 3.2 等待策略

1.  BlockingWaitStrategy

disruptor 的默认等待策略是 BlockingWaitStrategy，这种策略使用锁和唤醒锁的 Condition 变量。

1.  SleepingWaitStrategy

跟 BlockingWaitStrategy 策略类似，他是通过 LockSupport.parkNanos(1) 方法来实现等待，不需要给 Condition 变量发送信号来唤醒等待。

主要适用于对延时要求不高的场景，比如异步打印日志。

1.  YieldingWaitStrategy

‌YieldingWaitStrategy 策略使用 Busy spin‌（不释放 CPU 资源，通过循环检查条件直到条件满足为止）技术来等待 sequence 增长到一个合适的值。在循环内部会调用 Thread#yield() 方法允许其他排队线程去执行。

这种策略主要用于通过消耗 CPU 来实现低延迟的场景。当 EventHandler 数量消息逻辑 CPU 核数并且对延迟要求较高时，可以考虑这种等待策略。

1.  BusySpinWaitStrategy

BusySpinWaitStrategy 是性能最高的等待策略，它适用于低延迟系统，但是对部署环境要求很高。

这种等待策略的唯一适用场景是当 EventHandler 数量消息逻辑 CPU 核数并且超线程被禁用。

### 4 官方示例

下面是一个官方示例。这个例子比较简单，就是生产者向消费者发送一个 long 类型的值。

1.  首先定义一个 Event。
    

```
public class LongEvent
{
    private long value;

    public void set(long value)
    {
        this.value = value;
    }

    @Override
    public String toString()
    {
        return "LongEvent{" + "value=" + value + '}';
    }
}


```

1.  为了能让 Disruptor 预分配内存，这里定义一个 LongEventFactory。
    

```
public class LongEventFactory implements EventFactory<LongEvent>
{
    @Override
    public LongEvent newInstance()
    {
        return new LongEvent();
    }
}


```

1.  创建一个消费者来处理事件
    

```
public class LongEventHandler implements EventHandler<LongEvent>
{
    @Override
    public void onEvent(LongEvent event, long sequence, boolean endOfBatch)
    {
        System.out.println("Event: " + event);
    }
}


```

1.  编写发送事件消息的逻辑
    

```
import com.lmax.disruptor.dsl.Disruptor;
import com.lmax.disruptor.RingBuffer;
import com.lmax.disruptor.examples.longevent.LongEvent;
import com.lmax.disruptor.util.DaemonThreadFactory;
import java.nio.ByteBuffer;

publicclass LongEventMain
{
    public static void main(String[] args) throws Exception
    {
        int bufferSize = 1024; 

        Disruptor<LongEvent> disruptor = 
                new Disruptor<>(LongEvent::new, bufferSize, DaemonThreadFactory.INSTANCE);

        disruptor.handleEventsWith((event, sequence, endOfBatch) ->
                System.out.println("Event: " + event)); 
        disruptor.start(); 


        RingBuffer<LongEvent> ringBuffer = disruptor.getRingBuffer(); 
        ByteBuffer bb = ByteBuffer.allocate(8);
        for (long l = 0; true; l++)
        {
            bb.putLong(0, l);
            ringBuffer.publishEvent((event, sequence, buffer) -> event.set(buffer.getLong(0)), bb);
            Thread.sleep(1000);
        }
    }
}


```

## 5 总结

作为一款高性能的内存队列，Disruptor 有不少优秀的设计思想值得我们学习，比如内存预分配、无锁并发。同时它的使用非常简单，推荐大家使用。

