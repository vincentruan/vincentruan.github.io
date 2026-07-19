---
title: "JDK 高版本特性总结与 ZGC 实践"
date: 2025-07-13 00:00:00
categories: Java
tags:
- JDK17
- ZGC
- Java新特性
- 垃圾回收
- 性能优化
- JVM调优
- 升级实践
description: "本文总结美团信息安全技术团队升级JDK 17的实践经验。升级后性能与稳定性大幅提升，机器成本降低10%。文章详细介绍JDK 17的语言特性、新API和工具，重点分享ZGC在安全领域的适用场景、效果分析和实现原理，以及升级过程中的安装兼容性、性能压测等实践经验。"
---

**总第 620** **篇 |** **2025 年第 017 篇**

美团信息安全技术团队核心服务升级 JDK 17 后，性能与稳定性大幅提升，机器成本降低了 10%。高版本 JDK 与 ZGC 技术令人惊艳，且 Java AI SDK 最低支持 JDK 17。本文总结了 JDK 17 的主要特性，然后重点分享了 JDK 17+ZGC 在安全领域的一些实践，希望能对大家有所帮助或启发。

<!-- more -->

**本文目录**

*   1. JDK 17 的主要特性
    

*   1.1 语言特性 [1]
    
*   1.2 新 API 和工具
    
*   1.3 性能优化与 Bug 修复
    

*   2. JDK17+ZGC 在安全领域的实践
    

*   2.1 美团 JDK 的现状
    
*   2.2 ZGC 适用场景
    
*   2.3 ZGC 效果
    
*   2.4 ZGC 实现原理简介
    

*   3. JDK17 升级实践过程
    

*   3.1 安装与兼容性问题
    
*   3.2 性能压测
    
*   3.3 JVM 参数
    

*   4. 总结
    

从一句调侃的话 “你发任你发，我用 Java 8！” 可以看出，在开发新项目时，Java 8 依然是大家的首选。美团 Java 8 服务占比超过 70%，可以说 Java 8 依然是绝对的主流。但是，我们在多个核心服务上遇到较多的性能问题，这些问题无法通过 JVM 参数微调来解决，为此我们对部分核心服务使用了 JDK 17，升级后服务性能和稳定性指标也得到巨大的飞跃，同时机器成本可以下降约 10%，升级 JDK 版本收益十分明显。

另外，目前正处在 AI 时代的爆发期，Java AI SDK 的最小支持版本为 JDK 17，这让升级 JDK 版本变得更具价值。接下来，期望跟大家一起探索 JDK 高版本和 ZGC 技术的奥秘，开启优化 Java 应用的新征程。

## **1. JDK 17 的主要特性** 

| 包含 JDK 9~17 等中间版本的特性。

从 JDK 8 直接升级到 JDK 17，以下是需要重点关注的特性，这些特性对开发效率、代码风格、性能优化和安全性都有显著影响。

### | 1.1 语言特性 [1]

#### 1.1.1 局部变量类型推断

使用 var 关键字来声明局部变量，而无需显式指定变量的类型。在 Java 17 中，可以使用局部变量类型推断的扩展来编写更简洁的代码。其他语言如 Golang 很早就支持了 var 变量。

```java
// JDK8
String str = "Hello world";

// JDK17
var str = "Hello world";

```

| 需要注意的是，Var 类型的局部变量仍然具有静态类型，一旦被推断出来，类型就会固定下来，并且不能重新赋值为不兼容的类型。

#### 1.1.2 密封类

它允许我们将类或接口的继承限制为一组有限的子类。如果想将类或接口的继承限制为一组有限的子类时，这非常有用。在下面的示例中，可以看到我们如何使用 sealed 关键字将类的继承限制为一组有限的子类。我们可以通过在类的声明前加上 sealed 关键字来将该类声明为密封类。然后，可以使用 permits 关键字列出该密封类允许继承的子类。这些子类必须直接或间接地继承自密封类。这样，只有在这个预定义的子类中，才能继承该密封类。

```java
//使用permits关键字列出了允许继承的子类Circle、Rectangle和Triangle
public sealed class Shape permits Circle, Rectangle, Triangle {
    // 省略实现
}

// 在与密封类相同的模块或包中 定义以下三个允许的子类， Circle，Square和：Rectangle
public final class Circle extends Shape {
    public float radius;
}
 
public non-sealed class Square extends Shape {
   public double side;
}   
 
public sealed class Rectangle extends Shape permits FilledRectangle {
    public double length, width;
}


```

#### 1.1.3 Record 类

Record 类的主要目的是提供一种更简洁、更安全的方式来定义不可变的数据载体类。它自动实现了常见的方法（如`equals()`、`hashCode()`、`toString()`和构造函数），从而减少了样板代码。

**特点**

*   **不可变性**：Record 类的字段默认是`final`的，因此 Record 类是不可变的。
    
