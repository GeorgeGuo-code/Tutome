import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/apiService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 初始化时验证 Token
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await authService.verifyToken();
        if (result.success && result.data) {
          setUser(result.data.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('认证验证失败:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 登录方法
  const login = async (username, password) => {
    const result = await authService.login(username, password);
    if (result.success) {
      setUser(result.data.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, message: result.data.message || '登录失败' };
  };

  // 注册方法
  const register = async (username, password) => {
    const result = await authService.register(username, password);
    return { success: result.success, message: result.data.message };
  };

  // 注销方法
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 自定义 Hook 方便使用
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
};

export default AuthContext;