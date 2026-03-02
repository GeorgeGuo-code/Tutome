const { Router } = require('express');
const usersController = require('../controllers/usersController')
const { verifyJWT } = require('../middlewares/usersMiddleware');
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

// 修改密码（需要JWT验证）
usersRouter.post('/api/users/:userId/change-password', verifyJWT, usersController.updatePassword);


module.exports = usersRouter;