*   **简洁性**：Record 类自动提供了构造函数、`equals()`、`hashCode()`和`toString()`方法，无需手动编写。
    
*   **组件访问**：Record 类的字段可以通过`recordName.fieldName`的方式直接访问。
    
*   **模式匹配**：Record 类支持模式匹配（Pattern Matching），可以与`instanceof`和`switch`表达式结合使用。
    

Record 类的定义非常简单，只需要使用`record`关键字，并声明字段类型和名称即可。例如：

```java

// 这里有一个包含两个字段的记录类
record Rectangle(double length, double width) { }

// 这个简洁的矩形声明等同于以下普通类
public final class Rectangle {
    private final double length;
    private final double width;

    public Rectangle(double length, double width) {
        this.length = length;
        this.width = width;
    }

    double length() { return this.length; }
    double width()  { return this.width; }

    // ...
    public boolean equals...
    public int hashCode...

    // ...
    public String toString() {...}
}


```

#### 1.1.4 switch 表达式优化

在 Java 17 中使用 switch 表达式时，不必使用关键字 break 来跳出 switch 语句，或 return 在每个 switch case 上使用关键字来返回值；相反，我们可以返回整个 switch 表达式。这种增强的 switch 表达式使整体代码看起来更清晰，更易于阅读。switch 打印一周中某一天的字母数量的语句。

**JDK 8**

```java

public enum Day { SUNDAY, MONDAY, TUESDAY,
    WEDNESDAY, THURSDAY, FRIDAY, SATURDAY; }

  // ...

    int numLetters = 0;
    Day day = Day.WEDNESDAY;
    switch (day) {
        case MONDAY:
        case FRIDAY:
        case SUNDAY:
            numLetters = 6;
            break;
        case TUESDAY:
            numLetters = 7;
            break;
        case THURSDAY:
        case SATURDAY:
            numLetters = 8;
            break;
        case WEDNESDAY:
            numLetters = 9;
            break;
        default:
            throw new IllegalStateException("Invalid day: " + day);
    }
    System.out.println(numLetters);


```

**JDK 17**

```java
  Day day = Day.WEDNESDAY;    
    System.out.println(
        switch (day) {
            case MONDAY, FRIDAY, SUNDAY -> 6;
            case TUESDAY                -> 7;
            case THURSDAY, SATURDAY     -> 8;
            case WEDNESDAY              -> 9;
            default -> throw new IllegalStateException("Invalid day: " + day);
        }
    ); 


```

#### 

1.1.5 文本块

在不使用转义序列的情况下创建多行字符串。在创建 SQL 查询或 JSON 字符串时非常有用。在下面的示例中，可以看到使用文本块时代码看起来更加简洁。

```java
// JDK8
String message = "'The time has come,' the Walrus said,\n" +
                 "'To talk of many things:\n" +
                 "Of shoes -- and ships -- and sealing-wax --\n" +
                 "Of cabbages -- and kings --\n" +
                 "And why the sea is boiling hot --\n" +
                 "And whether pigs have wings.'\n";

// 使用文本块可以消除大部分混乱：
String message = """
    'The time has come,' the Walrus said,
    'To talk of many things:
    Of shoes -- and ships -- and sealing-wax --
    Of cabbages -- and kings --
    And why the sea is boiling hot --
    And whether pigs have wings.'
    """;


```

**SQL 注解描述**

```java
// JDK8    
@Select("select distinct ta.host_name from tb_agent_info tai, tb_agent ta where 1=1 " +
        "and ta.host_name=tai.host_name and ta.status=1 and ta.master=1 and tai.report_pid_count > 0")
Set<String> queryAllJavaHost();

// JDK17
@Select("""
    SELECT DISTINCT ta.host_name
    FROM tb_agent_info tai, tb_agent ta
    WHERE 1=1
      AND ta.host_name = tai.host_name
      AND ta.status = 1
      AND ta.master = 1
      AND tai.report_pid_count > 0
 """)
 Set<String> queryAllJavaHost2();


```

*   **可读性更强**：文本结构清晰可见，无需处理转义字符或字符串连接。
    
*   **减少错误**：不需要手动添加换行符（\n），降低了出错的可能性。
    
*   **易于编辑**：可以直接复制粘贴格式化好的 JSON，而不需要额外的处理。
    
*   **保留缩进**：文本块会保留的缩进，使得其在 Java 代码中的呈现更加美观。
    

#### 1.1.6 模式匹配 instanceof 优化

它允许将 instanceof 运算符用作返回已转换对象的表达式。当我们使用嵌套的 if-else 语句时，这非常有用。在下面的示例中，可以看到我们如何使用 instanceof 运算符来捕获对象，而不是进行显式转换。

**JDK 8**

```java
Object obj = ...;

if (obj instanceof String) {
    String str = (String) obj;
    int length = str.length();
    System.out.println("字符串长度：" + length);
}


```

**JDK 17**

