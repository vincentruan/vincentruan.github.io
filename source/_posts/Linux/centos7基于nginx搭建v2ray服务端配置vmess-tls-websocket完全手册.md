---
title: centos7基于nginx搭建v2ray服务端配置vmess+tls+websocket完全手册
date: 2020-06-07 21:36:21
categories: LINUX
tags:
- v2ray
- 科学上网
---

> 文章转载自[centos7基于nginx搭建v2ray服务端配置vmess+tls+websocket完全手册](https://www.4spaces.org/v2ray-nginx-tls-websocket/)，根据实际搭建情况，略有修改

一直都是使用[自建shadowsocks科学上网](https://www.4spaces.org/0-1-shadowsocks-start/)，服务很稳定，虽然v2ray出现了很久，但是没花心思研究两者之间有什么区别。后来无意间查询自己手机的上网记录，出现下图信息，我感觉还是让上网更隐蔽一点更好。

> 注意：使用下文的方法出现rejected  v2ray.com/core/proxy/vmess/encoding: invalid user，搞不通，有空再验证试试

<!-- more -->

![shadowsocks-tcp.jpg](centos7基于nginx搭建v2ray服务端配置vmess-tls-websocket完全手册/shadowsocks-tcp.jpg)

怎么让手机上网记录看起来更正常一点呢？v2ray服务端配置vmess+tls+websocket就是一种解决方式，下面是我使用这种方式之后手机上网记录信息：

![v2ray-ssl上网记录](centos7基于nginx搭建v2ray服务端配置vmess-tls-websocket完全手册/v2ray-ssl.jpg)

接下来就是我实现上述情形的解决过程记录。

## 环境准备

- VPS : [推荐一下搬瓦工：史上最详细搬瓦工VPS注册/购买图文教程(内附优惠券)](https://www.4spaces.org/best-details-to-buy-banwagonhost/)；
- 一个域名，推荐去godaddy注册，注册之前最好找一下优惠券；
- vps部署Nginx并启用tls安装证书；

相关文章推荐：

- [如何在Digitalocean上构建一个服务器？](https://www.4spaces.org/create-a-dg-account-and-connect-droplets/)
- [CentOS 7通过yum安装Nginx](https://www.4spaces.org/centos-yum-install-nginx/)
- [Nginx启用Let’s Encrypt SSL证书。](https://www.4spaces.org/nginx-lets-encrypt-ssl/)

请继续下一步之前，先依次完成下列步骤：

- 注册一个自己的VPS服务器；
- 注册一个自己的域名并解析到自己的VPS；(可通过[noip](https://www.noip.com/)免费获取三个域名)
- 登录VPS并安装部署Nginx；
- 完成域名的https SSL安全证书启用；

只有完成上面的步骤在继续下面操作，才能实现v2ray服务端配置vmess+tls+websocket。

我的环境：

- 服务器系统：Digitalocean CentOS 7.5 x64 ；
- v2ray版本：v4.17.0；
- nginx版本：nginx/1.14.2 (CentOS)；
- 证书：Let’s Encrypt certbot-0.31.0；
- v2rayN：2.22

## 安装v2ray

安装过程很简单，只要能正常连接自己的VPS并进行登录，然后执行一下安装命令即可，安装过程参考：[2020年最新v2ray搭建详细图文教程(从小白到老炮)](https://www.4spaces.org/build-v2ray-from-0-to-1/)，重要的接下来的配置过程。

## 配置v2ray服务端

假设你的域名是v2ray.com，并将二级域名`hi.v2ray.com`解析到你的VPS。

执行下面的命令，开始配置v2ray:

```shell
[root@ss-us ~]# vi /etc/v2ray/config.json 
```

按`i`键编辑文件，把内容更改为下面的内容：【注意这里要执行】

```json
{
  "log": {
    "access": "/var/log/v2ray/access.log",
    "error": "/var/log/v2ray/error.log",
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "port": 33684,
      "listen": "127.0.0.1",
      "protocol": "vmess",
      "settings": {
        "clients": [
          {
            "id": "0c67ca68-63ad-40c5-898e-9cf1925c8694",
            "level": 1,
            "alterId": 64
          }
        ]
      },
      "streamSettings": {
        "network": "ws",
        "wsSettings": {
          "path": "/v2ray"
        }
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "settings": {}
    },
  ]
}
```

## 配置Nginx

执行下面的命令，开始配置nginx:

```shell
[root@ss-us ~]# vi /etc/nginx/conf.d/v2ray.conf 
```

按`i`键编辑文件，把内容更改为下面的内容：

```
server{
    listen 80;
    server_name hi.v2ray.com;
    root /etc/nginx/html;
    index index.html;

}

server {
    listen 443 ssl http2 default_server;
    server_name hi.v2ray.com;

    ssl_certificate /etc/letsencrypt/live/hi.v2ray.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hi.v2ray.com/privkey.pem;

    root /etc/nginx/html;
    index index.html;

    location /v2ray {
        proxy_redirect off;
        proxy_pass http://127.0.0.1:33684;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
    }
}
```

**注意：**

- `proxy_pass http://127.0.0.1:33684;` 这里的`33684`需要跟v2ray配置文件`config.json`端口对应；
- `root /etc/nginx/html`及`location /etc/nginx/html`行，需要与nginx实际根目录对应；

## 重启v2ray、nginx服务

```shell
systemctl restart v2ray

systemctl restart nginx
```

## 客户端界面配置

这里我是用[v2rayN](https://github.com/2dust/v2rayN/releases)，配置如下：

![v2rayn-config-windows.png](centos7基于nginx搭建v2ray服务端配置vmess-tls-websocket完全手册/v2rayn-config-windows.png)

![v2rayn-config-windows-1.png](centos7基于nginx搭建v2ray服务端配置vmess-tls-websocket完全手册/v2rayn-config-windows-1.png)

## 配置CloudFlare

注册CloudFlare账户并配置domain域名CDN 配置完了再用 curl 测试一下：

```
curl -i https://example.com/v2ray
HTTP/2 400
date: Sun, 12 Jan 2020 08:44:07 GMT
content-type: text/plain; charset=utf-8
content-length: 12
sec-websocket-version: 13
x-content-type-options: nosniff
cf-cache-status: DYNAMIC
expect-ct: max-age=604800, report-uri="https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct" server: cloudflare

Bad Request
```

同样也是出现 400 Bad Request 就对了。

如果你像我上面一样在 Nginx 中配置了 `$http_upgrade = "websocket"` 的判断的话，这里返回的会是用于伪装的那个页面（而且 Nginx 的 `$http_upgrade` 变量不知道是按什么赋值的，直接 `curl --header "Upgrade: websocket"` 的话还不认，怪得很）。可以使用 `wscat` 来测试：

```
wscat -c wss://example.com/whatever
Connected (press CTRL+C to quit)
```

这里因为我的域名用的noip分配的免费域名，因此没连接成功，如果需要真实搭建的，可以参考这篇[文章](https://zhuanlan.zhihu.com/p/63866401)搞个最便宜的国外域名

## 常见问题

### 使用v2ray访问谷歌提示异常流量[没遇到]

按照这篇文章搭建了v2ray服务之后，又尝试启用cloudflare cdn来隐藏自己的真实IP，但是启用cdn之后就无法访问了。

![v2ray-cloudflare-cdn-403-error.jpg](centos7基于nginx搭建v2ray服务端配置vmess-tls-websocket完全手册/v2ray-cloudflare-cdn-403-error.jpg)

这是因为我增加了header伪装域名，去掉之后v2ray就能正常使用了。也就是cloudflare的cdn功能和v2ray的伪装功能不能同时使用。

另外：

**Cloudflare的“SSL/TLS”配置为”Full”或”Full(strict)”**。

### 启用cloudflare cdn之后v2ray报403错误

按照这篇文章【[centos7基于nginx搭建v2ray服务端配置vmess+tls+websocket完全手册](https://www.4spaces.org/v2ray-nginx-tls-websocket/)】搭建了v2ray服务之后，使用google搜索的时候经常提示：我们的系统检测到您的计算机网络中存在异常流量，需要进行人验证，对于离不开google的人来说比较烦人。

![v2ray-google-abnormal-traffic.jpg](centos7基于nginx搭建v2ray服务端配置vmess-tls-websocket完全手册/v2ray-google-abnormal-traffic.jpg)



网上出现的解决办法有：

1. 更换ip；
2. 配置v2ray让google走ipv6；
3. 配置v2ray让google走ipv4；
4. 更换域名，可能你的域名以前被不正当的使用过；

我是通过`配置v2ray让google走ipv4`+`更换域名`解决的。下面是配置让google走ipv4的配置：

```json
{
  "log": {
    "access": "/var/log/v2ray/access.log",
    "error": "/var/log/v2ray/error.log",
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "port": 33684,
      "listen": "127.0.0.1",
      "protocol": "vmess",
      "settings": {
        "clients": [
          {
            "id": "0c67ca68-63ad-40c5-898e-9cf1925c8694",
            "level": 1,
            "alterId": 64
          }
        ]
      },
      "streamSettings": {
        "network": "ws",
        "wsSettings": {
          "path": "/etc/nginx/html"
        }
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "settings": {},
      "tag": "direct"
    },
    {
      "protocol": "freedom",
      "settings": {
        "domainStrategy": "UseIPv4"
      },
      "tag": "ip4-out"
    },
    {
      "protocol": "blackhole",
      "settings": {},
      "tag": "blocked"
    }
  ],
  "routing": {
    "rules": [
      {
        "type": "field",
        "domain": [
          "domain:google.com"
        ],
        "outboundTag": "ip4-out"
      },
      {
        "type": "field",
        "ip": [
          "0.0.0.0/8",
          "10.0.0.0/8",
          "100.64.0.0/10",
          "127.0.0.0/8",
          "169.254.0.0/16",
          "172.16.0.0/12",
          "192.0.0.0/24",
          "192.0.2.0/24",
          "192.168.0.0/16",
          "198.18.0.0/15",
          "198.51.100.0/24",
          "203.0.113.0/24",
          "::1/128",
          "fc00::/7",
          "fe80::/10"
        ],
        "outboundTag": "blocked"
      }
    ]
  }
}
```

具体修改的地方有两个，一是增加了一个outbound，而是rules增加一个让google走刚增加的outbound

### 连接失败

access.log日志提示`rejected  v2ray.com/core/proxy/vmess/encoding: invalid user`

这里是因为没有重新配置/etc/v2ray/config.json，参考上面的配置v2ray服务端

## 温馨提示

上述文章是`ws + tls`搭建v2ray的详细步骤，如果想快速、简洁、标准搭建，请参考：[在docker-compose环境下以ws+tls方式搭建v2ray(So easy)](https://www.4spaces.org/docker-compose-install-v2ray-ws-tls/) 。