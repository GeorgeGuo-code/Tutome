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
router.post('/pairs/apply', chatsController.applyPair);
router.post('/pairs/accept', chatsController.acceptPair);
router.get('/pairs', chatsController.getMyPairs);

// 聊天相关
router.get('/chats/:pairId', chatsController.getMessages);
router.post('/chats/:pairId', chatsController.sendMessage);
router.post('/chats/:pairId/end', chatsController.endTeaching);
router.get('/chats/:pairId/time', chatsController.getTeachingTime);

module.exports = router;