```java
Object obj = ...;

if (obj instanceof String str) {
    int length = str.length();
    System.out.println("字符串长度：" + length);
}


```

#### 1.1.7 NullPointerExceptions 的优化

对象空指针在日常开发中遇到的比较多，一般代码报错只能精确的某一行，如果该行的代码比较复杂，涉及到多个对象，往往不能直接确定是哪一个对象为空。

```java
public class NpeDemo { 
  public static void main(String[] args) { 
    Address address=new Address();
    User user=new User();
    user.setAddress(address);
    log.info(user.getAddress().getCity().toLowerCase()); 
  }
}


```

上面代码中的第 6 行链式调用，如果某一个环节出现空指针，将会抛出空指针的异常：

```java
Exception in thread "main" java.lang.NullPointerException 
  at NpeDemo.main(Main.java:6)


```

**使用 JDK 17**

```java
Exception in thread "main" java.lang.NullPointerException: 
Cannot invoke "String.toLowerCase()" because the return value of "Address.getCity()" is null 
  at NpeDemo.main(Main.java:6)


```

#### 1.1.8 集合、Stream 和 Optional 的增强

Java 在集合（Collections）、Stream API 和 Optional 类方面引入了许多增强功能。主要有：

**集合增强**：不可变集合：引入了创建不可变集合的便捷方法，如 List.of()、Set.of() 和 Map.of()。这些方法用于快速创建不可变集合，减少了代码量并提高了安全性。

```java
import java.util.*;

public class CollectionsDemo {
    public static void main(String[] args) {
        // 创建不可变list
        List<String> list = List.of("Java", "Golang", "Python");
        // 创建不可变set
        Set<String> set = Set.of("Java", "Golang", "Python");
        // 创建不可变map
        Map<String, Integer> map = Map.of("Java", 1, "Golang", 2, "Python", 3);
    }
}

```

**集合工厂方法**：Java 17 还引入了集合工厂方法，如 List.copyOf()、Set.copyOf() 和 Map.copyOf()，用于从现有集合创建不可变副本。

**Stream API 增强**：`takeWhile`和`dropWhile`：基于条件截取或跳过元素；`iterate`：支持终止条件的迭代；`ofNullable`：将可能为`null`的值转换为 Stream。

**Optional 增强**：`ifPresentOrElse`：值存在时执行操作，否则执行另一个操作；`or`：在值不存在时提供替代值；`stream`：将`Optional`转换为 Stream。

### | 1.2 新 API 和工具

#### 1.2.1 新的 HttpClient

可以使用`HttpClient`使用来发送请求并检索其响应。`HttpClient`可以通过`builder`来创建。该`newBuilder`方法返回一个构建器，用于创建默认`HttpClient`实现的实例。该构建器可用于配置每个客户端的状态，例如：首选协议版本（HTTP/1.1 或 HTTP/2）、是否遵循重定向、代理、身份验证器等。构建完成后，`HttpClient`是不可变的，可用于发送多个请求。

```java
// 同步示例
HttpClient client = HttpClient.newBuilder()
        .version(Version.HTTP_1_1)
        .followRedirects(Redirect.NORMAL)
        .connectTimeout(Duration.ofSeconds(20))
        .proxy(ProxySelector.of(new InetSocketAddress("proxy.example.com", 80)))
        .authenticator(Authenticator.getDefault())
        .build();
   HttpResponse<String> response = client.send(request, BodyHandlers.ofString());
   System.out.println(response.statusCode());
   System.out.println(response.body());  

// 异步示例
HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("https://foo.com/"))
        .timeout(Duration.ofMinutes(2))
        .header("Content-Type", "application/json")
        .POST(BodyPublishers.ofFile(Paths.get("file.json")))
        .build();
   client.sendAsync(request, BodyHandlers.ofString())
        .thenApply(HttpResponse::body)
        .thenAccept(System.out::println);  


```

如果不希望引入三方依赖（三方依赖漏洞和 Bug 等需要经常升级），可以使用 JDK 提供的原生的 httpClient API，适用场景`中间件`。

#### 1.2.2 打包工具 jpackage[2]

该工具将以 Java 应用程序和 Java 运行时镜像作为输入，生成包含所有必要依赖项的 Java 应用程序镜像。它能够生成特定平台格式的原生软件包，例如 Windows 上的 exe 文件或 macOS 上的 dmg 文件。每种格式都必须在其运行的平台上构建，不支持跨平台。该工具将提供一些选项，允许以各种方式定制打包的应用程序。该工具最大特点是无需单独安装 JDK 环境，例如用 JDK17 写了一个 MCP Server 工具，直接打包为可执行文件安装即可，减少环境依赖安装。

#### 1.2.3 进程相关 API[3]

进程管理功能得到了显著增强，`ProcessHandle`提供了更强大的功能来创建、监控和管理本地进程。这些改进使得 Java 程序能够更灵活地与操作系统交互，同时提供了更详细的进程信息和更强大的生命周期管理功能。

