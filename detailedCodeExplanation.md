# Tutome 项目代码详细介绍

> 文档生成日期：2026-03-22  
> 目标读者：新加入项目的开发者  
> 文档目的：帮助开发者快速理解项目架构、代码结构和功能实现

---

## 目录

- [项目概述](#项目概述)
- [第一部分：前端](#第一部分前端frontend)
- [第二部分：后端](#第二部分后端backend)
- [第三部分：数据库](#第三部分数据库)
- [附录](#附录)

---

## 项目概述

### 1. 项目简介

**Tutome** 是一个互助学习平台，旨在连接学习者和教学者，实现知识共享和实时交流。平台核心功能包括：

- **问题发布**：用户可以发布学习问题，标注学科、难度和进度标签
- **结对学习**：教师和学生可以结成学习对，进行一对一辅导
- **实时聊天**：结对后支持实时消息交流
- **通知系统**：实时推送结对申请、接受、拒绝等通知
- **个人中心**：管理个人资料、偏好设置、历史记录

### 2. 技术栈总览

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | React 18 + Vite |
| 路由管理 | React Router v6 |
| 状态管理 | React Context API |
| 实时通信 | Socket.IO Client |
| HTTP 客户端 | Fetch API |
| 样式方案 | CSS（原生） |
| 后端框架 | Express.js 5.x |
| 数据库 | PostgreSQL |
| 认证方案 | JWT (jsonwebtoken) |
| 密码加密 | bcryptjs |
| 实时服务 | Socket.IO Server |

### 3. 项目架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              用户界面层 (React)                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  Home   │ │  Login  │ │  Ask    │ │ Browse  │ │ Match   │ │Dialogue │ ...   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
│       │           │           │           │           │           │            │
│  ┌────┴───────────┴───────────┴───────────┴───────────┴───────────┴────┐       │
│  │                    Context (AuthContext)                             │       │
│  └────────────────────────────────┬────────────────────────────────────┘       │
└───────────────────────────────────┼────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
              ┌─────▼─────┐                  ┌──────▼──────┐
              │  HTTP API │                  │  Socket.IO  │
              │  (Fetch)  │                  │  (实时通信)  │
              └─────┬─────┘                  └──────┬──────┘
                    │                               │
┌───────────────────┼───────────────────────────────┼───────────────────────────┐
│                   │      后端服务层 (Express)      │                           │
│  ┌────────────────▼────────────────┐    ┌─────────▼─────────┐                │
│  │         Routes 路由层            │    │  onlineStatus     │                │
│  │  usersRouter | questionsRouter  │    │  Service          │                │
│  │  chatsRouter | protectedRouter  │    │  (Socket.IO)      │                │
│  └────────────────┬────────────────┘    └─────────┬─────────┘                │
│                   │                               │                           │
│  ┌────────────────▼────────────────┐              │                           │
│  │       Controllers 控制器层       │◄─────────────┘                           │
│  │  usersCtrl | questionsCtrl      │                                          │
│  │  chatsCtrl                       │                                          │
│  └────────────────┬────────────────┘                                          │
│                   │                                                            │
│  ┌────────────────▼────────────────┐                                          │
│  │       Middleware 中间件层        │                                          │
│  │       verifyJWT (JWT验证)        │                                          │
│  └────────────────┬────────────────┘                                          │
│                   │                                                            │
│  ┌────────────────▼────────────────┐                                          │
│  │       Models 模型层              │                                          │
│  │  queries.js (业务逻辑)           │                                          │
│  │  pool.js   (数据库连接池)        │                                          │
│  └────────────────┬────────────────┘                                          │
└───────────────────┼────────────────────────────────────────────────────────────┘
                    │
        ┌───────────▼───────────┐
        │     PostgreSQL        │
        │      数据库            │
        └───────────────────────┘
```

---

# 第一部分：前端（frontend/）

## 目录结构

```
frontend/
├── index.html                    # HTML 入口文件
├── package.json                  # 项目依赖配置
├── package-lock.json             # 依赖锁定文件
├── vite.config.js                # Vite 构建配置
├── .env                          # 环境变量（本地）
├── .env.example                  # 环境变量示例
├── dist/                         # 构建输出目录
├── node_modules/                 # 依赖包目录
└── src/                          # 源代码目录
    ├── index.jsx                 # React 应用入口
    ├── app.jsx                   # 主应用组件（路由配置）
    ├── app.css                   # 全局样式
    ├── components/               # 公共组件目录
    │   ├── Navbar.jsx            # 导航栏组件
    │   ├── Navbar.css            # 导航栏样式
    │   ├── NotificationPopup.jsx # 通知弹窗组件
    │   ├── NotificationPopup.css # 通知弹窗样式
    │   ├── FeatureTipModal.jsx   # 功能提示模态框
    │   ├── FeatureTipModal.css   # 功能提示样式
    │   └── ProtectedRoute.jsx    # 路由守卫组件
    ├── contexts/                 # React Context 目录
    │   └── AuthContext.jsx       # 认证状态上下文
    ├── pages/                    # 页面组件目录
    │   ├── home.jsx / home.css   # 首页
    │   ├── login.jsx / login.css # 登录注册页
    │   ├── ask.jsx / ask.css     # 发布问题页
    │   ├── browse.jsx / browse.css # 问题浏览页
    │   ├── match.jsx / match.css # 结对匹配页
    │   ├── personal.jsx / personal.css # 个人中心页
    │   ├── dialogue.jsx / dialogue.css # 对话聊天页
    │   └── post.jsx / post.css   # 问题详情页
    └── services/                 # 服务层目录
        ├── apiService.js         # API 请求封装
        ├── auth.js               # 认证服务
        └── socketService.js      # Socket.IO 客户端服务
```

---

## 1. 配置与入口文件

### 1.1 package.json

**文件路径**: `frontend/package.json`

**功能说明**: 定义项目依赖、脚本命令和项目元信息。

**关键依赖**:

```json
{
  "dependencies": {
    "react": "^18.2.0",           // React 核心库
    "react-dom": "^18.2.0",       // React DOM 渲染
    "react-router-dom": "^6.20.0", // 路由管理
    "socket.io-client": "^4.7.2"  // Socket.IO 客户端
  },
  "devDependencies": {
    "vite": "^5.0.0",             // 构建工具
    "@vitejs/plugin-react": "^4.2.0" // React 插件
  }
}
```

**可用脚本**:

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（端口 5173） |
| `npm run build` | 构建生产版本到 dist/ |
| `npm run preview` | 预览生产构建 |

---

### 1.2 vite.config.js

**文件路径**: `frontend/vite.config.js`

**功能说明**: Vite 构建工具配置文件。

**配置内容**:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,           // 开发服务器端口
    host: true            // 允许外部访问
  }
})
```

---

### 1.3 index.html

**文件路径**: `frontend/index.html`

**功能说明**: 应用 HTML 入口文件，Vite 以此为入口打包。

**关键内容**:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tutome - 互助学习平台</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.jsx"></script>
  </body>
</html>
```

---

### 1.4 index.jsx

**文件路径**: `frontend/src/index.jsx`

**功能说明**: React 应用入口，负责挂载根组件。

**代码详解**:

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app'
import { AuthProvider } from './contexts/AuthContext'
import './app.css'

// 创建 React 根节点并渲染
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>          {/* 路由容器 */}
      <AuthProvider>         {/* 认证上下文提供者 */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
```

**设计说明**:
- `BrowserRouter`: 提供 HTML5 History API 路由
- `AuthProvider`: 全局认证状态管理
- `React.StrictMode`: 开发模式下的严格检查

---

## 2. 核心应用文件

### 2.1 app.jsx

**文件路径**: `frontend/src/app.jsx`

**功能说明**: 主应用组件，定义路由结构和初始化 Socket.IO 连接。

**完整代码与注释**:

```javascript
import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/home';
import Login from './pages/login';
import Ask from './pages/ask';
import Browse from './pages/browse';
import Match from './pages/match';
import Personal from './pages/personal';
import Dialogue from './pages/dialogue';
import Post from './pages/post';
import Navbar from './components/Navbar';
import NotificationPopup from './components/NotificationPopup';
import socketService from './services/socketService';
import './app.css';

export default function App() {
  // 通知状态管理
  const [notifications, setNotifications] = useState([]);

  // 调试：监听 notifications 状态变化
  useEffect(() => {
    console.log('当前通知数量:', notifications.length);
  }, [notifications]);

  // Socket.IO 连接初始化
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('未登录，跳过Socket.IO连接');
      return;
    }

    // 初始化 Socket.IO 连接
    socketService.connect(token);

    // 监听通知事件
    const handleNotification = (notification) => {
      console.log('收到实时通知:', notification);
      setNotifications((prev) => [notification, ...prev]);
    };

    socketService.on('notification', handleNotification);

    // 清理函数：组件卸载时断开连接
    return () => {
      socketService.off('notification', handleNotification);
    };
  }, []);

  // 移除通知
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <>
      <Routes>
        {/* 首页：显示简化的导航栏 */}
        <Route path="/" element={<><Navbar showMinimal={true} /><Home /></>} />
        
        {/* 登录页：只显示登录按钮 */}
        <Route path="/login" element={<><Navbar showLoginOnly={true} /><Login /></>} />
        
        {/* 以下是需登录的页面 */}
        <Route path="/ask" element={<><Navbar /><Ask /></>} />
        <Route path="/browse" element={<><Navbar /><Browse /></>} />
        <Route path="/match" element={<><Navbar /><Match /></>} />
        <Route path="/personal" element={<><Navbar /><Personal /></>} />
        
        {/* 对话页：动态路由，pairId 为结对ID */}
        <Route path="/dialogue/:pairId" element={<><Navbar /><Dialogue /></>} />
        
        {/* 问题详情页：动态路由，id 为问题ID */}
        <Route path="/question/:id" element={<><Navbar /><Post /></>} />
      </Routes>
      
      {/* 全局通知弹窗组件 */}
      <NotificationPopup
        notifications={notifications}
        onRemove={removeNotification}
      />
    </>
  );
}
```

**路由结构图**:

```
/                    → Home (首页，简化导航栏)
/login               → Login (登录注册)
/ask                 → Ask (发布问题)
/browse              → Browse (浏览问题)
/match               → Match (结对匹配)
/personal            → Personal (个人中心)
/dialogue/:pairId    → Dialogue (对话聊天)
/question/:id        → Post (问题详情)
```

---

### 2.2 app.css

**文件路径**: `frontend/src/app.css`

**功能说明**: 全局样式定义，包括颜色变量、重置样式、通用布局。

**核心样式变量**:

```css
:root {
  --primary-color: #4F46E5;      /* 主题色 */
  --primary-hover: #4338CA;      /* 悬停色 */
  --background-color: #F9FAFB;   /* 背景色 */
  --text-primary: #111827;       /* 主文字色 */
  --text-secondary: #6B7280;     /* 次要文字色 */
  --border-color: #E5E7EB;       /* 边框色 */
  --success-color: #10B981;      /* 成功色 */
  --error-color: #EF4444;        /* 错误色 */
}
```

---

## 3. 上下文管理（contexts/）

### 3.1 AuthContext.jsx

**文件路径**: `frontend/src/contexts/AuthContext.jsx`

**功能说明**: 全局认证状态管理，提供用户登录状态、用户信息、登录/登出方法。

**核心代码**:

```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/auth';

// 创建认证上下文
const AuthContext = createContext(null);

// 认证上下文提供者组件
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // 当前用户信息
  const [loading, setLoading] = useState(true); // 加载状态

  // 初始化时验证 token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 验证 token 并获取用户信息
      auth.verifyToken(token).then(userData => {
        setUser(userData);
        setLoading(false);
      }).catch(() => {
        localStorage.removeItem('token');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // 登录方法
  const login = async (username, password) => {
    const { token, user } = await auth.login(username, password);
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  // 登出方法
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 自定义 Hook：获取认证上下文
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

**使用方式**:

```javascript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, loading } = useAuth();
  
  if (loading) return <div>加载中...</div>;
  if (!user) return <LoginButton onClick={() => login(...)} />;
  
  return <div>欢迎, {user.username} <button onClick={logout}>登出</button></div>;
}
```

---

## 4. 公共组件（components/）

### 4.1 Navbar.jsx / Navbar.css

**文件路径**: `frontend/src/components/Navbar.jsx`

**功能说明**: 全局导航栏组件，根据页面类型显示不同的导航选项。

**Props 参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `showMinimal` | boolean | 首页模式，只显示 Logo 和登录按钮 |
| `showLoginOnly` | boolean | 登录页模式，只显示 Logo |

**核心逻辑**:

```javascript
export default function Navbar({ showMinimal = false, showLoginOnly = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // 获取未读通知数量
  useEffect(() => {
    if (user) {
      fetchUnreadCount().then(setUnreadCount);
    }
  }, [user]);

  // 登录页模式
  if (showLoginOnly) {
    return (
      <nav className="navbar">
        <div className="navbar-logo" onClick={() => navigate('/')}>
          Tutome
        </div>
      </nav>
    );
  }

  // 首页模式
  if (showMinimal) {
    return (
      <nav className="navbar">
        <div className="navbar-logo">Tutome</div>
        <div className="navbar-actions">
          <button onClick={() => navigate('/login')}>登录</button>
        </div>
      </nav>
    );
  }

  // 完整导航栏（已登录用户）
  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={() => navigate('/')}>Tutome</div>
      <div className="navbar-links">
        <Link to="/browse">浏览问题</Link>
        <Link to="/ask">发布问题</Link>
        <Link to="/match">结对匹配</Link>
      </div>
      <div className="navbar-actions">
        <NotificationBadge count={unreadCount} />
        <Link to="/personal">个人中心</Link>
        <button onClick={logout}>登出</button>
      </div>
    </nav>
  );
}
```

---

### 4.2 NotificationPopup.jsx / NotificationPopup.css

**文件路径**: `frontend/src/components/NotificationPopup.jsx`

**功能说明**: 实时通知弹窗组件，显示从 Socket.IO 接收的通知。

**Props 参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `notifications` | Array | 通知列表 |
| `onRemove` | Function | 移除通知的回调函数 |

**通知类型**:

| type | 说明 |
|------|------|
| `pair_application` | 收到结对申请 |
| `pair_accepted` | 结对申请被接受 |
| `pair_rejected` | 结对申请被拒绝 |
| `end_request` | 收到结束结对请求 |

**核心逻辑**:

```javascript
export default function NotificationPopup({ notifications, onRemove }) {
  // 根据通知类型渲染不同内容
  const renderContent = (notification) => {
    switch (notification.type) {
      case 'pair_application':
        return `${notification.applicantUsername} 想要与您结对学习`;
      case 'pair_accepted':
        return `您的结对申请已被接受`;
      case 'pair_rejected':
        return `您的结对申请已被拒绝`;
      case 'end_request':
        return `对方请求结束本次教学`;
      default:
        return notification.content;
    }
  };

  return (
    <div className="notification-popup-container">
      {notifications.map((notification) => (
        <div key={notification.id} className="notification-item">
          <span>{renderContent(notification)}</span>
          <button onClick={() => onRemove(notification.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
```

---

### 4.3 FeatureTipModal.jsx / FeatureTipModal.css

**文件路径**: `frontend/src/components/FeatureTipModal.jsx`

**功能说明**: 功能提示模态框，用于向新用户介绍功能。

**Props 参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `isOpen` | boolean | 是否显示模态框 |
| `onClose` | Function | 关闭回调 |
| `title` | string | 提示标题 |
| `content` | string | 提示内容 |

---

### 4.4 ProtectedRoute.jsx

**文件路径**: `frontend/src/components/ProtectedRoute.jsx`

**功能说明**: 路由守卫组件，保护需要登录的页面。

**核心逻辑**:

```javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!user) {
    // 未登录则重定向到登录页
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

---

## 5. 页面组件（pages/）

### 5.1 home.jsx / home.css

**文件路径**: `frontend/src/pages/home.jsx`

**功能说明**: 网站首页，展示平台介绍和主要功能入口。

**核心功能**:
- 平台 Logo 和 Slogan 展示
- 功能特性介绍卡片
- 快速入口按钮（浏览问题、发布问题、结对匹配）

---

### 5.2 login.jsx / login.css

**文件路径**: `frontend/src/pages/login.jsx`

**功能说明**: 登录/注册页面，支持表单切换。

**核心功能**:
- 登录表单（用户名 + 密码）
- 注册表单（用户名 + 密码 + 确认密码）
- 表单验证
- 错误提示显示
- 登录成功后跳转

**核心代码片段**:

```javascript
export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    try {
      if (isLogin) {
        await login(formData.username, formData.password);
      } else {
        await auth.register(formData.username, formData.password);
        await login(formData.username, formData.password);
      }
      navigate('/browse');
    } catch (err) {
      setError(err.message || '操作失败');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>{isLogin ? '登录' : '注册'}</h2>
        {error && <div className="error">{error}</div>}
        <input
          type="text"
          placeholder="用户名"
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
        />
        <input
          type="password"
          placeholder="密码"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
        />
        {!isLogin && (
          <input
            type="password"
            placeholder="确认密码"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
          />
        )}
        <button type="submit">{isLogin ? '登录' : '注册'}</button>
        <p onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? '没有账号？立即注册' : '已有账号？立即登录'}
        </p>
      </form>
    </div>
  );
}
```

---

### 5.3 ask.jsx / ask.css

**文件路径**: `frontend/src/pages/ask.jsx`

**功能说明**: 发布问题页面，用户可以创建新的学习问题。

**核心功能**:
- 问题标题和内容输入
- 标签选择（学科、难度、进度）
- 选择角色（学生/教师）
- 表单验证
- 提交发布

**标签选择规则**:

| 分类 | 最少选择 | 最多选择 |
|------|----------|----------|
| 学科 (subject) | 1 | 2 |
| 难度 (difficulty) | 1 | 1 |
| 进度 (progress) | 1 | 1 |

**核心代码片段**:

```javascript
export default function Ask() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState({ subject: [], difficulty: [], progress: [] });
  const [role, setRole] = useState('student');

  // 从 API 获取标签列表
  useEffect(() => {
    fetchTags().then(setTags);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 验证标签选择
    if (selectedTags.subject.length < 1 || selectedTags.difficulty.length !== 1) {
      setError('请完善标签选择');
      return;
    }

    // 提交问题
    await createQuestion({
      title,
      content,
      role,
      tagIds: [...selectedTags.subject, ...selectedTags.difficulty, ...selectedTags.progress]
    });
    
    navigate('/browse');
  };

  return (
    <div className="ask-container">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="问题标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="问题描述..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        
        {/* 角色选择 */}
        <div className="role-selector">
          <button type="button" 
            className={role === 'student' ? 'active' : ''} 
            onClick={() => setRole('student')}>
            我是学生
          </button>
          <button type="button" 
            className={role === 'teacher' ? 'active' : ''} 
            onClick={() => setRole('teacher')}>
            我是教师
          </button>
        </div>

        {/* 标签选择组件 */}
        <TagSelector
          tags={tags}
          selected={selectedTags}
          onChange={setSelectedTags}
        />

        <button type="submit">发布问题</button>
      </form>
    </div>
  );
}
```

---

### 5.4 browse.jsx / browse.css

**文件路径**: `frontend/src/pages/browse.jsx`

**功能说明**: 问题浏览页面，支持分页、筛选和搜索。

**核心功能**:
- 问题列表展示（标题、内容预览、标签、作者、时间）
- 分页加载
- 多标签筛选搜索
- 点击进入问题详情

**核心代码片段**:

```javascript
export default function Browse() {
  const [questions, setQuestions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ subject: [], difficulty: [], progress: [] });

  // 加载问题列表
  useEffect(() => {
    loadQuestions();
  }, [page, filters]);

  const loadQuestions = async () => {
    setLoading(true);
    const data = await searchQuestions({
      page,
      ...filters
    });
    setQuestions(prev => page === 1 ? data : [...prev, ...data]);
    setLoading(false);
  };

  return (
    <div className="browse-container">
      {/* 筛选栏 */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* 问题列表 */}
      <div className="questions-list">
        {questions.map(question => (
          <QuestionCard
            key={question.id}
            question={question}
            onClick={() => navigate(`/question/${question.id}`)}
          />
        ))}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <button onClick={() => setPage(p => p + 1)} disabled={loading}>
          {loading ? '加载中...' : '加载更多'}
        </button>
      )}
    </div>
  );
}
```

---

### 5.5 match.jsx / match.css

**文件路径**: `frontend/src/pages/match.jsx`

**功能说明**: 结对匹配页面，用户可以寻找合适的学习伙伴。

**核心功能**:
- 显示当前可匹配的用户列表
- 根据学科偏好筛选
- 发起结对申请
- 查看已发送/已收到的申请
- 接受/拒绝结对申请

**核心代码片段**:

```javascript
export default function Match() {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [myPairs, setMyPairs] = useState([]);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    loadAvailableUsers();
    loadMyPairs();
  }, []);

  // 发起结对申请
  const handleApply = async (targetUserId, topicId) => {
    await applyPair({
      recipientId: targetUserId,
      topicId
    });
    alert('申请已发送');
  };

  // 接受结对
  const handleAccept = async (pairId) => {
    await acceptPair(pairId);
    navigate(`/dialogue/${pairId}`);
  };

  return (
    <div className="match-container">
      <div className="tabs">
        <button className={activeTab === 'available' ? 'active' : ''} 
          onClick={() => setActiveTab('available')}>
          可匹配用户
        </button>
        <button className={activeTab === 'pairs' ? 'active' : ''} 
          onClick={() => setActiveTab('pairs')}>
          我的结对
        </button>
      </div>

      {activeTab === 'available' ? (
        <UserList users={availableUsers} onApply={handleApply} />
      ) : (
        <PairList pairs={myPairs} onAccept={handleAccept} />
      )}
    </div>
  );
}
```

---

### 5.6 personal.jsx / personal.css

**文件路径**: `frontend/src/pages/personal.jsx`

**功能说明**: 个人中心页面，管理用户资料和偏好设置。

**核心功能**:
- 个人资料展示和编辑（昵称、简介、头像）
- 感兴趣的学科设置
- 擅长的学科设置
- 难度偏好设置
- 我的问题列表
- 我的教学历史

**核心代码片段**:

```javascript
export default function Personal() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateProfile = async (data) => {
    await updateProfile(data);
    loadProfile();
  };

  const handleSetTopics = async (type, topicIds) => {
    if (type === 'interested') {
      await setInterestedTopics(topicIds);
    } else {
      await setProficientTopics(topicIds);
    }
  };

  return (
    <div className="personal-container">
      <div className="sidebar">
        <button onClick={() => setActiveTab('profile')}>个人资料</button>
        <button onClick={() => setActiveTab('preferences')}>偏好设置</button>
        <button onClick={() => setActiveTab('questions')}>我的问题</button>
        <button onClick={() => setActiveTab('history')}>教学历史</button>
      </div>

      <div className="content">
        {activeTab === 'profile' && (
          <ProfileEditor profile={profile} onSave={handleUpdateProfile} />
        )}
        {activeTab === 'preferences' && (
          <PreferencesEditor
            interested={profile?.interestedTopics}
            proficient={profile?.proficientTopics}
            difficulty={profile?.difficultyPreferences}
            onSave={handleSetTopics}
          />
        )}
        {/* ... 其他 tab 内容 */}
      </div>
    </div>
  );
}
```

---

### 5.7 dialogue.jsx / dialogue.css

**文件路径**: `frontend/src/pages/dialogue.jsx`

**功能说明**: 对话聊天页面，结对学生和教师进行实时交流。

**核心功能**:
- 实时消息收发（Socket.IO）
- 消息历史加载
- 教学时间统计
- 请求结束教学
- 接受/拒绝结束请求

**路由参数**:
- `pairId`: 结对 ID（从 URL 获取）

**核心代码片段**:

```javascript
export default function Dialogue() {
  const { pairId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pairInfo, setPairInfo] = useState(null);
  const messagesEndRef = useRef(null);

  // 加载历史消息
  useEffect(() => {
    loadMessages(pairId).then(setMessages);
    loadPairInfo(pairId).then(setPairInfo);
  }, [pairId]);

  // 监听新消息
  useEffect(() => {
    const handleNewMessage = (msg) => {
      if (msg.pairId === parseInt(pairId)) {
        setMessages(prev => [...prev, msg]);
      }
    };
    socketService.on('new_message', handleNewMessage);
    return () => socketService.off('new_message', handleNewMessage);
  }, [pairId]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(pairId, input);
    setInput('');
  };

  // 请求结束教学
  const handleRequestEnd = async () => {
    if (confirm('确定要请求结束本次教学吗？')) {
      await requestEndTeaching(pairId);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="dialogue-container">
      <div className="dialogue-header">
        <span>与 {pairInfo?.partnerName} 的对话</span>
        <span>教学时长: {formatTime(pairInfo?.duration)}</span>
        <button onClick={handleRequestEnd}>结束教学</button>
      </div>

      <div className="messages-list">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            content={msg.content}
            isOwn={msg.senderId === user.id}
            time={msg.createdAt}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>发送</button>
      </div>
    </div>
  );
}
```

---

### 5.8 post.jsx / post.css

**文件路径**: `frontend/src/pages/post.jsx`

**功能说明**: 问题详情页面，展示问题的完整内容，支持申请结对。

**路由参数**:
- `id`: 问题 ID（从 URL 获取）

**核心功能**:
- 问题详情展示（标题、内容、标签、作者）
- 申请结对按钮
- 作者的其他问题

**核心代码片段**:

```javascript
export default function Post() {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    loadQuestion(id).then(setQuestion);
  }, [id]);

  const handleApply = async (topicId) => {
    await applyPair({
      recipientId: question.userId,
      topicId,
      questionId: id
    });
    setShowApplyModal(false);
    alert('申请已发送');
  };

  if (!question) return <div>加载中...</div>;

  return (
    <div className="post-container">
      <h1>{question.title}</h1>
      <div className="meta">
        <span>作者: {question.author}</span>
        <span>发布于: {formatDate(question.createdAt)}</span>
      </div>
      <div className="tags">
        {question.tags.map(tag => (
          <span key={tag.id} className={`tag ${tag.category}`}>{tag.name}</span>
        ))}
      </div>
      <div className="content">{question.content}</div>

      {question.userId !== user.id && (
        <button onClick={() => setShowApplyModal(true)}>
          申请结对学习
        </button>
      )}

      {showApplyModal && (
        <ApplyModal onApply={handleApply} onClose={() => setShowApplyModal(false)} />
      )}
    </div>
  );
}
```

---

## 6. 服务层（services/）

### 6.1 apiService.js

**文件路径**: `frontend/src/services/apiService.js`

**功能说明**: 封装所有 HTTP API 请求，提供统一的请求接口。

**核心配置**:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// 通用请求方法
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '请求失败');
  }
  
  return response.json();
}

// 导出请求方法
export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, data) => request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  patch: (endpoint, data) => request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  del: (endpoint) => request(endpoint, { method: 'DELETE' })
};
```

**API 方法列表**:

```javascript
// 用户相关
export const userApi = {
  login: (username, password) => api.post('/api/login', { username, password }),
  register: (username, password) => api.post('/api/register', { username, password }),
  getProfile: () => api.get('/api/users/me/profile'),
  updateProfile: (data) => api.patch('/api/users/me/profile', data),
  getAvailableUsers: () => api.get('/api/users/available'),
  heartbeat: () => api.post('/api/users/heartbeat')
};

// 问题相关
export const questionApi = {
  create: (data) => api.post('/api/questions', data),
  getList: (params) => api.get(`/api/questions?${new URLSearchParams(params)}`),
  getById: (id) => api.get(`/api/questions/${id}`),
  delete: (id) => api.del(`/api/questions/${id}`),
  search: (params) => api.post('/api/questions/search', params),
  getMyQuestions: () => api.get('/api/questions/my-questions'),
  getMyHistory: () => api.get('/api/questions/my-history')
};

// 结对聊天相关
export const pairApi = {
  apply: (data) => api.post('/api/pairs/apply', data),
  accept: (pairId) => api.post('/api/pairs/accept', { pairId }),
  reject: (pairId) => api.post(`/api/pairs/${pairId}/reject`),
  getMyPairs: () => api.get('/api/pairs'),
  getById: (pairId) => api.get(`/api/pairs/${pairId}`)
};

export const chatApi = {
  getMessages: (pairId) => api.get(`/api/chats/${pairId}`),
  sendMessage: (pairId, content) => api.post(`/api/chats/${pairId}`, { content }),
  endTeaching: (pairId) => api.post(`/api/chats/${pairId}/end`),
  requestEnd: (pairId) => api.post(`/api/chats/${pairId}/request-end`),
  acceptEnd: (pairId) => api.post(`/api/chats/${pairId}/accept-end`),
  rejectEnd: (pairId) => api.post(`/api/chats/${pairId}/reject-end`)
};

export const notificationApi = {
  getPending: () => api.get('/api/notifications/pending'),
  markAsRead: (id) => api.patch(`/api/notifications/${id}/read`)
};
```

---

### 6.2 auth.js

**文件路径**: `frontend/src/services/auth.js`

**功能说明**: 认证服务，处理登录、注册、Token 验证。

**核心方法**:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const auth = {
  // 用户登录
  async login(username, password) {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data; // { token, user }
  },

  // 用户注册
  async register(username, password) {
    const response = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
  },

  // 验证 Token
  async verifyToken(token) {
    const response = await fetch(`${API_URL}/api/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Token 无效');
    return data.user;
  }
};
```

---

### 6.3 socketService.js

**文件路径**: `frontend/src/services/socketService.js`

**功能说明**: Socket.IO 客户端服务，管理实时通信连接。

**核心功能**:
- Socket.IO 连接管理
- 事件监听和发送
- 断线重连

**完整代码**:

```javascript
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  // 连接服务器
  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket 已连接，跳过重复连接');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,          // 自动重连
      reconnectionAttempts: 5,     // 重连尝试次数
      reconnectionDelay: 1000      // 重连延迟
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Socket.IO 已连接:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('Socket.IO 断开连接:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO 连接错误:', error);
    });
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // 检查连接状态
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  // 监听事件
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // 取消监听
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // 发送事件
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // 发送心跳
  sendHeartbeat() {
    this.emit('heartbeat');
  }
}

