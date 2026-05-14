const { verifyJWT } = require('../middlewares/usersMiddleware')
const { Router } = require('express')
const protectedRouter = Router();
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: './config/.env' });


// 只是一个示例，通过这种方式要求访问路由前进行jwt验证，验证通过才可访问
// 发送格式：Authentication: bearer <jwt—token>
protectedRouter.get('/protected', verifyJWT, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
})

module.exports = protectedRouter;