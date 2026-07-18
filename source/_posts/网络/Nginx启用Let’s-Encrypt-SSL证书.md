---
title: Nginx启用Let’s Encrypt SSL证书
date: 2020-06-07 22:24:56
tags:
---

> 文章转载自[Nginx启用Let’s Encrypt SSL证书](https://www.4spaces.org/nginx-lets-encrypt-ssl/)，根据实际搭建情况，略有修改

Let’ s Encrypt 是一个免费的 SSL/TLS 证书发行机构, 证书有效期为90天, 到期前30内可续期，因此不需要担心费用问题。

## 服务器环境：

- nginx-1.10.1
- php-7.0.4
- mariadb-10.1.13

启用证书的主要过程包括：客户端安装、获取证书、配置Nginx、证书自动续期等几个方面。

## 客户端下载

Let’ s Encrypt客户端现已更名为certbot，客户端的地址为https://github.com/certbot/certbot/releases 。

```shell
#下载
wget  https://github.com/certbot/certbot/archive/v1.5.0.tar.gz -O certbos.releases.tar.gz

#解压
tar xzvf certbos.releases.tar.gz

#进入目录
cd certbot-1.5.0
```

运行一次客户端，进行检查升级：

```shell
#进入目录
cd ~/certbot

#执行检查
./certbot-auto --help
```

如果没什么问题的话，会显示帮助文档。

## 获取证书

申请过程中要验证绑定的域名是否属于申请人, 其原理就是申请人在域名所在的服务器上申请证书, 然后 Let’ s Encrypt 会访问绑定的域名与客户端通信成功即可通过。

验证的方式有两种，一种是停止当前的 web server 服务, 让出 80 端口, 由客户端内置的 web server 启动与 Let’ s Encrypt 通信；一种是在域名根目录下创建一个临时目录, 并要保证外网通用域名可以访问这个目录，这种方式不需要停止当前的 web server 服务。

证书获取方式1：通过访问80端口方式验证

```shell
#停止nginx
systemctl stop nginx

#获取证书, --standalone 参数:使用内置web server. --email 参数:管理员邮箱,证书到期前会发邮件到此邮箱提醒. -d 参数:要绑定的域名,同一域的不同子域都要输入.
./certbot-auto certonly --standalone --email admin@4spaces.org -d ray.servehttp.com

#启动nginx
systemctl start nginx
```

证书获取方式2：通过临时目录验证

```shell
#--webroot 参数:指定使用临时目录的方式. -w 参数:指定后面-d 域名所在的根目录, 如果一次申请多个域的, 可以附加更多 -w...-d... 这段.
./certbot-auto certonly --webroot --email admin@4spaces.org -w /usr/share/nginx/html -d 4spaces.org -d www.4spaces.org
```

完成上面的操作即可获得 SSL 证书, 保存在 “/etc/letsencrypt/live/根域名/” 目录下, 会产生 4 个文件, 其中3个证书文件, 1个私钥文件. 不要移动证书的位置, 以免续期时出现错误。关于Letsencrypt使用的更多命令参见「[这里](https://www.4spaces.org/certbot-command-line-tool-usage-document/)」。

我这里是通过方式2申请的证书。

## 配置Nginx启用https

上面你的Nginx配置并没有启用ssl，下面我们需要开始配置nginx，让其支持https。进行这一步的前提是你前面已经成功生成证书。

编辑文件/etc/nginx/conf.d/default.conf(我是通过yum的方式安装的nginx，配置目录在这里，你根据自己的情况来)，进行如下配置（这个是我的完整配置）：

```properties
#设置非安全连接永久跳转到安全连接
server{
    listen 80;
    server_name 4spaces.org www.4spaces.org;
    #告诉浏览器有效期内只准用 https 访问
    add_header Strict-Transport-Security max-age=15768000;
    #永久重定向到 https 站点
    return 301 https://$server_name$request_uri;
}
server {
   #启用 https, 使用 http/2 协议, nginx 1.9.11 启用 http/2 会有bug, 已在 1.9.12 版本中修复.
   listen 443 ssl http2;
   server_name 4spaces.org www.4spaces.org;
   #首页
   index  index.php index.html index.htm;
   #网站根目录
   root   /usr/share/nginx/4spaces;
   #告诉浏览器当前页面禁止被frame
   add_header X-Frame-Options DENY;
   #告诉浏览器不要猜测mime类型
   add_header X-Content-Type-Options nosniff;

   #证书路径
   ssl_certificate /etc/letsencrypt/live/4spaces.org/fullchain.pem;
   #私钥路径
   ssl_certificate_key /etc/letsencrypt/live/4spaces.org/privkey.pem;
   #安全链接可选的加密协议
   ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
   #可选的加密算法,顺序很重要,越靠前的优先级越高.
   ssl_ciphers EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
   #在 SSLv3 或 TLSv1 握手过程一般使用客户端的首选算法,如果启用下面的配置,则会使用服务器端的首选算法.
   ssl_prefer_server_ciphers on;
   #储存SSL会话的缓存类型和大小
   ssl_session_cache shared:SSL:10m;
   #缓存有效期
   ssl_session_timeout 60m;

    location / {
        try_files $uri $uri/ /index.php?$args;  #修改内容
    }

    # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
    #
    #修改此处内容支持php
    location ~ \.php$ {
        fastcgi_pass   127.0.0.1:9000;
        fastcgi_index  index.php;
        fastcgi_param  SCRIPT_FILENAME  $document_root/$fastcgi_script_name;
        include        fastcgi_params;
    }

}
```

## 证书续期

前面说了，证书的有效期是3个月，你可以在证书过期前的30天内，进行续期，也可以进行脚本自动续期。

**方式1**
进入你在下载的certbot客户端目录，执行证书续期的脚本命令如下：

```shell
./certbot-auto renew
```

> renew 参数是官方推荐的续期方式, 使用这个参数会遍历 /etc/letsencrypt/live 下所有的证书, 如果证书在可续期的时间范围内(过期前30天内), 就会申请新的证书并替换原有证书, 否则跳过。

**方式2**

如果要指定更新某个域名的证书, 则要使用 certonly 参数, 其实和新申请证书时的命令差不多.

```shell
./certbot-auto certonly --webroot --renew-by-default --email admin@4spaces.org -w /usr/share/nginx/html -d 4spaces.org -d www.4spaces.org
```

**方式3**

上面两种方式，都是手动去执行的，我们可以将上面两种方式跟linux的定时任务进行结合，最终脚本如下：

1）通过端口验证的脚本

```shell
#!/bin/sh
#停止 nginx 服务,使用 --standalone 独立服务器验证需要停止当前 web server.
systemctl stop nginx
if ! /path/to/certbot-auto renew -nvv --standalone > /var/log/letsencrypt/renew.log 2>&1 ; then
    echo Automated renewal failed:
    cat /var/log/letsencrypt/renew.log
    exit 1
fi
#启动 nginx
systemctl start nginx
```

2）通过临时目录的脚本

```shell
#!/bin/sh
# This script renews all the Let's Encrypt certificates with a validity < 30 days

if ! /path/to/certbot-auto renew > /var/log/letsencrypt/renew.log 2>&1 ; then
    echo Automated renewal failed:
    cat /var/log/letsencrypt/renew.log
    exit 1
fi

# 需要重启nginx证书才能生效
systemctl restart nginx
```

上面两个脚本中的`/path/to/certbot-auto`代表你下载客户端解压后的目录，其中目录下有个`certbot-auto`。

选取一种方式，将对应的脚本保存为 `certbotrenew.sh`。

添加可执行权限

```shell
chmod +x certbotrenew.sh
```

编辑 crontab 配置文件或执行 `crontab -e` 添加 cron 任务

```shell
#编辑定时任务
sudo crontab -e
```

我这里设置为每月28号23点执行此脚本:

```shell
0 23 28 * * /bin/sh /home/michael/certbot/certbotrenew.sh
```

保存退出即可。

内容参考：

- https://blog.itnmg.net/letsencrypt-ssl/；
- https://community.letsencrypt.org/t/certbot-auto-deployment-best-practices/91979/