// 导出单例
export default new SocketService();
```

**使用示例**:

```javascript
// 在 App.jsx 中使用
useEffect(() => {
  const token = localStorage.getItem('token');
  if (token) {
    socketService.connect(token);
    
    // 监听通知
    socketService.on('notification', (notification) => {
      console.log('收到通知:', notification);
    });

    // 定时发送心跳
    const heartbeatInterval = setInterval(() => {
      socketService.sendHeartbeat();
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      socketService.disconnect();
    };
  }
}, []);
```

---

# 第二部分：后端（backend/）

## 目录结构

```
backend/
├── app.js                       # 应用入口文件
├── package.json                 # 项目依赖配置
├── package-lock.json            # 依赖锁定文件
├── database.sql                 # 主数据库结构
├── migrate.sql                  # 数据库迁移脚本
├── migrate_notifications.sql    # 通知系统迁移
├── migrate_online_status.sql    # 在线状态迁移
├── migrate_preferences_refine.sql # 偏好设置迁移
├── migrate_user_profiles.sql    # 用户资料迁移
├── test_api.js                  # API 测试脚本
├── test_tags.js                 # 标签测试脚本
├── fix_tags.js                  # 标签修复脚本
├── config/                      # 配置目录
│   └── .env                     # 环境变量（需手动创建）
├── controllers/                 # 控制器目录
│   ├── usersController.js       # 用户控制器
│   ├── questionsController.js   # 问题控制器
│   └── chatsController.js       # 聊天控制器
├── middlewares/                 # 中间件目录
│   └── usersMiddleware.js       # JWT 验证中间件
├── models/                      # 模型层目录
│   ├── pool.js                  # 数据库连接池
│   └── queries.js               # 数据库查询逻辑
├── routes/                      # 路由目录
│   ├── usersRouter.js           # 用户路由
│   ├── questionsRouter.js       # 问题路由
│   ├── chatsRouter.js           # 聊天路由
│   └── protectedRouter.js       # 受保护路由示例
├── services/                    # 服务层目录
│   └── onlineStatusService.js   # 在线状态服务
├── api-docs/                    # API 文档目录
│   ├── users-api.md             # 用户 API 文档
│   ├── users-profile-api.md     # 用户资料 API 文档
│   ├── questions-api.md         # 问题 API 文档
│   └── chats-api.md             # 聊天 API 文档
└── node_modules/                # 依赖包目录
```

---

## 1. 主应用（app.js）

**文件路径**: `backend/app.js`

**功能说明**: Express 应用入口，初始化服务器、中间件、路由和 Socket.IO。

**完整代码与注释**:

```javascript
/*
 * Tutome 后端服务入口
 * 依赖: express bcryptjs pg dotenv jsonwebtoken cors socket.io
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// 导入路由
const usersRouter = require('./routes/usersRouter');
const protectedRouter = require('./routes/protectedRouter');
const questionsRouter = require('./routes/questionsRouter');
const chatsRouter = require('./routes/chatsRouter');

// 创建 Express 应用
const app = express();

// 中间件配置
app.use(cors());           // 跨域支持
app.use(express.json());   // JSON 请求体解析

// 注册路由
app.use(usersRouter);
app.use(questionsRouter);
app.use(protectedRouter);
app.use(chatsRouter);

// 创建 HTTP 服务器
const server = http.createServer(app);

// 创建 Socket.IO 服务器
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',  // 前端开发服务器地址
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 导出 io 供其他模块使用
module.exports.io = io;

// 初始化在线状态管理服务
require('./services/onlineStatusService')(io);

// 启动服务器
server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

**架构图**:

```
┌─────────────────────────────────────────────────────────┐
│                      app.js                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Express Application                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │   │
│  │  │  CORS   │ │  JSON   │ │ Routes  │ │ Error │ │   │
│  │  │Middleware│ │Parser   │ │         │ │Handler│ │   │
│  │  └─────────┘ └─────────┘ └────┬────┘ └───────┘ │   │
│  └───────────────────────────────┼─────────────────┘   │
└──────────────────────────────────┼─────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐        ┌───────────────┐        ┌───────────────┐
│  usersRouter  │        │questionsRouter│        │  chatsRouter  │
└───────────────┘        └───────────────┘        └───────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Socket.IO Server                     │
│  ┌───────────────────────────────────────────────────┐ │
│  │           onlineStatusService                      │ │
│  │  • 用户连接/断开管理                                │ │
│  │  • 心跳检测                                         │ │
│  │  • 实时通知推送                                     │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 路由层（routes/）

### 2.1 usersRouter.js

**文件路径**: `backend/routes/usersRouter.js`

**功能说明**: 定义用户相关的 API 路由。

**路由列表**:

| 方法 | 路径 | 认证 | 控制器方法 | 功能说明 |
|------|------|------|------------|----------|
| POST | `/api/register` | 否 | createUser | 用户注册 |
| POST | `/api/login` | 否 | loginUser | 用户登录 |
| POST | `/api/verify-token` | 否 | verifyUserToken | Token 验证 |
| GET | `/api/topics` | 否 | getTopics | 获取学科列表 |
| GET | `/api/tags/difficulty` | 否 | getDifficultyTags | 获取难度标签 |
| PATCH | `/api/users/:userId/change-password` | 是 | updatePassword | 修改密码 |
| GET | `/api/users/available` | 是 | getAvailableUsers | 获取可匹配用户 |
| GET | `/api/users/me/profile` | 是 | getMyProfile | 获取个人资料 |
| PATCH | `/api/users/me/profile` | 是 | updateMyProfile | 更新个人资料 |
| GET | `/api/users/:userId/profile` | 否 | getProfileByUserId | 获取用户公开资料 |
| POST | `/api/users/heartbeat` | 是 | updateHeartbeat | 更新心跳 |

**核心代码**:

```javascript
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { verifyJWT } = require('../middlewares/usersMiddleware');

// 公开路由（无需认证）
router.post('/api/register', usersController.createUser);
router.post('/api/login', usersController.loginUser);
router.post('/api/verify-token', usersController.verifyUserToken);
router.get('/api/topics', usersController.getTopics);
router.get('/api/tags/difficulty', usersController.getDifficultyTags);

// 受保护路由（需要认证）
router.patch('/api/users/:userId/change-password', verifyJWT, usersController.updatePassword);
router.get('/api/users/available', verifyJWT, usersController.getAvailableUsers);
router.get('/api/users/me/profile', verifyJWT, usersController.getMyProfile);
router.patch('/api/users/me/profile', verifyJWT, usersController.updateMyProfile);
router.get('/api/users/:userId/profile', usersController.getProfileByUserId);
router.post('/api/users/heartbeat', verifyJWT, usersController.updateHeartbeat);

module.exports = router;
```

---

### 2.2 questionsRouter.js

**文件路径**: `backend/routes/questionsRouter.js`

**功能说明**: 定义问题相关的 API 路由。

**路由列表**:

| 方法 | 路径 | 认证 | 控制器方法 | 功能说明 |
|------|------|------|------------|----------|
| GET | `/api/questions` | 否 | getQuestions | 获取问题列表 |
| GET | `/api/tags` | 否 | getAvailableTags | 获取所有标签 |
| GET | `/api/tags/grouped` | 否 | getTagsByCategory | 按分类获取标签 |
| GET | `/api/tags/:tagId/questions` | 否 | getQuestionsByTagId | 按标签获取问题 |
| POST | `/api/questions` | 是 | createQuestion | 创建问题 |
| GET | `/api/questions/user/:userId` | 否 | getUserQuestions | 获取用户问题 |
| GET | `/api/questions/my-questions` | 是 | getUserQuestions | 获取我的问题 |
| GET | `/api/questions/my-history` | 是 | getUserHistory | 获取教学历史 |
| GET/POST | `/api/questions/search` | 否 | searchByMultipleTags | 多标签搜索 |
| GET | `/api/questions/:questionId` | 否 | getQuestionById | 获取问题详情 |
| DELETE | `/api/questions/:questionId` | 是 | deleteQuestion | 删除问题 |

---

### 2.3 chatsRouter.js

**文件路径**: `backend/routes/chatsRouter.js`

**功能说明**: 定义结对和聊天相关的 API 路由。

**路由列表**:

| 方法 | 路径 | 认证 | 功能说明 |
|------|------|------|----------|
| POST | `/api/pairs/apply` | 是 | 申请结对 |
| POST | `/api/pairs/accept` | 是 | 接受结对 |
| POST | `/api/pairs/:pairId/reject` | 是 | 拒绝结对 |
| GET | `/api/pairs` | 是 | 获取我的结对列表 |
| GET | `/api/pairs/:pairId` | 是 | 获取结对详情 |
| GET | `/api/pairs/question/:questionId` | 是 | 按问题获取结对 |
| POST | `/api/pairs/:pairId/associate` | 是 | 关联结对与问题 |
| GET | `/api/notifications/pending` | 是 | 获取待处理通知 |
| GET | `/api/notifications` | 是 | 获取通知列表 |
| PATCH | `/api/notifications/:notificationId/read` | 是 | 标记通知已读 |
| GET | `/api/notifications/unread-count` | 是 | 获取未读数量 |
| GET | `/api/chats/pending-requests` | 是 | 获取待处理请求 |
| GET | `/api/chats/:pairId` | 是 | 获取聊天记录 |
| POST | `/api/chats/:pairId` | 是 | 发送消息 |
| POST | `/api/chats/:pairId/end` | 是 | 直接结束教学 |
| POST | `/api/chats/:pairId/request-end` | 是 | 请求结束教学 |
| POST | `/api/chats/:pairId/accept-end` | 是 | 接受结束请求 |
| POST | `/api/chats/:pairId/reject-end` | 是 | 拒绝结束请求 |
| GET | `/api/chats/:pairId/time` | 是 | 获取教学时长 |

---

### 2.4 protectedRouter.js

**文件路径**: `backend/routes/protectedRouter.js`

**功能说明**: 受保护路由示例，用于测试 JWT 认证。

```javascript
const express = require('express');
const protectedRouter = express.Router();
const { verifyJWT } = require('../middlewares/usersMiddleware');

protectedRouter.get('/protected', verifyJWT, (req, res) => {
  res.json({ 
    message: 'This is a protected route', 
    user: req.user 
  });
});

module.exports = protectedRouter;
```

---

## 3. 控制器层（controllers/）

### 3.1 usersController.js

**文件路径**: `backend/controllers/usersController.js`

**功能说明**: 处理用户相关的业务逻辑请求。

**核心方法详解**:

#### loginUser - 用户登录

```javascript
async function loginUser(req, res) {
  const { username, password } = req.body;

  try {
    // 1. 查找用户
    const user = await queries.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    // 2. 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: '密码错误' });
    }

    // 3. 生成 JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '7d' }
    );

    // 4. 返回 Token 和用户信息
    res.json({ 
      token, 
      user: { id: user.id, username: user.username } 
    });
  } catch (error) {
    res.status(500).json({ message: '登录失败', error: error.message });
  }
}
```

#### createUser - 用户注册

```javascript
async function createUser(req, res) {
  const { username, password } = req.body;

  try {
    // 检查用户名是否已存在
    const existingUser = await queries.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 创建用户（密码在 queries 层加密）
    const newUser = await queries.registerUser(username, password);
    res.status(201).json({ 
      message: '注册成功', 
      user: { id: newUser.id, username: newUser.username } 
    });
  } catch (error) {
    res.status(500).json({ message: '注册失败', error: error.message });
  }
}
```

#### updateMyProfile - 更新个人资料

```javascript
async function updateMyProfile(req, res) {
  const userId = req.user.userId;
  const { nickname, bio, avatarUrl, interestedTopics, proficientTopics, difficultyPreferences } = req.body;

  try {
    // 更新基本资料
    if (nickname || bio || avatarUrl) {
      await queries.user.upsertProfile(userId, { nickname, bio, avatarUrl });
    }

    // 更新感兴趣的学科
    if (interestedTopics) {
      await queries.user.setInterestedTopics(userId, interestedTopics);
    }

    // 更新擅长的学科
    if (proficientTopics) {
      await queries.user.setProficientTopics(userId, proficientTopics);
    }

    // 更新难度偏好
    if (difficultyPreferences) {
      await queries.user.setDifficultyPreferences(userId, difficultyPreferences);
    }

    res.json({ message: '资料更新成功' });
  } catch (error) {
    res.status(500).json({ message: '更新失败', error: error.message });
  }
}
```

---

### 3.2 questionsController.js

**文件路径**: `backend/controllers/questionsController.js`

**功能说明**: 处理问题相关的业务逻辑请求。

**标签分类规则**:

```javascript
// 创建问题时的标签规则
const CATEGORY_RULES = {
  'subject': { min: 1, max: 2 },     // 学科：至少1个，最多2个
  'difficulty': { min: 1, max: 1 },  // 难度：必须1个
  'progress': { min: 1, max: 1 }     // 进度：必须1个
};

// 搜索时的标签规则（更宽松）
const SEARCH_CATEGORY_RULES = {
  'subject': { min: 1, max: 3 },     // 学科：1-3个
  'difficulty': { min: 0, max: 2 },  // 难度：0-2个
  'progress': { min: 0, max: 1 }     // 进度：0-1个
};
```

**核心方法详解**:

#### createQuestion - 创建问题

```javascript
async function createQuestion(req, res) {
  const { title, content, tagIds, role } = req.body;
  const userId = req.user.userId;

  try {
    // 1. 验证标签选择
    const tags = await queries.getTagsByIds(tagIds);
    const categorizedTags = categorizeTags(tags);
    
    for (const [category, rule] of Object.entries(CATEGORY_RULES)) {
      const count = categorizedTags[category]?.length || 0;
      if (count < rule.min || count > rule.max) {
        return res.status(400).json({ 
          message: `${category} 标签选择数量不正确` 
        });
      }
    }

    // 2. 创建问题
    const question = await queries.createQuestion({
      title, content, userId, role, tagIds
    });

    res.status(201).json({ 
      message: '问题创建成功', 
      question 
    });
  } catch (error) {
    res.status(500).json({ message: '创建失败', error: error.message });
  }
}
```

#### searchByMultipleTags - 多标签搜索

```javascript
async function searchByMultipleTags(req, res) {
  const { tagIds, page = 1, limit = 10 } = req.method === 'GET' 
    ? req.query 
    : req.body;

  try {
    // 解析标签 ID
    const parsedTagIds = typeof tagIds === 'string' 
      ? tagIds.split(',').map(Number) 
      : tagIds;

    // 执行搜索
    const questions = await queries.searchByMultipleTags({
      tagIds: parsedTagIds,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: '搜索失败', error: error.message });
  }
}
```

---

### 3.3 chatsController.js

**文件路径**: `backend/controllers/chatsController.js`

**功能说明**: 处理结对和聊天相关的业务逻辑请求。

**核心方法详解**:

#### applyPair - 申请结对

```javascript
async function applyPair(req, res) {
  const { recipientId, topicId, questionId } = req.body;
  const applicantId = req.user.userId;

  try {
    // 1. 检查是否已有进行中的结对
    const existingPair = await queries.pair.getActiveByUsers(applicantId, recipientId);
    if (existingPair) {
      return res.status(400).json({ message: '已有进行中的结对' });
    }

    // 2. 创建结对申请
    const pair = await queries.pair.create({
      teacherId: recipientId,  // 假设申请者是学生
      studentId: applicantId,
      topicId,
      questionId
    });

    // 3. 创建通知
    await queries.notification.create({
      userId: recipientId,
      type: 'pair_application',
      relatedId: pair.id,
      title: '新的结对申请',
      content: `用户希望与您结对学习`
    });

    // 4. 推送实时通知
    const { sendNotificationToUser } = require('../services/onlineStatusService');
    sendNotificationToUser(recipientId, {
      type: 'pair_application',
      pairId: pair.id,
      applicantId,
      applicantUsername: req.user.username
    });

    res.status(201).json({ message: '申请已发送', pair });
  } catch (error) {
    res.status(500).json({ message: '申请失败', error: error.message });
  }
}
```

#### requestEndTeaching - 请求结束教学

```javascript
async function requestEndTeaching(req, res) {
  const { pairId } = req.params;
  const userId = req.user.userId;

  try {
    // 1. 获取结对信息
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return res.status(404).json({ message: '结对不存在' });
    }

    // 2. 验证是否是结对成员
    if (pair.teacher_id !== userId && pair.student_id !== userId) {
      return res.status(403).json({ message: '无权操作' });
    }

    // 3. 更新结对状态
    await queries.pair.requestEnd(pairId, userId);

    // 4. 通知对方
    const partnerId = pair.teacher_id === userId ? pair.student_id : pair.teacher_id;
    sendNotificationToUser(partnerId, {
      type: 'end_request',
      pairId,
      requesterId: userId
    });

    res.json({ message: '已发送结束请求' });
  } catch (error) {
    res.status(500).json({ message: '操作失败', error: error.message });
  }
}
```

---

## 4. 中间件（middlewares/）

### 4.1 usersMiddleware.js

**文件路径**: `backend/middlewares/usersMiddleware.js`

**功能说明**: JWT Token 验证中间件。

**完整代码**:

```javascript
const jwt = require('jsonwebtoken');

/**
 * JWT 验证中间件
 * 验证请求头中的 Authorization: Bearer <token>
 */
function verifyJWT(req, res, next) {
  // 1. 从请求头获取 Token
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];  // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // 2. 验证 Token
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // 3. 将解码后的用户信息附加到请求对象
    req.user = decoded;  // { userId, username, iat, exp }
    next();
  });
}

