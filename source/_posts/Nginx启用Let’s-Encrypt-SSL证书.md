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

## Certbot命令行工具使用说明

**certbot版本：**

- v0.22.2



**用法:**

“`
certbot [子命令] [选项] [-d 域名] [-d 域名] “`

Certbot工具用于获取和安装 HTTPS/TLS/SSL 证书。默认情况下，Certbot会尝试为本地网页服务器(如果不存在会默认安装一个到本地)获取并安装证书。最常用的子命令和选项如下:

**获取, 安装, 更新证书:**

- (默认) run：获取并安装证书到当前网页服务器；
- certonly：获取或更新证书，但是不安装；
- renew ：更新已经获取但快过期的所有证书；
- -d 域名列表：指定证书对应的域名列表，域名之间使用逗号分隔；
- –apache：使用Apache插件进行身份认证和安装
- –standalone：运行一个独立的网页服务器用于身份认证
- –nginx：用Nginx插件进行身份认证和安装
- –webroot：把身份认证文件放置在服务器的网页根目录下；
- –manual： 使用交互式或脚本钩子的方式获取证书；
- -n：非交互式运行；
- –test-cert：从预交付服务器上获取测试证书
- –dry-run：测试获取或更新证书，但是不存储到本地硬盘；

**证书管理:**

- certificates:显示使用Certbot生成的所有证书的信息；
- revoke：撤销证书(supply –cert-path)；
- delete：删除证书；

**管理你的Let’s Encrypt账户**

- register：创建Let’s Encrypt ACME账户；
- –agree-tos：同意ACME服务器的订阅协议；
- -m EMAIL：接收有关账户的重要通知的邮箱地址；

**可选参数:**

- -h, –help： 显示帮助信息，然后退出；

- -c 配置文件, –config 配置文件：配置文件的路径 (默认: /etc/letsencrypt/cli.ini或 ~/.config/letsencrypt/cli.ini)；

- -v, –verbose：当前参数可以重复使用多次来增加输出信息的详细程度，例如 -vvv.(默认: -2)；

- -n, –non-interactive, –noninteractive：非交互式运行，即运行过程中不需要询问用户输入，但需要额外的命令行参数。当客户端发现参数缺失时会给出相应的说明。(默认: False)；

- –force-interactive：无论Certbot是否以命令行的方式运行，强制交互式运行。当前参数不能用于renew子命令。(默认: False)

- -d 域名列表, –domains 域名列表, –domain 域名列表：指定域名列表。如果有多个域名，可以多次使用-d参数，也可以在-d参数后使用逗号分隔的域名列表。(默认: 询问)；

- –cert-name 证书名称：指定证书名称。每次Certbot运行只使用一个证书名称。可以使用命令’certbot certificates’查看已生成的证书名称。当创建新的证书时，此选项用于指定证书的名称。(默认: 无)

- –dry-run：使用客户端执行一次试运行，获取测试证书(无效的证书)但不保存到磁盘。当前选项仅用于’certonly’和’renew’子命令。

  > 注: 尽管 –dry-run 选项试图阻止任何对系统的修改，但并不能做到完全避免: 如果使用类似apache或nginx网页服务器来认证插件，程序运行过程中，会尝试修改或恢复配置文件来获取测试证书，也会重启网页服务器来部署和回滚这些修改。如果定义了`--pre-hook`和`--post-hook`选项它们会被同时执行，这两个选项有助于更精确地模拟更新证书。`--renew-hook` 选项在这里不会被执行。(默认: False)

- –preferred-challenges PREF_CHALLS：A sorted, comma delimited list of the preferred challenge to use during authorization with the most preferred challenge listed first (Eg, “dns” or “tls-sni-01,http,dns”). Not all plugins support all challenges. See https://certbot.eff.org/docs/using.html#plugins for details. ACME Challenges are versioned, but if you pick “http” rather than “http-01”, Certbot will select the latest version automatically. (default: [])；

  

- –user-agent 用户代理：设置本客户端的用户代理信息。用户代理信息用于CA机构收集关于操作系统和插件的使用成功率。如果你希望隐藏此信息，设置此选项为””。(默认: CertbotACMEClient/0.12.0 (Ubuntu 16.04.2 LTS) Authenticator/XXX Installer/YYY)。

**自动化:**

用于自动运行或其他情况的参数

