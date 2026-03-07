// 认证相关的工具函数

// 检查 token 是否过期
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    // JWT token 格式: header.payload.signature
    const payload = token.split('.')[1];
    if (!payload) return true;

    const decoded = JSON.parse(atob(payload));
    const currentTime = Math.floor(Date.now() / 1000);

    // 提前 5 分钟判断为过期，给用户留出操作时间
    return decoded.exp < currentTime + 300;
  } catch (error) {
    console.error('Token 解析失败:', error);
    return true;
  }
};

// 检查登录状态，如果过期则跳转到登录页
export const checkAuth = () => {
  const token = localStorage.getItem('token');

  if (!token || isTokenExpired(token)) {
    // 清除过期的认证信息
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    return false;
  }

  return true;
};

// 强制检查并跳转（用于需要登录的页面）
export const requireAuth = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    // 未登录
    alert('请先登录');
    window.location.href = '/login';
    return false;
  }

  if (isTokenExpired(token)) {
    // 登录已过期
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    alert('登录已过期，请重新登录');
    window.location.href = '/login';
    return false;
  }

  return true;
};

// 获取当前用户信息
export const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  if (!token || isTokenExpired(token)) {
    return null;
  }

  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      userId: decoded.userId,
      username: username
    };
  } catch (error) {
    return null;
  }
};