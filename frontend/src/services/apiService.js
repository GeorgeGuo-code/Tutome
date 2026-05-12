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

// 用户资料相关 API
export const userService = {
  // 获取我的资料
  getMyProfile: async () => {
    const response = await request('/users/me/profile');
    const data = await response.json();
    return { success: response.ok, data };
  },

  // 更新我的资料
  updateMyProfile: async (data) => {
    const response = await request('/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return { success: response.ok, data: result };
  },

  // 获取学科列表
  getTopics: async () => {
    const response = await request('/topics');
    const data = await response.json();
    return { success: response.ok, data };
  },

  // 获取难度标签列表
  getDifficultyTags: async () => {
    const response = await request('/tags/difficulty');
    const data = await response.json();
    return { success: response.ok, data };
  },
};

// 奖励相关 API
export const rewardService = {
  // 获取用户抽奖信息
  getRewardInfo: async () => {
    const response = await request('/reward/info');
    const data = await response.json();
    return { success: response.ok, data };
  },

  // 抽取奖励
  drawReward: async (drawMode) => {
    const response = await request('/reward/draw', {
      method: 'POST',
      body: JSON.stringify({ drawMode }),
    });
    const data = await response.json();
    return { success: response.ok, data };
  },

  // 记录抽取结果
  recordReward: async (rewards) => {
    const response = await request('/reward/record', {
      method: 'POST',
      body: JSON.stringify({ rewards }),
    });
    const data = await response.json();
    return { success: response.ok, data };
  },

  // 兑换奖励
  exchangeReward: async (data) => {
    const response = await request('/reward/exchange', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return { success: response.ok, data: result };
  },

  // 获取兑换记录列表
  getExchangeRecords: async () => {
    const response = await request('/reward/exchanges');
    const data = await response.json();
    return { success: response.ok, data };
  },

  // 更新兑换记录
  updateExchangeRecord: async (id, data) => {
    const response = await request(`/reward/exchange/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return { success: response.ok, data: result };
  },
};

export default authService;