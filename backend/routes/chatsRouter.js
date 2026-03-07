const express = require('express');
const router = express.Router();
const chatsController = require('../controllers/chatsController');
const { verifyJWT } = require('../middlewares/usersMiddleware');

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
router.post('/api/pairs/accept', chatsController.acceptPair);
router.get('/api/pairs', chatsController.getMyPairs);
router.get('/api/pairs/:pairId', chatsController.getPairById);

// 获取问题的结对
router.get('/api/pairs/question/:questionId', chatsController.getPairByQuestionId);

// 自动关联结对到问题
router.post('/api/pairs/:pairId/associate', verifyJWT, chatsController.associatePairWithQuestion);

// 聊天相关
router.get('/api/chats/pending-requests', chatsController.getPendingEndRequests);
router.get('/api/chats/:pairId', chatsController.getMessages);
router.post('/api/chats/:pairId', chatsController.sendMessage);
router.post('/api/chats/:pairId/end', chatsController.endTeaching);
router.post('/api/chats/:pairId/request-end', chatsController.requestEndTeaching);
router.post('/api/chats/:pairId/accept-end', chatsController.acceptEndRequest);
router.post('/api/chats/:pairId/reject-end', chatsController.rejectEndRequest);
router.get('/api/chats/:pairId/time', chatsController.getTeachingTime);

module.exports = router;