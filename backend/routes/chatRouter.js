const express = require('express');
const router = express.Router();
const chatsController = require('../controllers/chatsController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate); // 所有聊天路由需要登录

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