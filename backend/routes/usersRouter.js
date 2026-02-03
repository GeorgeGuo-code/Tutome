const { Router } = require('express');
const usersController = require('../controllers/usersController')
const queries = require('../models/queries')
const usersRouter = Router();
const jwt = require('jsonwebtoken');


require('dotenv').config({ path: './config/.env' });

// 新建用户
usersRouter.post('/api/register', async (req, res) => {
 // 从请求体中解构出用户名和密码
  const { username, password } = req.body;

  // 确保用户名和密码存在
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码是必填项' });
  }

  try {
    // 调用 registerUser 函数
    const result = await queries.registerUser(username, password);

    // 根据结果返回响应
    if (result.success) {
      res.status(200).json(result); // 注册成功
    } else {
      res.status(400).json(result); // 注册失败
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 登录
usersRouter.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  await usersController.loginUser(username, password, res);

  
});

// 验证JWT
usersRouter.post('/api/verify-token', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1]; // 获取 Authorization 头中的 JWT

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // JWT 验证通过，返回成功
    res.json({ message: 'Token is valid', user: decoded });
  });
});


module.exports = usersRouter;