const express = require('express');
const router = express.Router();
const multer = require('multer');
const chatsController = require('../controllers/chatsController');
const { verifyJWT } = require('../middlewares/usersMiddleware');
const queries = require('../models/queries');

// 配置 multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// 先检查 verifyJWT 是否存在
console.log('verifyJWT 类型:', typeof verifyJWT);

// 确保 verifyJWT 是函数再使用
if (typeof verifyJWT === 'function') {
  router.use(verifyJWT);  // 所有聊天路由需要登录
} else {
  console.error('verifyJWT 不是函数!');
}

// 结对相关
router.post('/api/pairs/apply', chatsController.applyPair);
router.post('/api/pairs/:pairId/accept', chatsController.acceptPair);
router.post('/api/pairs/:pairId/reject', chatsController.rejectPair);
router.get('/api/pairs', chatsController.getMyPairs);
router.get('/api/pairs/:pairId', chatsController.getPairById);

// 获取问题的结对
router.get('/api/pairs/question/:questionId', chatsController.getPairByQuestionId);

// 自动关联结对到问题
router.post('/api/pairs/:pairId/associate', verifyJWT, chatsController.associatePairWithQuestion);

// 通知相关
router.get('/api/notifications/pending', chatsController.getPendingNotifications);
router.get('/api/notifications', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status, isRead, limit = 50, offset = 0 } = req.query;
        const notifications = await queries.notification.getByUserId(userId, {
            status,
            isRead: isRead === 'true' ? true : (isRead === 'false' ? false : undefined),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ error: '获取通知失败' });
    }
});
router.patch('/api/notifications/:notificationId/read', async (req, res) => {
    try {
        const { notificationId } = req.params;
        const notification = await queries.notification.markAsRead(notificationId);
        res.json({ success: true, notification });
    } catch (err) {
        res.status(500).json({ error: '操作失败' });
    }
});
router.get('/api/notifications/unread-count', async (req, res) => {
    try {
        const userId = req.user.userId;
        const count = await queries.notification.getUnreadCount(userId);
        res.json({ success: true, count });
    } catch (err) {
        res.status(500).json({ error: '获取失败' });
    }
});

// 聊天相关
router.get('/api/chats/pending-requests', chatsController.getPendingEndRequests);
router.get('/api/chats/:pairId', chatsController.getMessages);
router.post('/api/chats/:pairId', chatsController.sendMessage);
router.post('/api/chats/:pairId/image', upload.single('image'), chatsController.uploadImageMessage);
router.post('/api/chats/:pairId/end', chatsController.endTeaching);
router.post('/api/chats/:pairId/request-end', chatsController.requestEndTeaching);
router.post('/api/chats/:pairId/accept-end', chatsController.acceptEndRequest);
router.post('/api/chats/:pairId/reject-end', chatsController.rejectEndRequest);
router.get('/api/chats/:pairId/time', chatsController.getTeachingTime);

// 私信相关
router.post('/api/private-messages', upload.single('image'), chatsController.sendPrivateMessage);
router.get('/api/private-messages', chatsController.getPrivateMessages);
router.get('/api/private-messages/conversation/:otherUserId', chatsController.getPrivateConversation);
router.get('/api/users/nickname/:nickname', chatsController.findUserByNicknameController);

module.exports = router;