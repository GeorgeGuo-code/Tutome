import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/home';
import Login from './pages/login';

export default function App() {
  return (
    <>
      <nav>
        <Link to="/">首页</Link> |{" "}
        <Link to="/login">登录</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}
