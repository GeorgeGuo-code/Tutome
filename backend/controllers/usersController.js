const bcrypt = require('bcryptjs');
const usersMiddleware = require('../middlewares/usersMiddleware');
const queries = require('../models/queries')
const jwt = require('jsonwebtoken');

// 用户登录的功能
const loginUser = async (username, password, res) => {
  const user = await queries.findUserByUsername(username);

  if (!user) {
    return res.status(400).send("用户名或密码错误");
  }

  // 验证密码
  bcrypt.compare(password, user.password, (err, result) => {
    if (err) {
      return res.status(500).send("密码验证时发生错误");
    }

    if (!result) {
      return res.status(400).send("用户名或密码错误");
    }

    // 密码正确，返回成功消息或生成 token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });
};


module.exports = {
  loginUser,
}


