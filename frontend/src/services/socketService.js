import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.heartbeatInterval = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * 连接到 Socket.IO 服务器
   * @param {string} token - JWT token
   */
  connect(token) {
    if (this.socket) {
      console.log('Socket 已连接，跳过重复连接');
      return;
    }

    try {
      this.socket = io({
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      this.setupEventListeners();
      this.startHeartbeat();
      console.log('Socket.IO 连接初始化成功');
    } catch (error) {
      console.error('Socket.IO 连接初始化失败:', error);
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      console.log('Socket.IO 连接成功，Socket ID:', this.socket.id);
      this.reconnectAttempts = 0;
      this.emit('connection-established', { socketId: this.socket.id });
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO 连接错误:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Socket.IO 重连失败，达到最大尝试次数');
        this.emit('connection-failed', { error: error.message });
      }
    });

    // 断开连接
    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO 断开连接，原因:', reason);
      this.stopHeartbeat();
      this.emit('disconnected', { reason });
    });

    // 重连成功
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket.IO 重连成功，尝试次数: ${attemptNumber}`);
      this.reconnectAttempts = 0;
      this.emit('reconnected', { attemptNumber });
    });

    // 用户上线
    this.socket.on('user-online', (data) => {
      console.log('用户上线:', data);
      this.emit('user-online', data);
    });

    // 用户下线
    this.socket.on('user-offline', (data) => {
      console.log('用户下线:', data);
      this.emit('user-offline', data);
    });

    // 在线用户列表更新
    this.socket.on('online-users', (data) => {
      console.log('在线用户列表更新:', data);
      this.emit('online-users', data);
    });

    // 通知事件
    this.socket.on('notification', (data) => {
      console.log('收到通知:', data);
      this.emit('notification', data);
    });

    // 认证错误
    this.socket.on('error', (error) => {
      console.error('Socket.IO 错误:', error);
      this.emit('error', { error: error.message });
    });
  }

  /**
   * 启动心跳
   */
  startHeartbeat() {
    this.stopHeartbeat(); // 确保没有重复的心跳定时器

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('heartbeat');
        console.log('发送心跳');
      }
    }, 30000); // 30秒

    console.log('心跳已启动，间隔: 30秒');
  }

  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('心跳已停止');
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
      console.log('Socket.IO 已断开连接');
    }
  }

  /**
   * 发送事件
   * @param {string} event - 事件名称
   * @param {any} data - 事件数据
   */
  emit(event, data) {
    // 触发所有监听该事件的回调
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  /**
   * 监听事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 移除事件监听
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * 检查是否已连接
   * @returns {boolean}
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// 导出单例
export default new SocketService();