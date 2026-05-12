const queries = require('../models/queries');
const jwt = require('jsonwebtoken');
const RoundDetectorClass = require('./roundDetector');
const RoundDetector = new RoundDetectorClass();
const RoundReviewService = require('./roundReviewService');

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

      // 监听新消息事件（用于轮次即时审查）
      socket.on('new-message', async (data) => {
        try {
          // 1. 获取最新消息和结对信息
          const lastMessage = await queries.message.getLastByPairId(data.pairId);
          if (!lastMessage) return;

          const pair = await queries.pair.getById(data.pairId);
          if (!pair) return;

          console.log(`[轮次检测] 收到消息 ${lastMessage.id}，发送者: ${lastMessage.sender_id}`);

          // 2. 只在学生提问时才触发上一轮的审查
          if (RoundDetector.isRoundStart(lastMessage, pair)) {
            console.log(`[轮次检测] 学生提问，检查上一轮是否完成`);

            // 3. 获取所有消息和轮次
            const messages = await queries.message.getByPairId(data.pairId);
            if (!messages || messages.length < 3) return; // 至少需要2轮对话

            const rounds = RoundDetector.detectRounds(messages, pair);
            if (rounds.length < 2) return; // 至少有2轮才审查上一轮

            // 获取上一轮（倒数第二轮，因为最后一轮刚开始）
            const prevRound = rounds[rounds.length - 2];

            // 4. 异步审查上一轮（不阻塞聊天）
            if (prevRound && prevRound.complete && prevRound.id) {
              console.log(`[轮次审查] 开始审查轮次 ${prevRound.id}（异步）`);

              RoundReviewService.reviewRound(prevRound, pair)
                .then(result => {
                  console.log(`[轮次审查] 轮次 ${prevRound.id} 审查完成，发现错误: ${result.judgment?.hasError}`);

                  // 5. 通过 Socket.IO 推送审查结果给学生
                  io.to(`user:${pair.student_id}`).emit('round-review', {
                    roundId: prevRound.id,
                    judgment: result.judgment
                  });

                  // 6. 如果发现错误，通知老师
                  if (result.judgment && result.judgment.hasError) {
                    console.log(`[轮次审查] 发现 ${result.judgment.errorDetails.length} 个错误，通知老师`);
                    io.to(`user:${pair.teacher_id}`).emit('student-error-detected', {
                      roundId: prevRound.id,
                      errorCount: result.judgment.errorDetails.length,
                      summary: result.judgment.summary
                    });
                  }
                })
                .catch(error => {
                  console.error(`[轮次审查] 轮次 ${prevRound.id} 审查失败:`, error);

                  // 通知学生审查失败
                  io.to(`user:${pair.student_id}`).emit('round-review-error', {
                    roundId: prevRound.id,
                    error: error.message
                  });
                });
            }
          }
        } catch (error) {
          console.error('[轮次检测] 处理失败:', error);
        }
      });


    } catch (error) {
      console.error(`处理用户 ${userId} 连接失败:`, error);
      socket.disconnect();
    }
  });

  /**
   * 定期清理过期用户（每分钟）
   */
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

module.exports.getOnlineUsers = getOnlineUsers;
module.exports.isUserOnline = isUserOnline;
module.exports.sendNotificationToUser = sendNotificationToUser;