–keep-until-expiring, –keep, –reinstall
如果被请求的证书已经存在，那么不执行更新操作直到证书将要过期
(如果使用了’run’子命令，无论是否过期证书都会被更新)。
(默认: 询问)
–expand 如果请求的证书名字是已经存在的证书名字的子集，那么这个本地证书
会被重置并重命名。(默认: 询问)
–version 显示程序和版本号，然后退出
–force-renewal, –renew-by-default
如果请求的证书已经存在，无论是否快要到期，更新该证书。
(通常使用 –keep-until-expiring 选项)。
该选项默认包含了 –expand 选项的功能。(默认: False)
–renew-with-new-domains
如果被请求的证书已经存在，但是域名变了，那么无论该证书是否将要过期
都会被更新。(默认: False)
–allow-subset-of-names
When performing domain validation, do not consider it
a failure if authorizations can not be obtained for a
strict subset of the requested domains. This may be
useful for allowing renewals for multiple domains to
succeed even if some domains no longer point at this
system. This option cannot be used with –csr.
(default: False)
–agree-tos 同意ACME订阅协议 (默认: 询问)
–duplicate Allow making a certificate lineage that duplicates an
existing one (both can be renewed in parallel)
(default: False)
–os-packages-only (仅用于 certbot-auto) 安装系统依赖包，然后停止 (默认: False)
–no-self-upgrade (仅用于 certbot-auto) 禁止 certbot-auto 脚本自动升级自己到
新的发布版本 (默认: 自动升级)
-q, –quiet 程序运行只输出错误信息。这个选项对于 cron 等自动化工具很有用。
该选项默认包含了 –non-interactive 选项的功能。(默认: False)

安全:
有关安全的参数和服务器设置

–rsa-key-size N RSA密钥的大小。 (默认: 2048)
–must-staple 为证书添加 OCSP Must Staple 扩展。当Apache版本高于2.3.3时，
自动配置 OCSP Stapling 支持。 (默认: False)
–redirect 对于新认证的虚拟主机，自动重定向HTTP到HTTPS。 (默认: 询问)
–no-redirect 对于新认证的虚拟主机，不要重定向HTTP到HTTPS。 (默认: 询问)
–hsts Add the Strict-Transport-Security header to every HTTP
response. Forcing browser to always use SSL for the
domain. Defends against SSL Stripping. (default:
False)
–uir Add the “Content-Security-Policy: upgrade-insecure-
requests” header to every HTTP response. Forcing the
browser to use https:// for every http:// resource.
(default: None)
–staple-ocsp Enables OCSP Stapling. A valid OCSP response is
stapled to the certificate that the server offers
during TLS. (default: None)
–strict-permissions Require that all configuration files are owned by the
current user; only needed if your config is somewhere
unsafe like /tmp/ (default: False)

测试:
The following flags are meant for testing and integration purposes only.

–test-cert, –staging
Use the staging server to obtain or revoke test
(invalid) certs; equivalent to –server https://acme-
staging.api.letsencrypt.org/directory (default: False)
–debug Show tracebacks in case of errors, and allow certbot-
auto execution on experimental platforms (default:
False)
–no-verify-ssl Disable verification of the ACME server’s certificate.
(default: False)
–tls-sni-01-port TLS_SNI_01_PORT
Port used during tls-sni-01 challenge. This only
affects the port Certbot listens on. A conforming ACME
server will still attempt to connect on port 443.
(default: 443)
–http-01-port HTTP01_PORT
Port used in the http-01 challenge. This only affects
the port Certbot listens on. A conforming ACME server
will still attempt to connect on port 80. (default:
80)
–break-my-certs Be willing to replace or renew valid certs with
invalid (testing/staging) certs (default: False)

路径:
修改有关执行路径和服务器的参数

