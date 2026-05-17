const { Router } = require('express');
const aiController = require('../controllers/aiController');
const { verifyJWT } = require('../middlewares/usersMiddleware');
const aiRouter = Router();

// 调用AI，判断对话中是否存在科学性错误
aiRouter.post('/api/ai/judge', verifyJWT, aiController.judgeConversation);

// 调用AI，生成对话总结
aiRouter.post('/api/ai/summary', verifyJWT, aiController.summarizeConversation);

// 轮次即时审查：审查单个轮次
aiRouter.get('/api/ai/rounds/:pairId', verifyJWT, aiController.getRoundReviews);

// 轮次即时审查：审查指定轮次
aiRouter.post('/api/ai/round/:roundId', verifyJWT, aiController.reviewRound);

// 获取对话总结
aiRouter.get('/api/ai/summary/:pairId', verifyJWT, aiController.getConversationSummary);

// AI学生追问
aiRouter.post('/api/ai/student-ask', verifyJWT, aiController.studentAsk);

module.exports = aiRouter;