**1. 创建进程**

在 Java 中，创建新进程通常使用`ProcessBuilder`或`Runtime.getRuntime().exec()`。而 Java 17 上`ProcessHandle`提供了更强大的功能来管理这些进程。

```java
ProcessBuilder pb = new ProcessBuilder("echo", "Hello World!");
Process p = pb.start();


```

**2. 监控进程**

```java
public class ProcessTest {

  // ...

  static public void startProcessesTest() throws IOException, InterruptedException {
    List<ProcessBuilder> greps = new ArrayList<>();
    greps.add(new ProcessBuilder("/bin/sh", "-c", "grep -c \"java\" *"));
    greps.add(new ProcessBuilder("/bin/sh", "-c", "grep -c \"Process\" *"));
    greps.add(new ProcessBuilder("/bin/sh", "-c", "grep -c \"onExit\" *"));
    ProcessTest.startSeveralProcesses (greps, ProcessTest::printGrepResults);      
    System.out.println("\nPress enter to continue ...\n");
    System.in.read();  
  }

  static void startSeveralProcesses (
    List<ProcessBuilder> pBList,
    Consumer<Process> onExitMethod)
    throws InterruptedException {
    System.out.println("Number of processes: " + pBList.size());
    pBList.stream().forEach(
      pb -> {
        try {
          Process p = pb.start();
          System.out.printf("Start %d, %s%n",
            p.pid(), p.info().commandLine().orElse("<na>"));
          p.onExit().thenAccept(onExitMethod);
        } catch (IOException e) {
          System.err.println("Exception caught");
          e.printStackTrace();
        }
      }
    );
  }
  
  static void printGrepResults(Process p) {
    System.out.printf("Exit %d, status %d%n%s%n%n",
      p.pid(), p.exitValue(), output(p.getInputStream()));
  }

  private static String output(InputStream inputStream) {
    String s = "";
    try (BufferedReader br = new BufferedReader(new InputStreamReader(inputStream))) {
      s = br.lines().collect(Collectors.joining(System.getProperty("line.separator")));
    } catch (IOException e) {
      System.err.println("Caught IOException");
      e.printStackTrace();
    }
    return s;
  }

  // ...
}

```

**3. 获取进程信息**

```java
public static void getInfoTest() throws IOException {
        ProcessBuilder pb = new ProcessBuilder("echo", "Hello World!");
        String na = "<not available>";
        Process p = pb.start();
        ProcessHandle.Info info = p.info();
        System.out.printf("Process ID: %s%n", p.pid());
        System.out.printf("Command name: %s%n", info.command().orElse(na));
        System.out.printf("Command line: %s%n", info.commandLine().orElse(na));

        System.out.printf("Start time: %s%n",
            info.startInstant().map((Instant i) -> i
                .atZone(ZoneId.systemDefault()).toLocalDateTime().toString())
                .orElse(na));

        System.out.printf("Arguments: %s%n",
            info.arguments().map(
                (String[] a) -> Stream.of(a).collect(Collectors.joining(" ")))
                .orElse(na));

        System.out.printf("User: %s%n", info.user().orElse(na));
}

输出
Process ID: 18761
Command name: /usr/bin/echo
Command line: echo Hello World!
Start time: 2017-05-30T18:52:15.577
Arguments: <not available>
User: administrator

```

#### 1.2.4 AI 工具最低版本为 JDK17

最近火热的 AI 大模型工具，JDK 8 不再兼容，运行的最低版本为 JDK 17，例如 Spring AI 工具。

### | 1.3 性能优化与 Bug 修复

#### 1.3.1 垃圾回收器改进 ZGC

ZGC 作为新一代的垃圾回收器，主要目标：

*   支持 TB 级内存
    
*   停顿时间控制在 10ms 之内
    
*   对程序吞吐量影响小于 15%
    

据官方测评数据，在内存为 128GB 的机器上，相比于 G1 来说，性能提高 30%，停顿时间减少 99%。

#### 1.3.2 NIO 重写与优化

*   **支持 Unix-Domain 套接字**：在 JDK8 上如果想要使用 UDS，一般使用 Netty 或者开源的 Juds 库，JDK 17 支持了该功能，无需使用第三方库；
    
*   **文件通道的优化**：可以将文件的某个区域直接映射到内存中，从而实现高效的读写操作。这种方式利用了操作系统的内存映射机制，减少了 I/O 操作的开销；
    
*   **零拷贝支持**：允许数据直接从磁盘的一个位置复制到另一个位置，而无需经过用户态内存。这减少了数据在用户态和内核态之间的拷贝次数，从而显著提高了性能。
    

#### 1.3.3 Java SDK 模块化设计

