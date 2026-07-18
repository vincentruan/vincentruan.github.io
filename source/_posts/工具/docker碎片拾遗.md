---
title: docker碎片拾遗
date: 2018-06-24 13:22:34
categories: docker
tags:
- docker
---

## 进入shell环境

```
docker ps
docker exec -it <container> bash
```

and run

```
apt-get update
apt-get install vim
```

## ！不要去改系统配置

正常运行的docker先保存一下docker的ID，之后不要去改下面的配置，否则docker会更新为新的那个，导致数据丢失

![1529818594236](docker碎片拾遗/1529818594236.png)

## docker指令

### 1、启动docker
```bash
docker run -it --privileged=true -v /home/oracle/download:/usr/Downloads centos /bin/bash
```

### 2、查看当前docker运行
```bash
docker ps -a
```
### 3、提交docker
```bash
docker commit 9f73a02d5ef0[CONTAINER ID] docker.io/ubuntu[REPOSITORY]
```
### 4、查看容器的root用户密码
```bash
docker logs <容器名orID> 2>&1 | grep '^User: ' | tail -n1
```
因为docker容器启动时的root用户的密码是随机分配的。所以，通过这种方式就可以得到redmine容器的root用户的密码了。

### 5、查看容器日志
```bash
docker logs -f <容器名orID>
```
### 6、查看正在运行的容器
```bash
docker ps
docker ps -a为查看所有的容器，包括已经停止的。
```
### 7、删除所有容器
```bash
docker rm $(docker ps -a -q)
```
### 8、删除单个容器
```bash
docker rm <容器名orID>
```
### 9、停止、启动、杀死一个容器
```bash
docker stop <容器名orID>

docker start <容器名orID>

docker kill <容器名orID>
```
### 10、查看所有镜像
```bash
docker images
```
### 11、删除所有镜像
```bash
docker rmi $(docker images | grep none | awk '{print $3}' | sort -r)
```
### 12、运行一个新容器，同时为它命名、端口映射、文件夹映射。以redmine镜像为例
```bash
docker run --name redmine -p 9003:80 -p 9023:22 -d -v /var/redmine/files:/redmine/files -v   /var/redmine/mysql:/var/lib/mysql sameersbn/redmine
```
### 13、一个容器连接到另一个容器
```bash
docker run -i -t --name sonar -d -link mmysql:db  tpires/sonar-server
```
sonar容器连接到mmysql容器，并将mmysql容器重命名为db。这样，sonar容器就可以使用db的相关的环境变量了。

### 14、拉取镜像
```bash
docker pull <镜像名:tag>
```
如docker pull sameersbn/redmine:latest

当需要把一台机器上的镜像迁移到另一台机器的时候，需要保存镜像与加载镜像。

机器a
```bash
docker save busybox-1 > /home/save.tar
```
使用scp将save.tar拷到机器b上，然后：
```bash
docker load < /home/save.tar
```
### 15、构建自己的镜像
```bash
docker build -t <镜像名> <Dockerfile路径>
```
如Dockerfile在当前路径：docker build -t xx/gitlab .