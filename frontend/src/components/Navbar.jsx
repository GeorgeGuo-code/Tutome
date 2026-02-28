import { Link, NavLink, useLocation } from 'react-router-dom';
import { checkAuth, requireAuth } from '../services/auth';
import './Navbar.css';

export default function Navbar({ showMinimal = false, showLoginOnly = false }) {
  const username = localStorage.getItem('username');

  // 检查登录状态，如果过期则清除
  const isAuthenticated = checkAuth();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login';
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
  );
}