JVM 的模块化是 Java 9 引入的一个重要特性，通过 Java Platform Module System (JPMS) 实现。这一特性旨在解决 Java 应用在可扩展性和维护上的问题，提供更高级别的封装和依赖管理机制。

*   **减少环境资源开销**：在 JDK 9 之前，每次启动 JVM 都要耗费至少 30MB 到 60MB 的内存空间，因为 JVM 需要加载整个 rt.jar。模块化允许 JVM 选择性地加载必需的模块，从而减少内存占用。
    
*   **提升开发效率和运行速度**：随着代码库的复杂性增加，开发效率和运行速度会受到影响。模块化通过规范化路径和依赖关系，使系统更安全、更高效。
    
*   **规范化路径及依赖关系**：JDK 9 之前，系统没有对不同 JAR 之间的依赖或敏感路径进行限制，导致所有 JAR 都可以被访问，暴露了安全问题。模块化通过管理模块间的依赖关系，隐藏不必要的模块，提高了安全性和空间利用率。
    

#### 1.3.4 Java Agent 机制的 Attach Bug 修复

Java Attach Socket 文件被删除后会导致 Java Agent 注入失败，在 JDK 8 上只能通过重启解决，而 JDK 17 会重新创建一个新的文件。

#### 1.3.5 弹性元空间 [4]

更及时地将未使用的元空间内存回收，减少元空间占用的内存。

## **2. JDK17+ZGC 在安全领域的实践**

### | 2.1 美团 JDK 的现状

在美团信息安全部，JDK8（Oracle JDK8u201）依然是主流版本，其次是 Open JDK17，剩下为 Open JDK 11。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/1752378637823.png)

### | 2.2 ZGC 适用场景

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/1752378637967.png)

*   服务器成本压力大：服务器数量大于 100 台、单机配置大于 16C16G、Java 堆内存超过 16G 等。
    
*   单机 CPU 高：峰值大约在 50%
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131211468.png)

*   性能火焰图中 GC 占比高
    
*   高峰期故障雷达、监控大盘和服务日志等告警频繁
    

### | 2.3 ZGC 效果

#### 2.3.1 性能压测效果

在测试服务不同接口中，ZGC 在高 QPS 场景中收益较大（服务的 QPS 超过 1 万）：

*   **TP9999**：下降 220~380ms，下降幅度 18%~74%。
    
*   **TP999**：下降 60-125ms，下降幅度 10%~63%。
    
*   **TP99**：下降 3ms-20ms，下降幅度 0%-25%。
    

一些重度依赖外部的接口中性能优化不大，原因是这些服务的响应时间瓶颈不是 GC，而是外部依赖的性能，在一些低 QPS 接口中对比不太明显。

#### 2.3.2 案例 1：智能决策系统（JDK 11+ZGC 升级到 JDK 17+ZGC）

**峰值 cpu.busy 指标下降**

升级前: 47.8565%

![](<https://raw.githubusercontent.com/vincentruan/picgo/main/img/1752378638234.png>)

升级后: 41.4933%

![](<https://raw.githubusercontent.com/vincentruan/picgo/main/img/1752378638400.png>)

**系统长期运行时 TP9999 性能稳定**

运行 15 天，JDK11 机器长时间不重启三九、四九线会逐渐升高，JDK 17 机器较为稳定。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752378638586.png)

**服务失败率显著降低**

UGC 集群升级效果：错误数量由峰值 6000 下降到 349。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131204903.png)

**JVM 元空间使用降低**

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131204396.png)

**单机维度高峰期性能指标**

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752378639024.png)

#### 2.3.3 案例 2：内容安全核心服务 (JDK 8+CMS 升级到 JDK 17+ZGC）

该服务是内容安全的代理层，主要负责匹配请求的分发、辅助功能支撑（日志、监控、熔断）以及一些个性化业务需求。当前该服务 GC 是 CMS，该服务线上的 Young GC 平均耗时是 17ms，平均每分钟 GC 次数是 6 次，该服务接口平均响应时间是 2.6ms。

根据文章《[从实际案例聊聊 Java 应用的 GC 优化](https://tech.meituan.com/2017/12/29/jvm-optimize.html)》中提供的计算方式，受到 Young GC 影响的请求占比是：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752378639164.png)

即有 0.196% 的请求收到 GC 时间 0-17ms 不等的影响。其中收到 GC 停顿完整影响的请求占比：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752378639298.png)

即其中有 0.026% 的请求受到完整的 GC 停顿时间影响，即耗时增加 17ms，可以大致理解为请求响应的 9999 线会因 GC 停顿而导致 17ms 的上涨。

根据 ZGC 的 STW 的耗时在毫秒甚至亚毫秒级别，因此理论上升级后服务的 9999 线可以降低 17ms 左右。在实际生产中，还会有 Full GC 的影响，会带来耗时的进一步提升，ZGC 在该部分可以避免 Full GC 带来的影响。

