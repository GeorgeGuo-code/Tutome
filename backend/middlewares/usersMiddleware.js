const jwt = require('jsonwebtoken');

// 验证 JWT 的中间件函数
// 发送：Authorization: Bearer <token>
function verifyJWT(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // 从 Authorization 头中获取 token

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // 将解码后的信息附加到请求对象上，以便后续路由使用
    req.user = decoded; // `decoded` 包含了 JWT 中的 payload
    next(); // 调用下一个中间件或路由处理函数
  });
}

module.exports = {
  verifyJWT
}
