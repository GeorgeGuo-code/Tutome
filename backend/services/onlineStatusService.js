const queries = require('../models/queries');
const jwt = require('jsonwebtoken');

// 在线用户集合：Map<userId, { socketId, lastHeartbeat }>
const onlineUsers = new Map();

// Socket.IO 实例（用于推送通知）
let ioInstance = null;

// 心跳间隔（毫秒）
const HEARTBEAT_INTERVAL = 30000; // 30秒

// 超时时间（毫秒）
const TIMEOUT_DURATION = 120000; // 2分钟

/**
 * 初始化在线状态服务
 * @param {SocketIO.Server} io - Socket.IO 实例
 */
module.exports = function(io) {
  // 保存 io 实例
  ioInstance = io;

  // JWT 认证中间件
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('认证失败：缺少 token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('认证失败：无效的 token'));
    }
  });

  // 连接事件
  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`用户 ${userId} 连接成功，Socket ID: ${socket.id}`);

    try {
      // 加入用户专属房间（用于推送通知）
      socket.join(`user:${userId}`);

      // 更新数据库中的最后活跃时间
      await queries.user.updateLastActive(userId);

      // 添加到在线用户集合
      onlineUsers.set(userId, {
        socketId: socket.id,
        lastHeartbeat: Date.now()
      });

      // 广播用户上线
      io.emit('user-online', { userId, timestamp: new Date() });

      // 发送当前在线用户列表
      const onlineUserIds = Array.from(onlineUsers.keys());
      io.emit('online-users', { users: onlineUserIds });

      // 启动心跳检测定时器
      const heartbeatInterval = setInterval(() => {
        const user = onlineUsers.get(userId);
        if (!user) {
          clearInterval(heartbeatInterval);
          return;
        }

        // 检查是否超时
        if (Date.now() - user.lastHeartbeat > TIMEOUT_DURATION) {
          console.log(`用户 ${userId} 心跳超时，标记为离线`);
          onlineUsers.delete(userId);
          io.emit('user-offline', { userId, timestamp: new Date() });
          clearInterval(heartbeatInterval);
        }
      }, HEARTBEAT_INTERVAL);

      socket.on('heartbeat', async () => {
        try {
          // 更新最后心跳时间
          const user = onlineUsers.get(userId);
          if (user) {
            user.lastHeartbeat = Date.now();
          }

          // 更新数据库
          await queries.user.updateLastActive(userId);

          console.log(`用户 ${userId} 心跳更新`);
        } catch (error) {
          console.error(`更新用户 ${userId} 心跳失败:`, error);
        }
      });

      socket.on('disconnect', () => {
        console.log(`用户 ${userId} 断开连接，Socket ID: ${socket.id}`);

        // 从在线用户集合中移除
        onlineUsers.delete(userId);

        // 清除心跳定时器
        clearInterval(heartbeatInterval);

        // 广播用户下线
        io.emit('user-offline', { userId, timestamp: new Date() });
      });

      socket.on('error', (error) => {
        console.error(`Socket ${socket.id} 错误:`, error);
      });

    } catch (error) {
      console.error(`处理用户 ${userId} 连接失败:`, error);
      socket.disconnect();
    }
  });

  // 定期清理过期用户（每分钟）
  setInterval(() => {
    const now = Date.now();
    for (const [userId, user] of onlineUsers.entries()) {
      if (now - user.lastHeartbeat > TIMEOUT_DURATION) {
        console.log(`清理过期用户: ${userId}`);
        onlineUsers.delete(userId);
        io.emit('user-offline', { userId, timestamp: new Date() });
      }
    }
  }, 60000);
};

/**
 * 获取在线用户列表
 * @returns {Array} 在线用户 ID 数组
 */
function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

/**
 * 检查用户是否在线
 * @param {number} userId - 用户 ID
 * @returns {boolean} 是否在线
 */
function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

module.exports.getOnlineUsers = getOnlineUsers;
module.exports.isUserOnline = isUserOnline;

/**
 * 向特定用户推送通知
 * @param {number} userId - 接收通知的用户 ID
 * @param {Object} notification - 通知数据
 */
function sendNotificationToUser(userId, notification) {
  if (!ioInstance) {
    console.error('Socket.IO 实例未初始化');
    return;
  }

  // 向特定用户发送通知
  ioInstance.to(`user:${userId}`).emit('notification', notification);
  console.log(`已向用户 ${userId} 推送通知:`, notification.title);
}

module.exports.sendNotificationToUser = sendNotificationToUser;