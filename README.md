# Tutome
Our SQTP project

## Directory Framework
/frontend                    # React 前端项目 <br>
  ├── /public<br>
  ├── /src<br>
      ├── /components<br>
      ├── /pages<br>
      ├── /services           # 与后端通信的 API 请求<br>
      └── index.js<br>
/backend                     # Express 后端项目<br>
  ├── /controllers<br>
  ├── /models<br>
  ├── /routes                # RESTful API 路由<br>
  ├── /config<br>
  ├── /middlewares<br>
  └── server.js              # Express 启动文件<br>
PS .gitkeep文件是空文件，目的是让git追踪空文件夹。如果你向文件夹加入了内容，可以删除这个文件。

## Workflow
master分支存放稳定版本，develop分支用于开发，这两个分支长期存在<br>
开发时可以在feature分支开发新功能，然后合并到develop<br>
develop分支开发完后，合并到release分支，进行预发布测试，最后再合并到master分支<br>
hotfix分支用于修复bug，修完合并到master分支<br>
详细介绍参考：https://www.bilibili.com/video/BV1HM411377j/?spm_id_from=333.1391.0.0&p=19&vd_source=79cb42fe63cd2766615fed67ff5da29d<br>
尽量遵守吧！
