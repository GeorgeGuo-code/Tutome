const { Router } = require('express');
const usersController = require('../controllers/usersController')
const usersRouter = Router();


require('dotenv').config({ path: './config/.env' });

// 新建用户
usersRouter.post('/api/register', usersController.createUser);

// 登录
usersRouter.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  await usersController.loginUser(username, password, res);
});

// 验证JWT
usersRouter.post('/api/verify-token', usersController.verifyUserToken);


module.exports = usersRouter;