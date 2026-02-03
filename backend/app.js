/*依赖：
express bcryptjs pg dotenv jsonwebtoken

npm install express bcryptjs pg dotenv jsonwebtoken
*/

const express = require('express');
const usersRouter = require('./routes/usersRouter');
const protectedRouter = require('./routes/protectedRouter');  // 受jwt保护的api

const app = express();

app.use(express.json());  // 用于解析 JSON 格式的请求体
app.use(usersRouter);

app.use(protectedRouter);



app.listen(3000, () => {
  console.log('Server listen on port 3000');
})