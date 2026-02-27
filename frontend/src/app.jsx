import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/home';
import Login from './pages/login';
import Ask from './pages/ask';
import Browse from './pages/browse';
import Match from './pages/match';
import Personal from './pages/personal';
import Dialogue from './pages/dialogue';
import Post from './pages/post';
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
            <Link to="/personal" className="nav-link">个人中心</Link>
            <Link to="/ask" className="nav-link">提问</Link>
            <Link to="/browse" className="nav-link">浏览</Link>
            <Link to="/match" className="nav-link">匹配</Link>
            <Link to="/login" className="nav-link">登录</Link>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/ask" element={<Ask />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/match" element={<Match />} />
        <Route path="/personal" element={<Personal />} />
        <Route path="/dialogue/:pairId" element={<Dialogue />} />
        <Route path="/question/:id" element={<Post />} />
      </Routes>
    </>
  );
}
