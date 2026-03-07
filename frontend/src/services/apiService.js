// 获取 API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 通用请求方法
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  return response;
};

// 认证相关 API
export const authService = {
  // 用户登录
  login: async (username, password) => {
    const response = await request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    
    if (response.ok && data.token) {
      localStorage.setItem('token', data.token);
    }
    
    return { success: response.ok, data };
  },

  // 用户注册
  register: async (username, password) => {
    const response = await request('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    return { success: response.ok, data };
  },

  // 验证 Token
  verifyToken: async () => {
    const token = localStorage.getItem('token');
    if (!token) return { success: false, data: null };

    const response = await request('/verify-token', {
      method: 'POST',
    });
    
    const data = await response.json();
    return { success: response.ok, data };
  },

  // 用户注销
  logout: () => {
    localStorage.removeItem('token');
    return { success: true };
  },
};

export default authService;