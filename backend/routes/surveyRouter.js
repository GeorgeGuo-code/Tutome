const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middlewares/usersMiddleware');
const surveyController = require('../controllers/surveyController');

// 热身测试接口
// POST /api/survey/pre/respond - 提交热身回答（必须放在 /:pairId 前面）
router.post('/api/survey/pre/respond', verifyJWT, surveyController.submitPreResponse);

// GET /api/survey/pre/:pairId - 获取热身题目
router.get('/api/survey/pre/:pairId', verifyJWT, surveyController.getPreQuestions);

// POST /api/survey/pre/:pairId - 生成热身题目
router.post('/api/survey/pre/:pairId', verifyJWT, surveyController.generatePreQuestions);

// 对话后问卷接口
// POST /api/survey/post/respond - 提交问卷回答（必须放在 /:pairId 前面）
router.post('/api/survey/post/respond', verifyJWT, surveyController.submitPostResponse);

// GET /api/survey/post/:pairId - 获取问卷
router.get('/api/survey/post/:pairId', verifyJWT, surveyController.getPostSurvey);

// POST /api/survey/post/:pairId - 生成问卷
router.post('/api/survey/post/:pairId', verifyJWT, surveyController.generatePostSurvey);

// 进度接口
// GET /api/survey/progress/:pairId - 获取掌握度进度
router.get('/api/survey/progress/:pairId', verifyJWT, surveyController.getProgress);

module.exports = router;