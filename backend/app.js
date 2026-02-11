/*依赖：
express bcryptjs pg dotenv jsonwebtoken cors

npm install express bcryptjs pg dotenv jsonwebtoken
*/

const express = require('express');
const cors = require('cors');  // 引入 cors 中间件
const usersRouter = require('./routes/usersRouter');
const protectedRouter = require('./routes/protectedRouter');  // 受jwt保护的api
const questionsRouter = require('./routes/questionsRouter'); 
const app = express();

app.use(cors());  // 使用 cors 中间件
app.use(express.json());  // 用于解析 JSON 格式的请求体
app.use(usersRouter);
app.use(questionsRouter);
app.use(protectedRouter);



app.listen(3000, () => {
  console.log('Server listen on port 3000');
})