服务升级采用的是 Tomcat 9+JDK 17 的配置，录制线上流量进行压测，使用同样的流量对先前采用 CMS 垃圾回收的以及采用 ZGC 垃圾回收方式的同时进行压测。服务器配置均为 8C16G，800QPS 的压测，通过 2h 左右的压测。

**分析接口耗时统计**：可得到以下数据，发现耗时均有明显下降，9999 线的下降量低于理论的 17ms，由于实际环境中其他因素的影响也基本符合预期。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131204174.png)

分析 CPU 和 JVM 占用情况：CPU 和 JVM 占用情况发现，CPU 占用在峰值处会提升 10% 左右，JVM 占用情况基本一致。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1752378639647.png)

### | 2.4 ZGC 实现原理简介

更多详情，可参考《[新一代垃圾回收器 ZGC 的探索与实践](https://tech.meituan.com/2020/08/06/new-zgc-practice-in-meituan.html)》一文。

#### 2.4.1 CMS 与 G1 停顿时间瓶颈

在介绍 ZGC 之前，首先回顾一下 CMS 和 G1 的 GC 过程以及停顿时间的瓶颈。CMS 新生代的 Young GC、G1 和 ZGC 都基于标记 - 复制算法，但算法具体实现的不同就导致了巨大的性能差异。

标记 - 复制算法应用在 CMS 新生代（ParNew 是 CMS 默认的新生代垃圾回收器）和 G1 垃圾回收器中。标记 - 复制算法可以分为三个阶段：

*   **标记阶段**，即从 GC Roots 集合开始，标记活跃对象；
    
*   **转移阶段**，即把活跃对象复制到新的内存地址上；
    
*   **重定位阶段**，因为转移导致对象的地址发生了变化，在重定位阶段，所有指向对象旧地址的指针都要调整到对象新的地址上。
    

下面以 G1 为例，通过 G1 中标记 - 复制算法过程（G1 的 Young GC 和 Mixed GC 均采用该算法），分析 G1 停顿耗时的主要瓶颈。G1 垃圾回收周期如下图所示：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131205613.png)

G1 的混合回收过程可以分为标记阶段、清理阶段和复制阶段：

**标记阶段停顿分析**

*   **初始标记阶段**：初始标记阶段是指从根节点（GC Roots）出发标记全部直接子节点的过程，该阶段是 STW 的。由于 GC Roots 数量不多，通常该阶段耗时非常短。
    
*   **并发标记阶段**：并发标记阶段是指从 GC Roots 开始对堆中对象进行可达性分析，找出存活对象。该阶段是并发的，即应用线程和 GC 线程可以同时活动。并发标记耗时相对长很多，但因为不是 STW，所以我们不太关心该阶段耗时的长短。
    
*   **再标记阶段**：重新标记那些在并发标记阶段发生变化的对象。该阶段是 STW 的。
    

**清理阶段停顿分析**

*   清理阶段清点出有存活对象的分区和没有存活对象的分区，该阶段不会清理垃圾对象，也不会执行存活对象的复制。该阶段是 STW 的。
    

**复制阶段停顿分析**

*   复制算法中的转移阶段需要分配新内存和复制对象的成员变量。转移阶段是 STW 的，其中内存分配通常耗时非常短，但对象成员变量的复制耗时有可能较长，这是因为复制耗时与存活对象数量与对象复杂度成正比。对象越复杂，复制耗时越长。
    

四个 STW 过程中，初始标记因为只标记 GC Roots，耗时较短。再标记因为对象数少，耗时也较短。清理阶段因为内存分区数量少，耗时也较短。转移阶段要处理所有存活的对象，耗时会较长。因此，G1 停顿时间的瓶颈主要是标记 - 复制中的转移阶段 STW。为什么转移阶段不能和标记阶段一样并发执行呢？主要是 G1 未能解决转移过程中准确定位对象地址的问题。

#### 2.4.2 ZGC 原理

与 CMS 中的 ParNew 和 G1 类似，ZGC 也采用标记 - 复制算法，不过 ZGC 对该算法做了重大改进：**ZGC 在标记、转移和重定位阶段几乎都是并发的**，这是 ZGC 实现停顿时间小于 10ms 目标的最关键原因。

ZGC 垃圾回收周期如下图所示：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131205657.png)

ZGC 只有三个 STW 阶段：**初始标记，再标记，初始转移**。其中，初始标记和初始转移分别都只需要扫描所有 GC Roots，其处理时间和 GC Roots 的数量成正比，一般情况耗时非常短；再标记阶段 STW 时间很短，最多 1ms，超过 1ms 则再次进入并发标记阶段。即，ZGC 几乎所有暂停都只依赖于 GC Roots 集合大小，停顿时间不会随着堆的大小或者活跃对象的大小而增加。与 ZGC 对比，G1 的转移阶段完全 STW 的，且停顿时间随存活对象的大小增加而增加。

#### 2.4.3 主要特点

