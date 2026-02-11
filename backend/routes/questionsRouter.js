const { Router } = require('express');
const { verifyJWT } = require('../middlewares/usersMiddleware');
const questionsController = require('../controllers/questionsController');
const questionsRouter = Router();

// 获取问题列表（支持按标签筛选）
questionsRouter.get('/api/questions', questionsController.getQuestions);

// 获取所有标签
questionsRouter.get('/api/tags', questionsController.getAvailableTags);

// 获取按分类分组的标签（更适合前端分类展示）
questionsRouter.get('/api/tags/grouped', questionsController.getTagsByCategory);

// 根据标签名搜索问题
questionsRouter.get('/api/tags/:tagId/questions', questionsController.getQuestionsByTagId);

// 创建问题（需要登录）
questionsRouter.post('/api/questions', verifyJWT, questionsController.createQuestion);

// 获取用户的问题（公开）
questionsRouter.get('/api/questions/user/:userId', questionsController.getUserQuestions);

// 获取当前用户的问题（需要登录）
questionsRouter.get('/api/questions/my-questions', verifyJWT, questionsController.getUserQuestions);

// 多标签搜索（支持GET和POST）
questionsRouter.get('/api/questions/search', questionsController.searchByMultipleTags);
questionsRouter.post('/api/questions/search', questionsController.searchByMultipleTags);

module.exports = questionsRouter;