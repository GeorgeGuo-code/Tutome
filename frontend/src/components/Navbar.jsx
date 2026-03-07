import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { checkAuth, requireAuth } from '../services/auth';
import './Navbar.css';

export default function Navbar({ showMinimal = false, showLoginOnly = false }) {
  const [showChangePasswordModal, setShowChangePasswordModal] = React.useState(false);
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = React.useState('');
  const [passwordSuccess, setPasswordSuccess] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const username = localStorage.getItem('username');

  // 检查登录状态，如果过期则清除
  const isAuthenticated = checkAuth();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login';
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setIsSubmitting(true);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('新密码和确认密码不一致');
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const userId = decoded.userId;

      const response = await fetch(`http://localhost:3000/api/users/${userId}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setPasswordSuccess('密码修改成功！');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => {
          setShowChangePasswordModal(false);
          setPasswordSuccess('');
        }, 2000);
      } else {
        setPasswordError(data.message || '密码修改失败');
      }
    } catch (error) {
      setPasswordError('服务器错误，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotLoggedIn = () => {
    alert('请先登录');
    window.location.href = '/login';
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          TUTOME
        </Link>
        <div className="nav-links">
          {showLoginOnly ? (
            // 登录界面导航栏（只保留主页）
            <>
              <NavLink to="/" className="nav-link">主页</NavLink>
            </>
          ) : showMinimal ? (
            // 简化版导航栏（主页）
            <>
              {isAuthenticated && username ? (
                <div className="nav-dropdown">
                  <span className="nav-link nav-username">{username}</span>
                  <div className="dropdown-menu">
                    <span className="dropdown-item" onClick={() => setShowChangePasswordModal(true)}>修改密码</span>
                    <span className="dropdown-item" onClick={handleLogout}>退出登录</span>
                  </div>
                </div>
              ) : (
                <NavLink to="/login" className="nav-link">登录</NavLink>
              )}
            </>
          ) : (
            // 完整版导航栏
            <>
              <NavLink to="/" className="nav-link">主页</NavLink>
              {isAuthenticated && username ? (
                <>
                  <NavLink to="/personal" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>个人中心</NavLink>
                  <NavLink to="/ask" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>提问</NavLink>
                  <NavLink to="/browse" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>浏览</NavLink>
                  <NavLink to="/match" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>匹配</NavLink>
                  <div className="nav-dropdown">
                    <span className="nav-link nav-username">{username}</span>
                    <div className="dropdown-menu">
                      <span className="dropdown-item" onClick={() => setShowChangePasswordModal(true)}>修改密码</span>
                      <span className="dropdown-item" onClick={handleLogout}>退出登录</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <span className="nav-link" onClick={handleNotLoggedIn} style={{ cursor: 'pointer' }}>个人中心</span>
                  <span className="nav-link" onClick={handleNotLoggedIn} style={{ cursor: 'pointer' }}>提问</span>
                  <span className="nav-link" onClick={handleNotLoggedIn} style={{ cursor: 'pointer' }}>浏览</span>
                  <span className="nav-link" onClick={handleNotLoggedIn} style={{ cursor: 'pointer' }}>匹配</span>
                  <NavLink to="/login" className="nav-link">登录</NavLink>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 修改密码模态框 */}
      {showChangePasswordModal && (
        <div className="modal-overlay" onClick={() => setShowChangePasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">修改密码</h2>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>当前密码</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>新密码</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  required
                />
              </div>
              {passwordError && <div className="error-message">{passwordError}</div>}
              {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}
              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-button secondary"
                  onClick={() => setShowChangePasswordModal(false)}
                  disabled={isSubmitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="modal-button primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '提交中...' : '确认修改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}