*   **单代**：ZGC 没有分代，基于 “大部分对象朝生夕死” 的假设，没有 Young GC 的概念（这里仅指 JDK 17，JDK 21 支持分代回收，性能更高）。
    
*   **基于 Region**：G1 的每个 Region 大小是完全一样的，而 ZGC 的 Region 更灵活，其中大型 Region 大小不固定, 可以动态变化，也不会被重分配，因为复制一个大对象代价太高。
    
*   **部分压缩**：基于 Region，“标记 - 整理”，相对 CMS 压缩时间更短。
    
*   **支持 NUMA**：对应有 UMA，每个 CPU 对应有一块内存，每个 CPU 优先访问这块内存。
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131206642.png)

*   **染色指针**
    

![](https://raw.githubusercontent.com/vincentruan/picgo/main/img/202507131212757.png)

以前的垃圾回收器的 GC 信息都保存在对象头中，ZGC 将 GC 信息保存在了染色指针上, 无需进行对象访问就可以获得 GC 信息。这就是 ZGC 在标记和转移阶段速度更快的原因。Marked0、Marked1 和 Remapped 这三个虚拟内存作为 ZGC 的三个视图空间，在同一个时间点内只能有一个有效。ZGC 就是通过这三个视图空间的切换，来完成并发的垃圾回收。

*   **读屏障**
    

读屏障，在标记和移动对象的阶段，每次从堆里对象的引用类型中读取一个指针的时候，都需要加上一个 Load Barriers。用于确定对象的引用地址是否满足条件，并作出相应动作。

## **3. JDK17 升级实践过程** 

主要分为三个阶段：安装部署、解决兼容性问题、性能测试与参数优化。

| 如果公司的中间件大部分基于 JDK 8，工程代码编译可以基于 JDK 8，运行环境使用 JDK 17。

### | 3.1 安装与兼容性问题

**1. 主要的问题举例**

JVM 运行的报错信息：module java.base does not "opens java.util.concurrent.locks" to unnamed module。

```java
[ERROR] main JsonUtil Json parse failed
java.lang.reflect.InaccessibleObjectException: Unable to make field private final java.util.concurrent.locks.ReentrantReadWriteLock$ReadLock java.util.concurrent.locks.ReentrantReadWriteLock.readerLock accessible: module java.base does not "opens java.util.concurrent.locks" to unnamed module @1ba9117e
 at java.base/java.lang.reflect.AccessibleObject.checkCanSetAccessible(AccessibleObject.java:354)
 at java.base/java.lang.reflect.AccessibleObject.checkCanSetAccessible(AccessibleObject.java:297)
 at java.base/java.lang.reflect.Field.checkCanSetAccessible(Field.java:178)
 at java.base/java.lang.reflect.Field.setAccessible(Field.java:172)
 at com.fasterxml.jackson.databind.util.ClassUtil.checkAndFixAccess(ClassUtil.java:939)
 at com.fasterxml.jackson.databind.deser.impl.FieldProperty.fixAccess(FieldProperty.java:104)


```

**2. 原因**：JDK9 之后 Java API 使用了模块化设计方案，用户模块无法反射调用 Java 代码，需要使用开启对应模块访问权限（没有引入新的安全问题，相当于没有用模块隔离的功能）。

**3. 解决方式**：　JVM 参数增加如下：

```
--add-opens java.base/java.lang=ALL-UNNAMED --add-opens java.base/java.io=ALL-UNNAMED --add-opens java.base/java.math=ALL-UNNAMED --add-opens java.base/java.net=ALL-UNNAMED --add-opens java.base/java.nio=ALL-UNNAMED --add-opens java.base/java.security=ALL-UNNAMED --add-opens java.base/java.text=ALL-UNNAMED --add-opens java.base/java.time=ALL-UNNAMED --add-opens java.base/java.util=ALL-UNNAMED --add-opens java.base/java.util.concurrent=ALL-UNNAMED --add-opens java.base/java.util.concurrent.locks=ALL-UNNAMED --add-opens java.base/java.util.concurrent.atomic=ALL-UNNAMED --add-opens java.base/jdk.internal.access=ALL-UNNAMED --add-opens java.base/jdk.internal.misc=ALL-UNNAMED


```

其他软件等兼容性问题，根据自身服务报错，对应解决问题。

### | 3.2 性能压测

*   **基准**：JDK 8+CMS
    
*   **压测**：实验组和对照组压测后重启避免性能优化为结果影响并取平均值
    
*   **指标监控**：峰值 CPU、平均 CPU、TP9999、报错数量、GC 总时间和次数、JVM 堆内存和元空间变化等
    
*   **其他**：性能火焰图
    

### | 3.3 JVM 参数

*   -Xmx18g -Xms18g 堆大小
    
*   -XX:MaxDirectMemorySize=2G 直接内存
    
*   -XX:+HeapDumpOnOutOfMemoryError 当 JVM 发生 OOM 时，自动生成 DUMP 文件。
    
*   -XX:ReservedCodeCacheSize=256m -XX:InitialCodeCacheSize=256m 设置 codecache 大小 默认 128m
    
*   -XX:+UseZGC 使用 ZGC
    
*   -XX:ZAllocationSpikeTolerance=2 ZGC 触发自适应算法的修正系数，默认 2，数值越大，越早的触发 ZGC
    
*   -XX:ZCollectionInterval=0 ZGC 的周期。默认值为 0，表示不需要触发垃圾回收。固定周期垃圾回收。ZGC 发生的最小时间间隔，单位秒
    
*   -XX:ConcGCThreads=4 并发阶段的 GC 线程数，默认是总核数的 12.5%
    
*   -XX:ZStatisticsInterval=10 控制统计信息输出的间隔，默认 10s
    
*   -XX:ParallelGCThreads=16 并行工作线程数据，STW 阶段使用线程数，默认是总核数的 60%
    
*   -Xlog:safepoint,classhisto*=trace,age*,gc*=info:file=/opt/logs/logs/gc-%t.log:time,tid,tags:filecount=5,filesize=50m' 设置 GC 日志中的内容、格式、位置以及每个日志的大小
    

本服务 prod 机器 16c，16g 成功运行起来的 JVM 参数（还在调整中，仅供参考）：

```
-server -Xmx12g -Xms12g -XX:+UnlockExperimentalVMOptions -XX:+UnlockDiagnosticVMOptions -XX:+UseZGC -XX:+UseDynamicNumberOfGCThreads -XX:ConcGCThreads=3 -XX:ParallelGCThreads=8 -XX:ZCollectionInterval=130 -XX:ZAllocationSpikeTolerance=1 -XX:MaxDirectMemorySize=460m -XX:MetaspaceSize=330m -XX:MaxMetaspaceSize=330m -XX:ReservedCodeCacheSize=256m -XX:InitialCodeCacheSize=256m -XX:+UseCountedLoopSafepoints -XX:+SafepointTimeout -XX:SafepointTimeoutDelay=500 -XX:GuaranteedSafepointInterval=0 -XX:+DisableExplicitGC -XX:+HeapDumpOnOutOfMemoryError -XX:ZStatisticsInterval=130 -XX:+PrintGCDetails -Xlog:safepoint,class+load=info,class+unload=info,classhisto*=trace,age*,gc*=info:file=/opt/logs/logs/gc-%t.log:time,tid,tags:filecount=5,filesize=50m --add-opens java.base/java.lang=ALL-UNNAMED --add-opens java.base/java.io=ALL-UNNAMED --add-opens java.base/java.math=ALL-UNNAMED --add-opens java.base/java.net=ALL-UNNAMED --add-opens java.base/java.nio=ALL-UNNAMED --add-opens java.base/java.security=ALL-UNNAMED --add-opens java.base/java.text=ALL-UNNAMED --add-opens java.base/java.time=ALL-UNNAMED --add-opens java.base/java.util=ALL-UNNAMED --add-opens java.base/java.util.concurrent=ALL-UNNAMED --add-opens java.base/java.util.concurrent.locks=ALL-UNNAMED --add-opens java.base/java.util.concurrent.atomic=ALL-UNNAMED --add-opens java.base/jdk.internal.access=ALL-UNNAMED --add-opens java.base/jdk.internal.misc=ALL-UNNAMED --add-opens java.base/sun.reflect.generics.reflectiveObjects=ALL-UNNAMED --add-opens java.base/jdk.internal.perf=ALL-UNNAMED --add-opens java.base/java.instrument=ALL-UNNAMED --add-opens jdk.attach/sun.tools.attach=ALL-UNNAMED 


```

## **4. 总结** 

*   ZGC 作为新一代垃圾回收器，各项性能指标都比较突出，升级之后，机器成本和性能收益明显；
    
*   Spring AI SDK 支持的 JDK 版本最小为 17，升级到 JDK 17 能更好地拥抱 AI 新技术；
    
*   直接从 JDK 8 升级到 JDK 17 跨度较大，需要解决的兼容性问题较多，如果公司的基础组件不支持 JDK 17，可以考虑先升级到 JDK 11 做一个过渡；
    
*   如果在升级与实践的过程中遇到了一些问题，可以结合 AI 大模型来给出解决方案，帮助提高升级效率。
    



[1] [语言特性](https://docs.oracle.com/en/java/javase/17/language/java-language-changes-summary.html)

[2] 打包工具 [jpackage](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jpackage.html)

[3] 进程相关 [API](https://docs.oracle.com/en/java/javase/17/core/process-api1.html)

[4] [弹性元空间](https://openjdk.org/jeps/387)

[5] TP999：指的是 OctoService.TP999

[6] [TP9999](https://malloc.se/blog/zgc-jdk16)