module.exports = { verifyJWT };
```

**使用方式**:

```javascript
const { verifyJWT } = require('../middlewares/usersMiddleware');

// 需要认证的路由
router.get('/api/users/me/profile', verifyJWT, controller.getMyProfile);
```

---

## 5. 模型层（models/）

### 5.1 pool.js

**文件路径**: `backend/models/pool.js`

**功能说明**: PostgreSQL 数据库连接池配置。

**完整代码**:

```javascript
require('dotenv').config({ path: './config/.env' });
const { Pool } = require('pg');

// 创建连接池
const pool = new Pool({
  host: process.env.DB_HOST,        // 数据库主机
  user: process.env.DB_USER,        // 数据库用户
  database: process.env.DB_NAME,    // 数据库名称
  password: process.env.DB_PASSWORD,// 数据库密码
  port: process.env.DB_PORT || 5432 // 端口
});

// 监听连接错误
pool.on('error', (err) => {
  console.error('数据库连接池错误:', err);
});

module.exports = pool;
```

**环境变量配置** (`config/.env`):

```env
DB_HOST=localhost
DB_USER=your_username
DB_NAME=tutome
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET_KEY=your_secret_key
```

---

### 5.2 queries.js

**文件路径**: `backend/models/queries.js`

**功能说明**: 数据库查询逻辑层，包含所有 SQL 操作。

**文件结构**:

```javascript
const pool = require('./pool');
const bcrypt = require('bcryptjs');

