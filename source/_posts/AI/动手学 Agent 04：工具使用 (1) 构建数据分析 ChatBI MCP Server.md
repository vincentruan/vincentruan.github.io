---
title: "动手学 Agent 04：工具使用 (1) 构建数据分析 ChatBI MCP Server"
date: 2025-10-11 00:00:00
categories: AI
tags:
- MCP协议
- ChatBI
- 数据分析
- Python
- Pandas
- 工具开发
- 数据洞察
- Agent智能体
- Agent开发
- 动手学Agent
description: "本文实战演示如何使用FastMCP构建一个用于数据分析的MCP Server。文章详细介绍了ChatBI的概念（通过大模型生成Python代码进行数据分析），核心工具get_preview_data和analyze_data的实现，以及如何通过Cherry Studio客户端配合mcp-server-chart实现数据洞察Agent的完整流程，包括Token认证、参数声明规范等最佳实践。"
---

我们暂时先跳过 MCP（Model Context Protocol）原理的介绍，这类文章网上已经有很多讲得不错的文章了，今天我们直接动手开发一个用于数据分析的 MCP Server，为接下来的数据洞察 Agent 做准备。

<!-- more -->

# 概述

首先介绍一下我们要实现的 ChatBI 部分，BI 是 Business Intelligence 的简称，是借助数据仓库、数据挖掘等技术，来生成报表、统计图等，用于做商业决策的，ChatBI 是大模型火了之后，借助大模型强大的代码能力来自动合成代码进行数据分析的一项技术。

ChatBI 又大致分为通过生成 Python 代码来做分析和通过生成 SQL 代码来做分析两种，生成 Python 代码来做数据分析的这一脉，基本上是 ChatGPT 带火的，属于比较轻量级的数据分析，大家常用的大模型产品，ChatGPT、元宝、豆包、Kimi 等，都提供上传 Excel 然后直接统计分析的功能，就属于这一脉；生成 SQL 代码则相对 “正规” 一些，毕竟严肃的数据分析是要建立在清洗之后的数据基础上的，而这些数据一般在企业的数据中台存储，这就意味着背后通常是以数据仓库做承载的。

本期我们先介绍使用大模型生成 Python 代码的 ChatBI 这一脉，这一脉也有比较有名库——PandasAI，还是 YC 投资的项目，不过为了便于大家熟悉原理，我们不借助这个库，直接使用 LLM、Pandas 这些库来完成数据分析。

总体的处理流程如下图所示：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/b4935f9e41101afbd489953a8486c0031e9f8659.png)

# 核心代码

代码已开源，地址在： https://github.com/Steven-Luo/chatbi-mcp-server

## ChatBI

ChatBI 的部分代码相对来说比较多，核心其实是通过 Prompt，让大模型生成符合要求的代码，当然需要提供必要的数据信息，这也就是上面流程图中 “数据探查” 部分做的事情。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/211b68eb4c6e76f95d0452649dda0eef19104ce7.png)

## MCP Server

MCP Server 的部分，则相对来说比较简单。我们主要实现两个工具：

*   get_preview_data：预览数据，返回数据探查结果，以便大模型对数据有基本的认识
    
*   analyze_data：分析数据，根据问题，数据地址，生成结果表格
    

由于 ChatBI 生成代码时需要使用 LLM，此处添加了 Header 校验机制，供需要对 MCP Server 做认证鉴权的小伙伴们参考，先添加如下的函数，对 token 进行校验：

```python
from fastmcp import FastMCP, Context

def get_bearer_token(ctx):
    request = ctx.get_http_request()
    headers = request.headers
    # Check if 'Authorization' header is present
    authorization_header = headers.get('Authorization')

    if authorization_header:
        # Split the header into 'Bearer <token>'
        parts = authorization_header.split()

        if len(parts) == 2 and parts[0] == 'Bearer' and parts[1] == ACCESS_TOKEN:
            return parts[1]
        else:
            raise ValueError("Invalid Authorization header format")
    else:
        raise ValueError("Authorization header missing")

```

然后在需要进行认证的工具参数中，添加一个 context 参数，如下所示：

