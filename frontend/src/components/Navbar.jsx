import { Link } from 'react-router-dom';
import './Navbar.css';

export default function Navbar({ showMinimal = false, showLoginOnly = false }) {
  const username = localStorage.getItem('username');

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
              <Link to="/" className="nav-link">主页</Link>
            </>
          ) : showMinimal ? (
            // 简化版导航栏（主页）
            <>
              {username ? (
                <div className="nav-dropdown">
                  <span className="nav-link nav-username">{username}</span>
                  <div className="dropdown-menu">
                    <span className="dropdown-item" onClick={handleLogout}>退出登录</span>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="nav-link">登录</Link>
              )}
            </>
          ) : (
            // 完整版导航栏
            <>
              <Link to="/" className="nav-link">主页</Link>
              {username ? (
                <>
                  <Link to="/personal" className="nav-link">个人中心</Link>
                  <Link to="/ask" className="nav-link">提问</Link>
                  <Link to="/browse" className="nav-link">浏览</Link>
                  <Link to="/match" className="nav-link">匹配</Link>
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
                  <Link to="/login" className="nav-link">登录</Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}