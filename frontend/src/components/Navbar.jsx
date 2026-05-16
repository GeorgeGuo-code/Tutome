import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { checkAuth, requireAuth } from '../services/auth';
import { HomeIcon, PenIcon, SearchIcon, HandshakeIcon, UserIcon, MenuIcon, KeyIcon } from './icons';
import './Navbar.css';

export default function Navbar({ showMinimal = false, showLoginOnly = false }) {
  const [showChangePasswordModal, setShowChangePasswordModal] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = React.useState('');
  const [passwordSuccess, setPasswordSuccess] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const username = localStorage.getItem('username');
  const location = useLocation();

  // 关闭移动端菜单（路由变化时）
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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

      const response = await fetch(`/api/users/${userId}/change-password`, {
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

  const navLinks = [
    { to: '/ask', label: '提问', Icon: PenIcon, guideData: 'ask-link' },
    { to: '/browse', label: '浏览', Icon: SearchIcon },
    { to: '/match', label: '匹配', Icon: HandshakeIcon },
    { to: '/personal', label: '我的', Icon: UserIcon, guideData: 'personal-card' },
  ];

  return (
    <>
      {/* 桌面端顶部导航栏 */}
      <nav className="navbar navbar-desktop">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            TUTOME
          </Link>
          <div className="nav-links">
            {showLoginOnly ? (
              <NavLink to="/" className="nav-link">主页</NavLink>
            ) : showMinimal ? (
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
              <>
                <NavLink to="/" className="nav-link">主页</NavLink>
                {isAuthenticated && username ? (
                  <>
                    {navLinks.map(link => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                        data-guide={link.guideData}
                      >
                        {link.label}
                      </NavLink>
                    ))}
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
      </nav>

      {/* 移动端底部 Tab 栏 */}
      {!showLoginOnly && (
        <nav className="navbar-mobile">
          <div className="mobile-tabs">
            <NavLink to="/" className={({ isActive }) => `mobile-tab ${isActive ? 'mobile-tab-active' : ''}`}>
              <span className="mobile-tab-icon"><HomeIcon size={22} /></span>
              <span className="mobile-tab-label">主页</span>
            </NavLink>
            {isAuthenticated ? (
              <>
                {navLinks.map(link => {
                  const IconComponent = link.Icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) => `mobile-tab ${isActive ? 'mobile-tab-active' : ''}`}
                      data-guide={link.guideData}
                    >
                      <span className="mobile-tab-icon"><IconComponent size={22} /></span>
                      <span className="mobile-tab-label">{link.label}</span>
                    </NavLink>
                  );
                })}
                <button
                  className={`mobile-tab ${mobileMenuOpen ? 'mobile-tab-active' : ''}`}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <span className="mobile-tab-icon">
                    {showMinimal ? <UserIcon size={22} /> : <MenuIcon size={22} />}
                  </span>
                  <span className="mobile-tab-label">{showMinimal ? username || '我' : '菜单'}</span>
                </button>
              </>
            ) : (
              <NavLink to="/login" className={({ isActive }) => `mobile-tab ${isActive ? 'mobile-tab-active' : ''}`}>
                <span className="mobile-tab-icon"><KeyIcon size={22} /></span>
                <span className="mobile-tab-label">登录</span>
              </NavLink>
            )}
          </div>
        </nav>
      )}

      {/* 移动端侧滑菜单 */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-menu">
            <div className="mobile-menu-header">
              <span className="mobile-menu-username">{username || '用户'}</span>
              <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>×</button>
            </div>
            <div className="mobile-menu-items">
              <button className="mobile-menu-item" onClick={() => { setShowChangePasswordModal(true); setMobileMenuOpen(false); }}>
                <KeyIcon size={20} /> 修改密码
              </button>
              <button className="mobile-menu-item mobile-menu-item-danger" onClick={handleLogout}>
                <span className="mobile-menu-item-icon">→</span> 退出登录
              </button>
            </div>
          </div>
        </>
      )}

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
    </>
  );
}
