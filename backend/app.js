/*依赖：
express bcryptjs pg dotenv jsonwebtoken cors socket.io

npm install express bcryptjs pg dotenv jsonwebtoken cors socket.io
*/

const express = require('express');
const http = require('http');
const cors = require('cors');  // 引入 cors 中间件
const { Server } = require('socket.io');
const usersRouter = require('./routes/usersRouter');
const protectedRouter = require('./routes/protectedRouter');  // 受jwt保护的api
const questionsRouter = require('./routes/questionsRouter');
const chatsRouter = require('./routes/chatsRouter');
const aiRouter = require('./routes/aiRouter');
const rewardRouter = require('./routes/rewardRouter');
const app = express();

app.use(cors());  // 使用 cors 中间件
app.use(express.json());  // 用于解析 JSON 格式的请求体



app.use(usersRouter);
app.use(questionsRouter);
app.use(protectedRouter);
app.use(chatsRouter);
app.use(aiRouter);
app.use(rewardRouter); 


// 创建 HTTP 服务器
const server = http.createServer(app);

// 创建 Socket.IO 服务器
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // 前端开发服务器地址
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 导出 io 供其他模块使用
module.exports.io = io;

// 导入在线状态管理
require('./services/onlineStatusService')(io);

server.listen(3000, () => {
  console.log('Server listen on port 3000');
});