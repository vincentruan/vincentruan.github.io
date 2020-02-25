---
title: 在CentOS上安装Git
date: 2020-02-04 21:00:57
categories: git
tags:
- centos
- git
---

CentOS的yum源中没有git，只能自己编译安装，现在记录下编译安装的内容，留给自己备忘。

确保已安装了依赖的包

```bash
yum install curl
yum install curl-devel
yum install zlib-devel
yum install openssl-devel
yum install perl
yum install cpio
yum install expat-devel
yum install gettext-devel yum install perl-ExtUtils-CBuilder perl-ExtUtils-MakeMaker
```

<!-- more -->

下载最新的git包

```bash
wget http://www.codemonkey.org.uk/projects/git-snapshots/git/git-latest.tar.gz
tar xzvf git-latest.tar.gz
cd git-2011-11-30 ＃你的目录可能不是这个
autoconf
./configure
make
sudo make install
```

检查下安装的版本，大功告成

```bash
git --version
```