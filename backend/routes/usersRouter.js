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

// 获取可用用户列表（需要JWT验证）
usersRouter.get('/api/users/available', verifyJWT, usersController.getAvailableUsers);

// 学科列表（用于结对、学科偏好选择）
usersRouter.get('/api/topics', usersController.getTopics);
// 难度标签列表（用于难度偏好选择）
usersRouter.get('/api/tags/difficulty', usersController.getDifficultyTags);

// 用户信息系统：资料与学科偏好
usersRouter.get('/api/users/me/profile', verifyJWT, usersController.getMyProfile);
usersRouter.patch('/api/users/me/profile', verifyJWT, usersController.updateMyProfile);
usersRouter.get('/api/users/:userId/profile', usersController.getProfileByUserId);

module.exports = usersRouter;