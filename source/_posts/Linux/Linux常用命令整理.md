---
title: Linux常用命令整理
date: 2020-06-06 22:24:04
categories: LINUX
tags:
- Linux
---

本文并不会对所有命令进行详细讲解，只给出常见用法和解释。具体用法可以使用`--help`查看帮助或者直接通过google搜索学习。

## 查找文件

`find / -name filename.txt` 根据名称查找/目录下的filename.txt文件。

`find . -name "*.xml"` 递归查找所有的xml文件

`find . -name "*.xml" |xargs grep "hello world"` 递归查找所有文件内容中包含hello world的xml文件

`grep -H 'spring' *.xml` 查找所以有的包含spring的xml文件

`find ./ -size 0 | xargs rm -f &` 删除文件大小为零的文件

`ls -l | grep '.jar'` 查找当前目录中的所有jar文件

`grep 'test' d*` 显示所有以d开头的文件中包含test的行。

`grep 'test' aa bb cc` 显示在aa，bb，cc文件中匹配test的行。

`grep '[a-z]\{5\}' aa` 显示所有包含每个字符串至少有5个连续小写字符的字符串的行。

<!-- MORE -->

## 查看一个程序是否运行

`ps –ef|grep tomcat` 查看所有有关tomcat的进程

## 终止线程

`kill -9 19979` 终止线程号位19979的进程

## 查看文件，包含隐藏文件

```shell
ls -al
```

## 当前工作目录

```shell
pwd
```

## 复制文件

`cp source dest` 复制文件

`cp -r sourceFolder targetFolder` 递归复制整个文件夹

`scp sourecFile romoteUserName@remoteIp:remoteAddr` 远程拷贝

## 创建目录

```shell
mkdir newfolder
```

## 删除目录

`rmdir deleteEmptyFolder` 删除空目录 `rm -rf deleteFile` 递归删除目录中所有内容

## 移动文件

```shell
mv /temp/movefile /targetFolder
```

## 重命令

```shell
mv oldNameFile newNameFile
```

## 切换用户

```shellshell
su -username
sudo su - username
```

## 修改文件权限

`chmod 777 file.java` //file.java的权限-rwxrwxrwx，r表示读、w表示写、x表示可执行

## 压缩文件

```shell
tar -czf test.tar.gz /test1 /test2
```

## 列出压缩文件列表

```shell
tar -tzf test.tar.gz
```

## 解压文件

```shell
tar -xvzf test.tar.gz
```

## 查看文件头10行

```
head -n 10 example.txt
```

## 查看文件尾10行

```shell
tail -n 10 example.txt
```

## 查看日志类型文件

`tail -f exmaple.log` //这个命令会自动显示新增内容，屏幕只显示10行内容的（可设置）。

## 使用超级管理员身份执行命令

`sudo rm a.txt` 使用管理员身份删除文件

## 查看端口占用情况

`netstat -tln | grep 8080` 查看端口8080的使用情况

## 查看端口属于哪个程序

```shell
lsof -i :8080
```

## 查看进程

`ps aux|grep java` 查看java进程

`ps aux` 查看所有进程

## 以树状图列出目录的内容

```shell
tree a
```

ps:[Mac下使用tree命令](http://www.hollischuang.com/archives/546)

##  文件下载

`wget http://file.tgz` [mac下安装wget命令](http://www.hollischuang.com/archives/548)

```shell
curl http://file.tgz
```

## 网络检测

```shell
ping www.just-ping.com
```

## 远程登录

```shell
ssh userName@ip
```

## 打印信息

`echo $JAVA_HOME` 打印java home环境变量的值

## java 常用命令

参考站点内关于的文章，java javac, jps ,jstat,jmap, jstack

## 其他命令

svn git maven

## linux命令学习网站:

http://explainshell.com/

## 参考资料

[Linux端口被占用的解决(Error: JBoss port is in use. Please check)](http://www.hollischuang.com/archives/239)

[linux 中强大且常用命令：find、grep](https://linux.cn/article-1672-1.html)