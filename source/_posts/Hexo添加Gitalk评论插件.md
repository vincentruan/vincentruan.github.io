---
title: Hexo添加Gitalk评论插件
date: 2018-06-01 23:55:56
categories: Hexo使用攻略
tags:
- hexo
---

### 安装

[Gitalk](https://github.com/gitalk/gitalk)提供了两种方式：

- 直接引入

```javascript
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/gitalk@1/dist/gitalk.css">
  <script src="https://cdn.jsdelivr.net/npm/gitalk@1/dist/gitalk.min.js"></script>

  <!-- or -->

  <link rel="stylesheet" href="https://unpkg.com/gitalk/dist/gitalk.css">
  <script src="https://unpkg.com/gitalk/dist/gitalk.min.js"></script>
```

- npm安装

```
npm i --save gitalk
import 'gitalk/dist/gitalk.css'
import Gitalk from 'gitalk'
```

相对来说第一种会更简单。

### 使用

A **GitHub Application** is needed for authorization, if you don't have one, [Click here to register](https://github.com/settings/applications/new) a new one.

**Note:** You must specify the website domain url in the `Authorization callback URL` field.

```
const gitalk = new Gitalk({
  clientID: 'GitHub Application Client ID',
  clientSecret: 'GitHub Application Client Secret',
  repo: 'GitHub repo',
  owner: 'GitHub repo owner',
  admin: ['GitHub repo owner and collaborators, only these guys can initialize github issues'],
  id: location.pathname,      // Ensure uniqueness and length less than 50
  distractionFreeMode: false  // Facebook-like distraction free mode
})

gitalk.render('gitalk-container')
```

### 修改主题文件

- 这里以next主题为例，参考[Feature: Add Gitalk Support](https://github.com/iissnan/hexo-theme-next/pull/1814/files#diff-9f7e5af0c701ee066fc50dcf184a48ec)

不同的主题目录和模板引擎不同，可以自己修改, 修改next主题配置文件`_config.yml`，添加字段：

```
# Gitalk
# more info please open https://github.com/gitalk/gitalk
gitalk:
  enable: false
  clientID:
  clientSecret:
  repo:
  owner:
  admin: # support multiple admins split with comma, e.g. foo,bar
  pagerDirection: first
```

- 找到`next/layout/_third-party/comments`文件夹，新建`gitalk.swig`文件，代码如下：

```
{% if not (theme.duoshuo and theme.duoshuo.shortname) and not theme.duoshuo_shortname %}
  {% if theme.gitalk.enable %}
    {% if page.comments %}
      <script src="https://unpkg.com/gitalk/dist/gitalk.min.js"></script>
      <script type="text/javascript">
        const gitalk = new Gitalk({
          clientID: '{{theme.gitalk.clientID}}',
          clientSecret: '{{theme.gitalk.clientSecret}}',
          repo: '{{theme.gitalk.repo}}',
          owner: '{{theme.gitalk.owner}}',
          admin: '{{theme.gitalk.admin}}'.split(','),
          pagerDirection: '{{theme.gitalk.pagerDirection}}',
          // facebook-like distraction free mode
          distractionFreeMode: false
        })
        gitalk.render('gitalk-container')
      </script>
    {% endif %}
  {% endif %}
{% endif %}
```

- 同目录下在`index.swig`文件末尾添加：

```
{% include 'gitalk.swig' %}
```

- 下步搞起，`next/layout/_partials`文件夹下，找到`comments.swig`文件，添加代码：

```
{% elseif theme.gitalk.enable %}
      <div id="gitalk-container"></div>
      <link rel="stylesheet" href="https://unpkg.com/gitalk/dist/gitalk.css">
```

 因为github限制了issue的提交title长度不能超过50，可能会遇到[Error: Validation Failed](https://github.com/gitalk/gitalk/issues/102) 按照这里的方案，使用MD5的方式降低长度即可

### 参考文档

1. [Hexo添加Gitalk评论插件](https://www.jianshu.com/p/9be29ed2f4b7)
2. [Next 第三方服务集成](http://theme-next.iissnan.com/third-party-services.html)
3. [在hexo next主题上使用gitalk](https://github.com/gitalk/gitalk/wiki/%E5%9C%A8hexo-next%E4%B8%BB%E9%A2%98%E4%B8%8A%E4%BD%BF%E7%94%A8gitalk)



