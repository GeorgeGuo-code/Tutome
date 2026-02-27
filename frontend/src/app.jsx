import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/home';
import Login from './pages/login';
import './app.css';

export default function App() {
  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            TUTOME
          </Link>
          <div className="nav-links">
            <Link to="/" className="nav-link">首页</Link>
            <Link to="/login" className="nav-link">登录</Link>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}
