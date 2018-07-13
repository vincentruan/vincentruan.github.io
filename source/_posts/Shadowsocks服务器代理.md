---
title: Shadowsocks服务器代理
date: 2018-07-13 22:58:47
categories: developer tools
tags:
- Shadowsocks
---

## 前言

Shadowsocks Server支持直连因特网，或者通过代理方式（http/sock v4/5)连接因特网.



![1531388960253](Shadowsocks服务器代理\1531388960253.png)



这里主要阐述服务端通过proxy连接的解决方案，shadowsocks server直连网络的方式比较简单，网上这块资料也比较齐全，不做过多描述，



## ssserver代理安装配置

### 安装Shadowsocks Server

参考[Install Shadowsocks Server on Windows](https://github.com/shadowsocks/shadowsocks/wiki/Install-Shadowsocks-Server-on-Windows)，

客户端的安装方式参考[Shadowsocks Client安装](https://github.com/shadowsocks/shadowsocks/wiki/Ports-and-Clients#windows), 这里主要解决服务端通过代理解决shadowsocks server无法直连网络的问题，客户端这块不做过多描述。

### 更新代理脚本

​	这个问题的解决方案来自github的一个issue [通过猴子补丁的方式给ss添加了一个前置代理的功能](https://github.com/shadowsocks/shadowsocks/issues/771)

有兴趣深入了解的推荐star一下该作者的项目[PySocket](https://github.com/falseen/PySocket)

​	在上述步骤安装了python版的Shadowsocks Server之后，通过猴子补丁的方式给给 shadowsocks 服务端添加前置代理的功能（原则上也适用于客户端），支持 http、socks4、socks5 代理。并且通过 hook 的方式去掉了ss的dns查询，ss在接收到数据之后会直接把域名和请求一起发给代理。

**使用的时候修改 socket.py 文件中 PROXY_TYPE、PROXY_ADDR、PROXY_PORT 等字段为你的代理地址，然后把 socket.py 文件放到 shadowsocks 根目录即可生效，不用修改任何源码**。

通过pip安装的话要放到ssserver所在的目录，一般都在 `Python27\Scripts` （python27上验证OK）

```shell
pip install win_inet_pton --proxy=http://your-proxy-host:your-proxy-port
pip install shadowsocks --proxy=http://your-proxy-host:your-proxy-port
```

配置部分：

```python
# the proxy type. SOCKS5 SOCKS4 HTTP
PROXY_TYPE = SOCKS5
PROXY_ADDR = "127.0.0.1"
PROXY_PORT = 1080
```

**socket.py** 文末部分，因为我选择 hook shadowsocks的代码，实际使用时在del module会报异常，因此将文末修改为

```python
# hook shadowsocks's code remove the dns req
def new_resolve(self,  hostname, callback):
    callback((hostname, hostname), None)

modules_list = ["shadowsocks.common", "shadowsocks.shell"]
for x in modules_list:
    try:
       del sys.modules[x]
    except KeyError:
       print "Error: key", x, "not found"

import shadowsocks.asyncdns
shadowsocks.asyncdns.DNSResolver.resolve = new_resolve
```

如果不想 hook shadowsocks的代码的话，把文件中末尾的代码删除即可，原文件代码末尾如下: 

```python
# hook shadowsocks's code remove the dns req
def new_resolve(self,  hostname, callback):
    callback((hostname, hostname), None)

modules_list = ["shadowsocks.common", "shadowsocks.shell"]
for x in modules_list:
    del sys.modules[x]

import shadowsocks.asyncdns
shadowsocks.asyncdns.DNSResolver.resolve = new_resolve
```

### ssserver配置

参考[Configuration via Config File](https://github.com/shadowsocks/shadowsocks/wiki/Configuration-via-Config-File)

创建一个配置文件 `/etc/shadowsocks.json`. 示例如下:

```json
{
    "server":"my_server_ip",
    "server_port":8388,
    "local_address": "127.0.0.1",
    "local_port":1080,
    "password":"mypassword",
    "timeout":300,
    "method":"aes-256-cfb",
    "fast_open": false
}
```

配置文件字段详解:

| Name          | Explanation                                                  |
| ------------- | ------------------------------------------------------------ |
| server        | ssserver监听地址，0.0.0.0监听本地所有网卡地址                |
| server_port   | ssserver服务端口                                             |
| local_address | 本地监听地址                                                 |
| local_port    | 本地端口                                                     |
| password      | 用于加密的密码                                               |
| timeout       | 超时设置，单位秒，不建议太长                                 |
| method        | 默认: "aes-256-cfb", 详见 [Encryption](https://github.com/shadowsocks/shadowsocks/wiki/Encryption) |
| fast_open     | 是否使用 [TCP_FASTOPEN](https://github.com/shadowsocks/shadowsocks/wiki/TCP-Fast-Open), true / false |
| workers       | worker数量, 仅在Unix/Linux生效                               |

在控制台中执行，日志直接显示在控制台，首次测试使用建议该方式，可通过ctrl+C退出:

```
ssserver -c /etc/shadowsocks.json
```

后台静默执行:

```
# 启动服务
ssserver -c /etc/shadowsocks.json -d start
# 停止服务
ssserver -c /etc/shadowsocks.json -d stop
```