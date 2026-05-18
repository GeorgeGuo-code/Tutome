import { Routes, Route, useNavigate } from 'react-router-dom';
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
import PreSessionQuiz from './components/PreSessionQuiz';
import PostSessionSurvey from './components/PostSessionSurvey';
import Navbar from './components/Navbar';
import NotificationPopup from './components/NotificationPopup';
import InteractiveGuide from './components/InteractiveGuide';
import socketService from './services/socketService';
import './app.css';

export default function App() {
  const [notifications, setNotifications] = useState([]);
  const [guideActive, setGuideActive] = useState(false);

  // 监听 sessionStorage 变化以恢复引导状态
  useEffect(() => {
    const savedGuideActive = sessionStorage.getItem('guideActive');
    if (savedGuideActive === 'true') {
      setGuideActive(true);
    }
  }, []);

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
      // round_review_completed 和 conversation_summary_completed 由 dialogue.jsx 处理，全局弹窗不需要显示（避免多标签页重复弹出）
      if (notification.type === 'round_review_completed' || notification.type === 'conversation_summary_completed') {
        console.log('跳过全局弹窗显示:', notification.type);
        return;
      }
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

  const navigate = useNavigate();

  const handleNotificationClick = (notification, action) => {
    removeNotification(notification.id);
    if (notification.type === 'pair_application' || notification.type === 'end_request') {
      navigate('/personal', { state: { activeTab: 'notifications' } });
    } else if (notification.type === 'pair_accepted') {
      navigate('/personal', { state: { activeTab: 'history', scrollTo: 'in-progress' } });
    } else if (notification.type === 'private_message' && action === 'reply') {
      navigate('/personal', { state: { activeTab: 'notifications', openPrivateMessage: true, replyToNickname: notification.senderNickname } });
    }
  };

  const handleGuideComplete = () => {
    setGuideActive(false);
    sessionStorage.removeItem('guideActive');
    sessionStorage.removeItem('guideStep');
    sessionStorage.removeItem('guidePersonalReloaded');
    sessionStorage.removeItem('guidePendingHighlight');
  };

  const handleGuideNavigate = (path) => {
    // 导航到 /personal 时使用 window.location.href 确保页面刷新
    if (path === '/personal') {
      window.location.href = '/personal';
    } else {
      navigate(path);
    }
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<><Navbar showMinimal={true} /><Home guideActive={guideActive} onGuideActiveChange={setGuideActive} /></>} />
        <Route path="/login" element={<><Navbar showLoginOnly={true} /><Login /></>} />
        <Route path="/ask" element={<><Navbar /><Ask /></>} />
        <Route path="/browse" element={<><Navbar /><Browse /></>} />
        <Route path="/match" element={<><Navbar /><Match /></>} />
        <Route path="/personal" element={<><Navbar /><Personal /></>} />
        <Route path="/reward-exchange" element={<><Navbar /><RewardExchange /></>} />
        <Route path="/dialogue/:pairId" element={<><Navbar /><Dialogue /></>} />
        <Route path="/question/:id" element={<><Navbar /><Post /></>} />
        <Route path="/quiz/pre/:pairId" element={<><Navbar showMinimal={true} /><PreSessionQuiz /></>} />
        <Route path="/quiz/post/:pairId" element={<><Navbar showMinimal={true} /><PostSessionSurvey /></>} />
      </Routes>
      <NotificationPopup
        notifications={notifications}
        onRemove={removeNotification}
        onNotificationClick={handleNotificationClick}
      />
      <InteractiveGuide
        active={guideActive}
        onComplete={handleGuideComplete}
        onNavigate={handleGuideNavigate}
        guideModeRef={null}
      />
    </>
  );
}