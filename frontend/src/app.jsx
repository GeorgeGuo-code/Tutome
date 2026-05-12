import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/home';
import Login from './pages/login';
import Ask from './pages/ask';
import Browse from './pages/browse';
import Match from './pages/match';
import Personal from './pages/personal';
import RewardExchange from './pages/RewardExchange';
import Dialogue from './pages/dialogue';
import Post from './pages/post';
import Navbar from './components/Navbar';
import NotificationPopup from './components/NotificationPopup';
import socketService from './services/socketService';
import './app.css';

export default function App() {
  const [notifications, setNotifications] = useState([]);

  // 调试：监听notifications状态变化
  useEffect(() => {
    console.log('当前通知数量:', notifications.length);
    console.log('通知列表:', notifications);
  }, [notifications]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('未登录，跳过Socket.IO连接');
      return;
    }

    console.log('正在初始化Socket.IO连接...');

    // 初始化 Socket.IO 连接
    socketService.connect(token);

    // 检查连接状态
    setTimeout(() => {
      console.log('Socket.IO连接状态:', socketService.isConnected() ? '已连接' : '未连接');
    }, 1000);

    // 监听通知事件
    const handleNotification = (notification) => {
      console.log('收到实时通知:', notification);
      console.log('通知类型:', notification.type);
      console.log('申请人用户名:', notification.applicantUsername);
      setNotifications((prev) => [notification, ...prev]);
    };

    socketService.on('notification', handleNotification);

    // 清理函数
    return () => {
      socketService.off('notification', handleNotification);
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<><Navbar showMinimal={true} /><Home /></>} />
        <Route path="/login" element={<><Navbar showLoginOnly={true} /><Login /></>} />
        <Route path="/ask" element={<><Navbar /><Ask /></>} />
        <Route path="/browse" element={<><Navbar /><Browse /></>} />
        <Route path="/match" element={<><Navbar /><Match /></>} />
        <Route path="/personal" element={<><Navbar /><Personal /></>} />
        <Route path="/reward-exchange" element={<><Navbar /><RewardExchange /></>} />
        <Route path="/dialogue/:pairId" element={<><Navbar /><Dialogue /></>} />
        <Route path="/question/:id" element={<><Navbar /><Post /></>} />
      </Routes>
      <NotificationPopup
        notifications={notifications}
        onRemove={removeNotification}
      />
    </>
  );
}