// ==================== 用户相关 ====================

// 用户注册
async function registerUser(username, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
    [username, hashedPassword]
  );
  return result.rows[0];
}

// 查找用户
async function findUserById(id) { /* ... */ }
async function findUserByUsername(username) { /* ... */ }

// ==================== 问题相关 ====================

// 创建问题
async function createQuestion({ title, content, userId, role, tagIds }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 插入问题
    const questionResult = await client.query(
      'INSERT INTO questions (title, content, user_id, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, content, userId, role]
    );
    const question = questionResult.rows[0];

    // 关联标签
    for (const tagId of tagIds) {
      await client.query(
        'INSERT INTO question_tags (question_id, tag_id) VALUES ($1, $2)',
        [question.id, tagId]
      );
    }

    await client.query('COMMIT');
    return question;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 获取问题列表
async function getQuestions({ page, limit }) { /* ... */ }

// 多标签搜索
async function searchByMultipleTags({ tagIds, page, limit }) { /* ... */ }

// ==================== 嵌套对象 ====================

const queries = {
  // 用户操作
  user: {
    async getAvailableUsers(topicId) { /* ... */ },
    async updateLastActive(userId) { /* ... */ },
    async getProfile(userId) { /* ... */ },
    async upsertProfile(userId, data) { /* ... */ },
    async setInterestedTopics(userId, topicIds) { /* ... */ },
    async setProficientTopics(userId, topicIds) { /* ... */ },
    async setDifficultyPreferences(userId, tagIds) { /* ... */ }
  },

  // 结对操作
  pair: {
    async create(data) { /* ... */ },
    async accept(pairId) { /* ... */ },
    async getByUserId(userId) { /* ... */ },
    async end(pairId) { /* ... */ },
    async requestEnd(pairId, userId) { /* ... */ },
    async acceptEndRequest(pairId) { /* ... */ },
    async rejectEndRequest(pairId) { /* ... */ }
  },

  // 消息操作
  message: {
    async create(pairId, senderId, content) { /* ... */ },
    async getByPairId(pairId) { /* ... */ }
  },

  // 通知操作
  notification: {
    async create(data) { /* ... */ },
    async getByUserId(userId) { /* ... */ },
    async markAsRead(id) { /* ... */ },
    async getUnreadCount(userId) { /* ... */ }
  }
};

module.exports = { 
  registerUser, 
  findUserById, 
  findUserByUsername,
  createQuestion,
  getQuestions,
  searchByMultipleTags,
  ...queries 
};
```

**关键查询示例**:

#### 多标签搜索（带分类规则）

```javascript
async function searchByMultipleTags({ tagIds, page = 1, limit = 10 }) {
  const offset = (page - 1) * limit;

  const query = `
    SELECT DISTINCT q.*, u.username, array_agg(t.name) as tag_names
    FROM questions q
    JOIN users u ON q.user_id = u.id
    JOIN question_tags qt ON q.id = qt.question_id
    JOIN tags t ON qt.tag_id = t.id
    WHERE q.id IN (
      SELECT DISTINCT question_id 
      FROM question_tags 
      WHERE tag_id = ANY($1)
    )
    GROUP BY q.id, u.username
    ORDER BY q.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const result = await pool.query(query, [tagIds, limit, offset]);
  return result.rows;
}
```

---

## 6. 服务层（services/）

### 6.1 onlineStatusService.js

**文件路径**: `backend/services/onlineStatusService.js`

**功能说明**: 管理用户在线状态和实时通知推送。

**核心数据结构**:

```javascript
const onlineUsers = new Map();  // Map<userId, { socketId, lastHeartbeat }>

const HEARTBEAT_INTERVAL = 30000;  // 心跳间隔：30秒
const TIMEOUT_DURATION = 120000;   // 超时时间：2分钟
```

**完整代码结构**:

```javascript
module.exports = function(io) {
  // JWT 认证中间件（用于 Socket.IO）
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('认证失败：缺少 token'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('认证失败：token 无效'));
    }
  });

  // 连接事件
  io.on('connection', (socket) => {
    const userId = socket.userId;
    
    // 加入用户房间
    socket.join(`user:${userId}`);
    
    // 记录在线状态
    onlineUsers.set(userId, {
      socketId: socket.id,
      lastHeartbeat: Date.now()
    });
    
    // 广播在线状态
    io.emit('user_online', { userId });

    // 心跳事件
    socket.on('heartbeat', () => {
      const user = onlineUsers.get(userId);
      if (user) {
        user.lastHeartbeat = Date.now();
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user_offline', { userId });
    });
  });

  // 定时检查超时用户
  setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of onlineUsers) {
      if (now - data.lastHeartbeat > TIMEOUT_DURATION) {
        onlineUsers.delete(userId);
        io.emit('user_offline', { userId });
      }
    }
  }, HEARTBEAT_INTERVAL);
};

// 导出的辅助函数
function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

function sendNotificationToUser(userId, notification) {
  io.to(`user:${userId}`).emit('notification', notification);
}

module.exports.getOnlineUsers = getOnlineUsers;
module.exports.isUserOnline = isUserOnline;
module.exports.sendNotificationToUser = sendNotificationToUser;
```

**Socket 事件列表**:

| 事件名 | 方向 | 数据 | 说明 |
|--------|------|------|------|
| `connection` | 服务端 | - | 用户连接 |
| `disconnect` | 服务端 | - | 用户断开 |
| `heartbeat` | 客户端 | - | 心跳检测 |
| `notification` | 服务端 | notification 对象 | 实时通知推送 |
| `user_online` | 服务端 | { userId } | 用户上线广播 |
| `user_offline` | 服务端 | { userId } | 用户下线广播 |

---

## 7. API 文档（api-docs/）

API 文档目录包含以下文件：

| 文件 | 内容 |
|------|------|
| `users-api.md` | 用户注册、登录、Token 验证 |
| `users-profile-api.md` | 用户资料、偏好设置 |
| `questions-api.md` | 问题 CRUD、标签搜索 |
| `chats-api.md` | 结对申请、聊天消息、通知 |

---

# 第三部分：数据库

## ER 关系图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 数据库 ER 关系图                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │    users     │
    │──────────────│
    │ PK id        │
    │    username  │
    │    password  │
    │    last_active│
    │    created_at│
    └──────┬───────┘
           │
           │ 1:1
           ▼
    ┌──────────────┐
    │user_profiles │
    │──────────────│
    │ PK id        │
    │ FK user_id   │───┐
    │    nickname  │   │
    │    bio       │   │
    │    avatar_url│   │
    └──────────────┘   │
                       │
           ┌───────────┴───────────────────────────────────┐
           │                                               │
           │ 1:N                                           │ 1:N
           ▼                                               ▼
    ┌──────────────┐                              ┌──────────────┐
    │  questions   │                              │    pairs     │
    │──────────────│                              │──────────────│
    │ PK id        │                              │ PK id        │
    │ FK user_id   │◄─────────────────────────────│ FK teacher_id│──┐
    │    title     │                              │ FK student_id│──┤
    │    content   │                              │ FK topic_id  │  │
    │    role      │                              │ FK question_id│─┘
    │    created_at│                              │    status    │
    └──────┬───────┘                              │    started_at│
           │                                      │    ended_at  │
           │ N:M                                  └──────┬───────┘
           ▼                                             │
    ┌──────────────┐                                    │ 1:N
    │question_tags │                                    ▼
    │──────────────│                            ┌──────────────┐
    │FK question_id│                            │   messages   │
    │FK tag_id     │                            │──────────────│
    └──────┬───────┘                            │ PK id        │
           │                                    │ FK pair_id   │
           │ N:1                                │ FK sender_id │
           ▼                                    │    content   │
    ┌──────────────┐                            └──────────────┘
    │     tags     │
    │──────────────│
    │ PK id        │
    │    name      │
    │    category  │
    └──────────────┘

    ┌──────────────┐         ┌─────────────────────┐
    │    topics    │◄────────│user_topic_preferences│
    │──────────────│  N:1    │─────────────────────│
    │ PK id        │         │ FK user_id          │
    │    name      │         │ FK topic_id         │
    │ FK parent_id │         │    type             │
    │    level     │         └─────────────────────┘
    └──────────────┘

    ┌──────────────┐         ┌─────────────────────────┐
    │    users     │◄────────│user_difficulty_preferences│
    │──────────────│  1:N    │─────────────────────────│
    │              │         │ FK user_id              │
    └──────────────┘         │ FK tag_id               │
                             └─────────────────────────┘

    ┌──────────────┐         ┌──────────────┐
    │    users     │◄────────│notifications │
    │──────────────│  1:N    │──────────────│
    │              │         │ PK id        │
    └──────────────┘         │ FK user_id   │
                             │    type      │
                             │    title     │
                             │    content   │
                             │    is_read   │
                             │    status    │
                             └──────────────┘
```

---

## 1. 主数据库结构（database.sql）

### 1.1 users 表（用户表）

**表名**: `users`

**功能**: 存储用户账号信息。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| username | VARCHAR(50) | UNIQUE NOT NULL | 用户名 |
| password | VARCHAR(255) | NOT NULL | 加密密码 |
| last_active | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 最后活跃时间 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**:
- `idx_users_username` ON (username)

---

### 1.2 tags 表（标签表）

**表名**: `tags`

**功能**: 存储标签信息，支持多种分类。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| name | VARCHAR(50) | UNIQUE NOT NULL | 标签名称 |
| category | VARCHAR(50) | NOT NULL DEFAULT 'default' | 标签分类 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**分类说明**:

| category | 说明 | 示例 |
|----------|------|------|
| subject | 学科 | 数学、英语、编程 |
| difficulty | 难度 | 简单、中等、偏难、极难 |
| progress | 进度 | 开始、中程、末尾 |

---

### 1.3 topics 表（知识点表）

**表名**: `topics`

**功能**: 存储学科知识点，支持层级结构。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| name | VARCHAR(100) | NOT NULL | 知识点名称 |
| parent_id | INTEGER | REFERENCES topics(id) | 父级知识点 |
| level | INTEGER | DEFAULT 1 | 层级（1为顶级） |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

---

### 1.4 questions 表（问题表）

**表名**: `questions`

**功能**: 存储用户发布的问题。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| title | VARCHAR(200) | NOT NULL | 问题标题 |
| content | TEXT | NOT NULL | 问题内容 |
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | 发布者 ID |
| role | VARCHAR(20) | DEFAULT 'student' | 角色（student/teacher） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**触发器**:
- `update_questions_updated_at`: 更新时自动更新 `updated_at`

---

### 1.5 question_tags 表（问题-标签关联表）

**表名**: `question_tags`

**功能**: 多对多关联问题和标签。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| question_id | INTEGER | REFERENCES questions(id) ON DELETE CASCADE | 问题 ID |
| tag_id | INTEGER | REFERENCES tags(id) ON DELETE CASCADE | 标签 ID |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**主键**: (question_id, tag_id)

---

### 1.6 pairs 表（结对表）

**表名**: `pairs`

**功能**: 存储结对学习关系。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| teacher_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | 教师用户 ID |
| student_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | 学生用户 ID |
| topic_id | INTEGER | REFERENCES topics(id) ON DELETE CASCADE | 学科 ID |
| question_id | INTEGER | REFERENCES questions(id) ON DELETE CASCADE | 关联问题 ID |
| status | VARCHAR(20) | DEFAULT 'pending' | 结对状态 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| started_at | TIMESTAMP | | 开始时间 |
| ended_at | TIMESTAMP | | 结束时间 |
| end_requested_by | INTEGER | REFERENCES users(id) | 结束请求发起者 |
| end_request_status | VARCHAR(20) | | 结束请求状态 |
| end_requested_at | TIMESTAMP | | 结束请求时间 |

**状态说明**:

| status | 说明 |
|--------|------|
| pending | 等待接受 |
| active | 进行中 |
| completed | 已结束 |
| end_requested | 请求结束中 |

---

### 1.7 messages 表（消息表）

**表名**: `messages`

**功能**: 存储结对聊天消息。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| pair_id | INTEGER | REFERENCES pairs(id) ON DELETE CASCADE | 结对 ID |
| sender_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | 发送者 ID |
| content | TEXT | | 消息内容 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

---

## 2. 迁移脚本

### 2.1 migrate_user_profiles.sql

**功能**: 添加用户资料和学科偏好系统。

**新增表**:

#### user_profiles 表

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| user_id | INTEGER | UNIQUE REFERENCES users(id) ON DELETE CASCADE | 用户 ID（1:1） |
| nickname | VARCHAR(50) | | 昵称 |
| bio | TEXT | | 个人简介 |
| avatar_url | VARCHAR(500) | | 头像 URL |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### user_topic_preferences 表

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | 用户 ID |
| topic_id | INTEGER | REFERENCES topics(id) ON DELETE CASCADE | 学科 ID |
| type | VARCHAR(20) | NOT NULL DEFAULT 'interested' | 偏好类型 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**主键**: (user_id, topic_id, type)

**type 取值**:
- `interested`: 感兴趣（想学）
- `proficient`: 擅长（能教）

---

### 2.2 migrate_preferences_refine.sql

**功能**: 细化偏好设置，添加难度偏好。

**新增表**:

#### user_difficulty_preferences 表

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | 用户 ID |
| tag_id | INTEGER | REFERENCES tags(id) ON DELETE CASCADE | 难度标签 ID |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**主键**: (user_id, tag_id)

---

### 2.3 migrate_notifications.sql

**功能**: 添加通知系统。

**新增表**:

#### notifications 表

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | 接收者 ID |
| type | VARCHAR(50) | NOT NULL | 通知类型 |
| related_id | INTEGER | | 关联实体 ID |
| title | VARCHAR(200) | NOT NULL | 标题 |
| content | TEXT | | 内容 |
| is_read | BOOLEAN | DEFAULT FALSE | 是否已读 |
| status | VARCHAR(20) | DEFAULT 'pending' | 处理状态 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**通知类型**:
- `pair_application`: 结对申请
- `pair_accepted`: 结对接受
- `pair_rejected`: 结对拒绝
- `end_request`: 结束请求

---

### 2.4 migrate_online_status.sql

**功能**: 添加用户在线状态追踪。

**修改 users 表**:

新增列:
- `last_active` TIMESTAMP - 最后活跃时间

**新增索引**:
- `idx_users_last_active` ON (last_active)

---

# 附录

## A. 完整 API 端点列表

### 用户相关 API

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| POST | /api/register | 否 | 用户注册 |
| POST | /api/login | 否 | 用户登录 |
| POST | /api/verify-token | 否 | Token 验证 |
| PATCH | /api/users/:userId/change-password | 是 | 修改密码 |
| GET | /api/users/available | 是 | 获取可匹配用户 |
| GET | /api/users/me/profile | 是 | 获取个人资料 |
| PATCH | /api/users/me/profile | 是 | 更新个人资料 |
| GET | /api/users/:userId/profile | 否 | 获取用户公开资料 |
| POST | /api/users/heartbeat | 是 | 更新心跳 |
| GET | /api/topics | 否 | 获取学科列表 |
| GET | /api/tags/difficulty | 否 | 获取难度标签 |

### 问题相关 API

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| GET | /api/questions | 否 | 获取问题列表 |
| GET | /api/questions/:questionId | 否 | 获取问题详情 |
| POST | /api/questions | 是 | 创建问题 |
| DELETE | /api/questions/:questionId | 是 | 删除问题 |
| GET | /api/questions/user/:userId | 否 | 获取用户问题 |
| GET | /api/questions/my-questions | 是 | 获取我的问题 |
| GET | /api/questions/my-history | 是 | 获取教学历史 |
| GET/POST | /api/questions/search | 否 | 多标签搜索 |
| GET | /api/tags | 否 | 获取所有标签 |
| GET | /api/tags/grouped | 否 | 按分类获取标签 |
| GET | /api/tags/:tagId/questions | 否 | 按标签获取问题 |

### 结对聊天相关 API

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| POST | /api/pairs/apply | 是 | 申请结对 |
| POST | /api/pairs/accept | 是 | 接受结对 |
| POST | /api/pairs/:pairId/reject | 是 | 拒绝结对 |
| GET | /api/pairs | 是 | 获取我的结对列表 |
| GET | /api/pairs/:pairId | 是 | 获取结对详情 |
| GET | /api/pairs/question/:questionId | 是 | 按问题获取结对 |
| POST | /api/pairs/:pairId/associate | 是 | 关联结对与问题 |
| GET | /api/chats/:pairId | 是 | 获取聊天记录 |
| POST | /api/chats/:pairId | 是 | 发送消息 |
| POST | /api/chats/:pairId/end | 是 | 直接结束教学 |
| POST | /api/chats/:pairId/request-end | 是 | 请求结束教学 |
| POST | /api/chats/:pairId/accept-end | 是 | 接受结束请求 |
| POST | /api/chats/:pairId/reject-end | 是 | 拒绝结束请求 |
| GET | /api/chats/:pairId/time | 是 | 获取教学时长 |
| GET | /api/chats/pending-requests | 是 | 获取待处理请求 |

### 通知相关 API

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| GET | /api/notifications | 是 | 获取通知列表 |
| GET | /api/notifications/pending | 是 | 获取待处理通知 |
| GET | /api/notifications/unread-count | 是 | 获取未读数量 |
| PATCH | /api/notifications/:notificationId/read | 是 | 标记已读 |

---

## B. 数据库索引列表

| 索引名 | 表 | 列 | 说明 |
|--------|-----|-----|------|
| idx_users_username | users | username | 用户名查询优化 |
| idx_users_last_active | users | last_active | 在线状态查询 |
| idx_tags_name | tags | name | 标签名查询 |
| idx_tags_category | tags | category | 标签分类查询 |
| idx_questions_user_id | questions | user_id | 用户问题查询 |
| idx_questions_created_at | questions | created_at DESC | 问题排序 |
| idx_question_tags_question_id | question_tags | question_id | 问题标签关联 |
| idx_question_tags_tag_id | question_tags | tag_id | 标签问题关联 |
| idx_pairs_teacher | pairs | teacher_id | 教师结对查询 |
| idx_pairs_student | pairs | student_id | 学生结对查询 |
| idx_pairs_status | pairs | status | 结对状态查询 |
| idx_pairs_question_id | pairs | question_id | 问题结对查询 |
| idx_messages_pair | messages | pair_id | 对话消息查询 |
| idx_messages_sender | messages | sender_id | 发送者消息查询 |
| idx_messages_created_at | messages | created_at | 消息排序 |
| idx_notifications_user_id | notifications | user_id | 用户通知查询 |
| idx_notifications_type | notifications | type | 通知类型查询 |
| idx_notifications_status | notifications | status | 通知状态查询 |
| idx_notifications_is_read | notifications | is_read | 未读通知查询 |
| idx_user_profiles_user_id | user_profiles | user_id | 用户资料查询 |
| idx_user_topic_preferences_user_id | user_topic_preferences | user_id | 用户偏好查询 |
| idx_user_difficulty_preferences_user_id | user_difficulty_preferences | user_id | 难度偏好查询 |

---

## C. 环境配置说明

### 后端环境变量（backend/config/.env）

```env
# 数据库配置
DB_HOST=localhost
DB_USER=your_username
DB_NAME=tutome
DB_PASSWORD=your_password
DB_PORT=5432

# JWT 配置
JWT_SECRET_KEY=your_secret_key_here

# 服务器配置
PORT=3000
```

### 前端环境变量（frontend/.env）

```env
VITE_API_URL=http://localhost:3000
```

### 启动步骤

1. **安装依赖**:
```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

2. **创建数据库**:
```bash
# 连接 PostgreSQL
psql -U your_username

# 创建数据库
CREATE DATABASE tutome;

# 执行数据库脚本
\c tutome
\i database.sql
\i migrate_user_profiles.sql
\i migrate_preferences_refine.sql
\i migrate_notifications.sql
\i migrate_online_status.sql
\i migrate.sql
```

3. **配置环境变量**:
```bash
# 创建后端配置文件
cd backend
mkdir config
touch config/.env
# 编辑 .env 文件，填入配置
```

4. **启动服务**:
```bash
# 启动后端
cd backend
npm start

# 启动前端开发服务器
cd frontend
npm run dev
```

5. **访问应用**:
- 前端: http://localhost:5173
- 后端 API: http://localhost:3000

---

## D. 开发指南

### 代码风格约定

1. **命名规范**:
   - 组件：PascalCase（如 `UserProfile`）
   - 函数/变量：camelCase（如 `getUserProfile`）
   - 常量：UPPER_SNAKE_CASE（如 `API_BASE_URL`）
   - 文件：kebab-case 或与组件同名

2. **目录结构**:
   - 按功能模块组织代码
   - 相关文件就近放置（如 `.jsx` 和 `.css`）

3. **注释规范**:
   - 复杂逻辑添加注释说明
   - 公共函数添加 JSDoc 注释

### Git 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

---

*文档结束*
