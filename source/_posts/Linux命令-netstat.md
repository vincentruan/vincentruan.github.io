---
title: Linux命令 - netstat
date: 2020-01-27 12:44:15
categories: Linux
tags:
- Linux
- netstat
---

# 概述

netstat 是一个告诉我们系统中所有 tcp/udp/unix socket 连接状态的命令行工具。它会列出所有已经连接或者等待连接状态的连接。 该工具在识别某个应用监听哪个端口时特别有用，我们也能用它来判断某个应用是否正常的在监听某个端口。

netstat 命令还能显示其它各种各样的网络相关信息，例如路由表， 网卡统计信息， 虚假连接以及多播成员等。

<!-- more -->

# 1 - 检查所有的连接

使用 `a` 选项可以列出系统中的所有连接，

```
$ netstat -a
```

这会显示系统所有的 tcp、udp 以及 unix 连接。

# 2 - 检查所有的 tcp/udp/unix socket 连接

使用 `t` 选项只列出 tcp 连接，

```shell
$ netstat -at
```

类似的，使用 `u` 选项只列出 udp 连接，

```shell
$ netstat -au
```

使用 `x` 选项只列出 Unix socket 连接，

```shell
$ netstat -ax
```

# 3 - 同时列出进程 ID/进程名称

使用 `p` 选项可以在列出连接的同时也显示 PID 或者进程名称，而且它还能与其他选项连用，

```shell
$ netstat -ap
```

# 4 - 列出端口号而不是服务名

使用 `n` 选项可以加快输出，它不会执行任何反向查询（LCTT 译注：这里原文有误），而是直接输出数字。 由于无需查询，因此结果输出会快很多。

```shell
$ netstat -an
```

# 5 - 只输出监听端口

使用 `l` 选项只输出监听端口。它不能与 `a` 选项连用，因为 `a` 会输出所有端口，

```shell
$ netstat -l
```

# 6 - 输出网络状态

使用 `s` 选项输出每个协议的统计信息，包括接收/发送的包数量，

```shell
$ netstat -s
```

# 7 - 输出网卡状态

使用 `I` 选项只显示网卡的统计信息，

```shell
$ netstat -i
```

# 8 - 显示多播组multicast group信息

使用 `g` 选项输出 IPV4 以及 IPV6 的多播组信息，

```shell
$ netstat -g
```

# 9 - 显示网络路由信息

使用 `r` 输出网络路由信息，

```shell
$ netstat -r
```

# 10 - 持续输出

使用 `c` 选项持续输出结果

```shell
$ netstat -c
```

# 11 - 过滤出某个端口

与 `grep` 连用来过滤出某个端口的连接，

```shell
$ netstat -anp | grep 3306
```

# 12 - 统计连接个数

通过与 `wc` 和 `grep` 命令连用，可以统计指定端口的连接数量

```shell
$ netstat -anp | grep 3306 | wc -l
```
这会输出 mysql 服务端口（即 3306端口）的连接数。