–cert-path 证书路径
Path to where cert is saved (with auth –csr),
installed from, or revoked. (default: None)
–key-path 密钥路径 Path to private key for cert installation or
revocation (if account key is missing) (default: None)
–chain-path 钥匙链路径
Accompanying path to a certificate chain. (default:
None)
–config-dir 配置文件目录
Configuration directory. (default: /etc/letsencrypt)
–work-dir 工作目录 Working directory. (default: /var/lib/letsencrypt)
–logs-dir 日志目录 Logs directory. (default: /var/log/letsencrypt)
–server 服务器 ACME Directory Resource URI. (default:
https://acme-v01.api.letsencrypt.org/directory)

管理:
Various subcommands and flags are available for managing your
certificates:



certificates List certificates managed by Certbot
delete Clean up all files related to a certificate
renew Renew all certificates (or one specified with –cert-
name)
revoke Revoke a certificate specified with –cert-path
update_symlinks Recreate symlinks in your /etc/letsencrypt/live/
directory

run:
获取和安装证书的选项

certonly:
修改获取证书方式的选项

–csr CSR Path to a Certificate Signing Request (CSR) in DER or
PEM format. Currently –csr only works with the
‘certonly’ subcommand. (default: None)

renew:
The ‘renew’ subcommand will attempt to renew all certificates (or more
precisely, certificate lineages) you have previously obtained if they are
close to expiry, and print a summary of the results. By default, ‘renew’
will reuse the options used to create obtain or most recently successfully
renew each certificate lineage. You can try it with `--dry-run` first. For
more fine-grained control, you can renew individual lineages with the
`certonly` subcommand. Hooks are available to run commands before and
after renewal; see https://certbot.eff.org/docs/using.html#renewal for
more information on these.

–pre-hook PRE_HOOK Command to be run in a shell before obtaining any
certificates. Intended primarily for renewal, where it
can be used to temporarily shut down a webserver that
might conflict with the standalone plugin. This will
only be called if a certificate is actually to be
obtained/renewed. When renewing several certificates
that have identical pre-hooks, only the first will be
executed. (default: None)
–post-hook POST_HOOK
Command to be run in a shell after attempting to
obtain/renew certificates. Can be used to deploy
renewed certificates, or to restart any servers that
were stopped by –pre-hook. This is only run if an
attempt was made to obtain/renew a certificate. If
multiple renewed certificates have identical post-
hooks, only one will be run. (default: None)
–renew-hook RENEW_HOOK
Command to be run in a shell once for each
successfully renewed certificate. For this command,
the shell variable $RENEWED_LINEAGE will point to the
config live subdirectory containing the new certs and
keys; the shell variable $RENEWED_DOMAINS will contain
a space-delimited list of renewed cert domains
(default: None)
–disable-hook-validation
Ordinarily the commands specified for –pre-hook
/–post-hook/–renew-hook will be checked for
validity, to see if the programs being run are in the
$PATH, so that mistakes can be caught early, even when
the hooks aren’t being run just yet. The validation is
rather simplistic and fails if you use more advanced
shell constructs, so you can use this switch to
disable it. (default: False)

certificates:
列出由Certbot管理的所有证书信息

delete:
用于删除证书的选项

revoke:
用于撤销证书的选项

–reason {keycompromise,affiliationchanged,superseded,unspecified,cessationofoperation}
Specify reason for revoking certificate. (default: 0)

register:
用于账户注册和更新的选项

–register-unsafely-without-email
Specifying this flag enables registering an account
with no email address. This is strongly discouraged,
because in the event of key loss or account compromise
you will irrevocably lose access to your account. You
will also be unable to receive notice about impending
expiration or revocation of your certificates. Updates
to the Subscriber Agreement will still affect you, and
will be effective 14 days after posting an update to
the web site. (default: False)
–update-registration
With the register verb, indicates that details
associated with an existing registration, such as the
e-mail address, should be updated, rather than
registering a new account. (default: False)
-m EMAIL, –email EMAIL
Email used for registration and recovery contact.
(default: Ask)
–eff-email Share your e-mail address with EFF (default: None)
–no-eff-email Don’t share your e-mail address with EFF (default:
None)

unregister:
用于注销账户的选项

–account 账户ID 需要注销的账户ID (默认: 无)

install:
用于修改证书部署路径的选项

–fullchain-path 完整钥匙链的路径
Accompanying path to a full certificate chain (cert
plus chain). (default: None)

config_changes:
Options for controlling which changes are displayed

–num NUM How many past revisions you want to be displayed
(default: None)

rollback:
Options for rolling back server configuration changes

–checkpoints N Revert configuration N number of checkpoints.
(default: 1)

plugins:
Options for for the “plugins” subcommand

–init Initialize plugins. (default: False)
–prepare Initialize and prepare plugins. (default: False)
–authenticators Limit to authenticator plugins only. (default: None)
–installers Limit to installer plugins only. (default: None)

update_symlinks:
Recreates cert and key symlinks in /etc/letsencrypt/live, if you changed
them by hand or edited a renewal configuration file

plugins:
Plugin Selection: Certbot client supports an extensible plugins
architecture. See ‘certbot plugins’ for a list of all installed plugins
and their names. You can force a particular plugin by setting options
provided below. Running –help will list flags specific to
that plugin.

–configurator CONFIGURATOR
Name of the plugin that is both an authenticator and
an installer. Should not be used together with
–authenticator or –installer. (default: Ask)
-a AUTHENTICATOR, –authenticator AUTHENTICATOR
Authenticator plugin name. (default: None)
-i INSTALLER, –installer INSTALLER
Installer plugin name (also used to find domains).
(default: None)
–apache Obtain and install certs using Apache (default: False)
–nginx Obtain and install certs using Nginx (default: False)
–standalone 运行一个独立的网页服务器用于获取证书。(默认: False)
–manual Provide laborious manual instructions for obtaining a
cert (default: False)
–webroot 把身份认证文件放置在服务器的网页根目录下用于获取证书。
(默认: False)

nginx:
Nginx网页服务器插件 – Alpha版本

–nginx-server-root NGINX_SERVER_ROOT
Nginx server root directory. (default: /etc/nginx)
–nginx-ctl NGINX_CTL
Path to the ‘nginx’ binary, used for ‘configtest’ and
retrieving nginx version number. (default: nginx)

standalone:
启动一个临时的网页服务器

manual:
Authenticate through manual configuration or custom shell scripts. When
using shell scripts, an authenticator script must be provided. The
environment variables available to this script are $CERTBOT_DOMAIN which
contains the domain being authenticated, $CERTBOT_VALIDATION which is the
validation string, and $CERTBOT_TOKEN which is the filename of the
resource requested when performing an HTTP-01 challenge. An additional
cleanup script can also be provided and can use the additional variable
$CERTBOT_AUTH_OUTPUT which contains the stdout output from the auth
script.

–manual-auth-hook MANUAL_AUTH_HOOK
Path or command to execute for the authentication
script (default: None)
–manual-cleanup-hook MANUAL_CLEANUP_HOOK
Path or command to execute for the cleanup script
(default: None)
–manual-public-ip-logging-ok
Automatically allows public IP logging (default: Ask)

webroot:
Place files in webroot directory

–webroot-path WEBROOT_PATH, -w WEBROOT_PATH
public_html / webroot path. This can be specified
multiple times to handle different domains; each
domain will have the webroot path that preceded it.
For instance: `-w /var/www/example -d example.com -dwww.example.com -w /var/www/thing -d thing.net -dm.thing.net` (default: Ask)
–webroot-map WEBROOT_MAP
JSON dictionary mapping domains to webroot paths; this
implies -d for each entry. You may need to escape this
from your shell. E.g.: –webroot-map
‘{“eg1.is,m.eg1.is”:”/www/eg1/”, “eg2.is”:”/www/eg2″}’
This option is merged with, but takes precedence over,
-w / -d entries. At present, if you put webroot-map in
a config file, it needs to be on a single line, like:
webroot-map = {“example.com”:”/var/www”}. (default:
{})

apache:
Apache网页服务器插件 – Beta版本

–apache-enmod APACHE_ENMOD
Path to the Apache ‘a2enmod’ binary. (default:
a2enmod)
–apache-dismod APACHE_DISMOD
Path to the Apache ‘a2dismod’ binary. (default:
a2dismod)
–apache-le-vhost-ext APACHE_LE_VHOST_EXT
SSL vhost configuration extension. (default: -le-
ssl.conf)
–apache-server-root APACHE_SERVER_ROOT
Apache server root directory. (default: /etc/apache2)
–apache-vhost-root APACHE_VHOST_ROOT
Apache server VirtualHost configuration root (default:
/etc/apache2/sites-available)
–apache-logs-root APACHE_LOGS_ROOT
Apache server logs directory (default:
/var/log/apache2)
–apache-challenge-location APACHE_CHALLENGE_LOCATION
Directory path for challenge configuration. (default:
/etc/apache2)
–apache-handle-modules APACHE_HANDLE_MODULES
Let installer handle enabling required modules for
you.(Only Ubuntu/Debian currently) (default: True)
–apache-handle-sites APACHE_HANDLE_SITES
Let installer handle enabling sites for you.(Only
Ubuntu/Debian currently) (default: True)

null:
Null Installer

参考文章：

1. https://blog.ibaoger.com/2017/03/07/certbot-command-line-tool-usage-document/；
2. https://certbot.eff.org/docs/using.html；