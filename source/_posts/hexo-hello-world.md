---
title: Hexo Hello World
date: 2018-05-26 17:16:29
categories: Hexo使用攻略
tags:
- hexo
---
Welcome to [Hexo](https://hexo.io/)! This is your very first post. Check [documentation](https://hexo.io/docs/) for more info. If you get any problems when using Hexo, you can find the answer in [troubleshooting](https://hexo.io/docs/troubleshooting.html) or you can ask me on [GitHub](https://github.com/hexojs/hexo/issues).

## Quick Start

### Create a new post

``` bash
$ hexo new "My New Post"
```

More info: [Writing](https://hexo.io/docs/writing.html)

### Run server

``` bash
$ hexo server
```

More info: [Server](https://hexo.io/docs/server.html)

### Generate static files

``` bash
$ hexo generate
```

More info: [Generating](https://hexo.io/docs/generating.html)

### Deploy to remote sites

``` bash
$ hexo deploy
```

More info: [Deployment](https://hexo.io/docs/deployment.html)

### hexo algolia

```bash
$ export HEXO_ALGOLIA_INDEXING_KEY=[algolia.apiKey]
$ hexo algolia
```

### CI with jenkins

[使用Jenkins实现Hexo自动部署](http://www.niugm.me/2018/02/16/jenkins/)

[hexo使用jenkins自动部署到阿里云](https://juejin.im/post/5adae7ee51882567127817ea)

###Cooperation

1. 使用git clonegit@github.com:vincentruan/vincentruan.github.io.git拷贝仓库（git checkout -b hexo）； 

2. 在新拷贝的vincentruan.github.io文件夹下通过Git bash依次执行下列指令：

   npm install hexo-cli -g(首次安装)、npm install hexo、npm install、npm install hexo-deployer-git（记得，不需要***hexo init***这条指令,如果不慎在此时用了hexo init，则站点的配置文件_config.yml里面内容会被清空使用默认值，所以这一步一定要慎重 ）