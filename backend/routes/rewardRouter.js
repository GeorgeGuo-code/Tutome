const { verifyJWT } = require('../middlewares/usersMiddleware');
const { Router } = require('express');
const rewardRouter = Router();
const rewardController = require('../controllers/rewardController');

require('dotenv').config({ path: './config/.env' });

// 获取用户抽奖信息（需要登录）
rewardRouter.get('/api/reward/info', verifyJWT, rewardController.getRewardInfo);

// 抽取奖励（需要登录）
rewardRouter.post('/api/reward/draw', verifyJWT, rewardController.drawReward);

// 记录抽取结果（需要登录）
rewardRouter.post('/api/reward/record', verifyJWT, rewardController.recordReward);

// 兑换奖励（需要登录）
rewardRouter.post('/api/reward/exchange', verifyJWT, rewardController.exchangeReward);

// 获取兑换记录列表（需要登录）
rewardRouter.get('/api/reward/exchanges', verifyJWT, rewardController.getExchangeRecords);

// 更新兑换记录（需要登录）
rewardRouter.put('/api/reward/exchange/:id', verifyJWT, rewardController.updateExchangeRecord);

// 获取用户抽奖统计（需要登录）
rewardRouter.get('/api/reward/stats', verifyJWT, rewardController.getDrawStats);

module.exports = rewardRouter;
