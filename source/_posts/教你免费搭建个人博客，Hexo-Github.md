---
title: 教你免费搭建个人博客，Hexo&Github
date: 2018-05-26 17:39:47
categories: Hexo使用攻略
tags:
- 个人博客搭建
- hexo
- github
---



# 什么是 Hexo？

<https://hexo.io/zh-cn/docs/>

Hexo 是一个快速、简洁且高效的博客框架。Hexo 使用 Markdown（或其他渲染引擎）解析文章，在几秒内，即可利用靓丽的主题生成静态网页。

# 一、配置Github

首先注册、登录 <https://github.com/>

记住自己的Username（很重要）

然后右上角选择 Create a new repository <https://github.com/new>

Repository name （填自己的名字） **yourname.github.io**(yourname与你的注册用户名一致,这个就是你博客的域名了)

例如，我的域名是github.com/zhihuya，就填入zhihuya.github.io。成功后出现下面的画面

![img](JNWXHHS.jpg)

# 二、环境安装（node、git）

1、安装 Node.js <https://nodejs.org/en/>

2、安装 Git <https://github.com/waylau/git-for-win>

Git教程 <https://github.com/waylau/git-for-win>廖雪峰老师的教程，非常好。

3、安装完成后，在开始菜单里找到“Git”->“Git Bash”，名称和邮箱是Github上的

![img](FAVYz0C.jpg)

4、安装 Hexo。所有必备的应用程序安装完成后，即可使用 npm 安装 Hexo。

```
$ npm install -g hexo-cli
```

![img](xWjp6U3.jpg)

（使用的cmder，超级好用~~。等待时间可能有点长）

好了到这一步我们环境全部安装好了。

# 三、设置

在电脑F盘（自己随意）目录下新建文件夹 test，进入test，按住Shift键点击鼠标右键

![img](jOekzIE.png)

因为我有安装Cmder，没有安装的点击“在此处打开命令窗口”，输入

```
hexo init blog
```

稍微等待下，速度有点慢。成功提示

```
INFO  Start blogging with Hexo!
```

因为你初始化hexo 之后source目录下自带一篇hello world文章, 所以直接执行下方命令

```
$ hexo generate
# 启动本地服务器
$ hexo server
# 在浏览器输入 http://localhost:4000/就可以看见网页和模板了
INFO  Start processing
INFO  Hexo is running at http://localhost:4000/. Press Ctrl+C to stop.
```

访问<http://localhost:4000/>，便可以看到网站初步的模样，不要激动，我们还要把网页发布到Github上去。

![img](wk2ybMK.jpg)

重新打开CMD，输入：

```
ssh-keygen -t rsa -C "Github的注册邮箱地址"
```

一路Enter过来就好，得到信息：

```
Your public key has been saved in /c/Users/user/.ssh/id_rsa.pub.
```

找到该文件，打开（sublime text），Ctrl + a复制里面的所有内容，然后进入Sign in to GitHub：<https://github.com/settings/ssh>

New SSH key ——Title：blog —— Key：输入刚才复制的—— Add SSH key

# 四、配置博客

在blog目录下，用sublime打开_config.yml文件，修改参数信息

**特别提醒，在每个参数的：后都要加一个空格**

修改网站相关信息

```
title: 崔斯特测试所用博客
subtitle: 副标题
description: 网页描述
author: 崔斯特
language: zh-CN
timezone: Asia/Shanghai
```

配置部署（我的是zhihuya，修改成自己的）

```
deploy: 
  type: git
  repo: https://github.com/zhihuya/zhihuya.github.io.git
  branch: master
```

# 五、发表文章

在CMD中输入

```
$ hexo new "崔斯特测试文章"
INFO  Created: F:\test\blog\source\_posts\崔斯特测试文章.md
```

找到该文章，打开，使用Markdown语法，该语法介绍可以查看<https://zhangslob.github.io/2017/02/26/%E5%88%A9%E7%94%A8HEXO%E6%90%AD%E5%BB%BA%E7%9A%84%E5%8D%9A%E5%AE%A2/>

```
---
title: 崔斯特测试文章
date: 2017-02-28 13:03:44
tags:
---
这是一篇测试文章，欢迎关注作者博客[1]: https://zhangslob.github.io/
```

保存，然后执行下列步骤：

```
F:\test\blog
$ hexo clean
INFO  Deleted database.
INFO  Deleted public folder.

F:\test\blog
$ hexo generate
INFO  Start processing
INFO  Files loaded in 1.48 s
#省略
INFO  29 files generated in 4.27 s

F:\test\blog
$ hexo server
INFO  Start processing
INFO  Hexo is running at http://localhost:4000/. Press Ctrl+C to stop.
```

这个时候，打开<http://localhost:4000/>，发现刚才的文章已经成功了

![img](fGVNxkn.jpg)

最后一步，发布到网上，执行：

```
F:\test\blog
$ hexo deploy
INFO  Deploying: git
INFO  Clearing .deploy_git folder...
INFO  Copying files from public folder...
#省略
```

![img](kKRV0UB.jpg)

其中会跳出Github登录，直接登录，如果没有问题输入zhihuya（换成你的）.github.io/

崔斯特测试所用博客<https://zhihuya.github.io/>

然后就可以看到已经发布了

![img](g9wtZVk.jpg)

# 六、总结

发布文章的步骤：

1、hexo new 创建文章

2、Markdown语法编辑文章

3、部署（所有打开CMD都是在blog目录下）

```
hexo clean #清除缓存 网页正常情况下可以忽略此条命令
hexo generate #生成
hexo server #启动服务预览，非必要，可本地浏览网页
hexo deploy #部署发布
```

简写Tips：

> hexo n “我的博客” == hexo new “我的博客” #新建文章
>
> hexo p == hexo publish
>
> hexo g == hexo generate#生成
>
> hexo s == hexo server #启动服务预览
>
> hexo d == hexo deploy#部署

如果在执行 hexo deploy 后,出现 error deployer not found:github 的错误，执行：

```
npm install hexo-deployer-git --save
```

出错是正常的，出错了自己先百度或google，实在不知道的可以询问我。

托管的话不仅有github可以用，还有个国内的<https://coding.net/>可选



### 引用说明

- 作者：zhangslob
- 链接：<https://zhangslob.github.io/2017/02/28/教你免费搭建个人博客，Hexo-Github>