```python
@mcp.tool(name='get_preview_data', description='数据描述信息')
defget_preview_data(
        path_or_url, context: Context
) -> str:
    token = get_bearer_token(ctx)
# 其他逻辑

```

另外，很多文章的样例代码，在客户端获取到工具列表后，拿不到工具的参数类型和描述，为了让大模型在调用工具时能更精准地传参，建议使用 Annotated 和 Field 对字段类型和描述进行声明：

```python
from pydantic import Field
from typing importList, Dict, Annotated
# 导入其他类

@mcp.tool(name='get_preview_data', description='数据描述信息')
defget_preview_data(
        path_or_url: Annotated[str, Field(description="数据文件路径或URL，仅支持Excel和CSV")], 
         context: Context
) -> str:
"""
    以AI易读的格式获取数据信息

    Args:
        path_or_url: 数据文件路径或URL，仅支持Excel和CSV

    Returns:
        以Markdown形式组织的预览结果
    """
    logger.info(f'filepath: {path_or_url}')
    token = get_bearer_token(context)
    logger.info(f"Client token: {token}")
    data_accessor = get_data_accessor(path_or_url)
return"当前数据信息如下：\n" + data_accessor.description

```

# 使用

使用的部分，主要借助 Cherry Studio 这款客户端，总体是非常好用的，但基本上每个版本都多少有些 bug，我使用的版本是 v1.5.4，下方示例中使用的 Qwen3-32B、GLM 4.5 模型均为支持工具调用的 API 服务，并且工具调用方式为 “函数”，如果大家运行结果与文章不一致，可以按此设置进行排查。

## 启动 MCP Server

使用代码仓库中的部署指南，启动 MCP Server 后，记下服务地址。

注意：仓库中默认使用 Streamable-HTTP 作为传输协议，大家可以按照自己需要修改`pandas_mcp_server.py`文件中的最下方，有备注。

## 添加 MCP Server

使用任意支持 MCP Server 的客户端，比如 Cherry Studio，配置如下： 

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/723eee5af2e201b30c81201b1ead7be49ec93ee3.png)

其中验证信息，在`config.yaml`中，可以自行修改。默认值为`eyJzdWIiOiAidXNlcjEyMyIsICJpYXQiOiAxNzUxODA5ODIwLCAiZXhwIjogMTc1MTgxMzQyMH0`。 

注意：超时时间设置长一点，因为涉及 LLM 生成代码、如果出错还需要改错 

添加完成后，点击 “保存”，然后点击右上方的开启选项，切换到“工具” 标签页： 

如果能正常列出工具，说明配置正确。 

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/b80d1d477457c1977aec1b27ec3c3a631d7cc324.png)

## 常规统计

使用时，记得开启这个 MCP Server：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/561c30e2b568daef3e115678a3d97c40559a97ce.png)

简单统计：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/fdf8ebd9c36994db870af8e4cb2cf1fa6089aa3d.png)

## 结合可视化库

结合 mcp-server-chart 这个 MCP Server，可以对分析结果方便地进行可视化：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/aba8c300c92d0e6b3dd384c3f63c91e52cefd542.png)

## 数据洞察 Agent

上面介绍的方式，虽然可以分析，但适合对数据本身已经非常了解的小伙伴，但很多时候做数据分析，其实难在无从下手，或者要做系统地分析，即使很熟悉数据分析的情况下，也需要几个小时，接着这种方式，完全可以让大模型自己根据数据的特点，自己拆解分析较多，自己分析，给我们一个初步的认识，以便后续更深入的分析。

这部分如何实现我们后面的文章会介绍。

### 生成数据分析计划

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/b6521519f1c32921b4921596afc8fba0dcae79b0.png)

### 开始分析

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/d670a95b1381e86d08200f2f50b322b92940ec67.png)

### 结果报告

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/b44ec9cbb20ea82e41bab885326ee8c0ecc94beb.png)

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/1d54213f29132976abdb00cb0f47c34a38cde134.png)

### 生成的数据看板  

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/ffbc5216fb819bcee5cb59341d3dfc312b7e052b.png)

