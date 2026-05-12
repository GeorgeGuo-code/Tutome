const pool = require('../models/pool');

// 奖池配置（服务端使用，与前端保持一致）
const rewardsPool = [
  { id: 1, name: '国誉文具礼盒', icon: '🎁', rarity: 'sss', probability: 1 },
  { id: 2, name: '精品笔记本', icon: '📓', rarity: 'ss', probability: 4 },
  { id: 3, name: '一元红包', icon: '🧧', rarity: 's', probability: 20 },
  { id: 4, name: '小零食', icon: '🍪', rarity: 'a', probability: 25 },
  { id: 5, name: '谢谢参与', icon: '😢', rarity: 'none', probability: 50 },
];

// 获取用户抽奖信息
async function getRewardInfo(req, res) {
  try {
    const userId = req.user.userId;

    // 获取抽奖券数量（如果没有记录则自动创建）
    let ticketResult = await pool.query(
      'SELECT tickets FROM reward_tickets WHERE user_id = $1',
      [userId]
    );

    if (ticketResult.rows.length === 0) {
      // 为用户创建初始记录
      await pool.query(
        'INSERT INTO reward_tickets (user_id, tickets) VALUES ($1, 9999)',
        [userId]
      );
      ticketResult = await pool.query(
        'SELECT tickets FROM reward_tickets WHERE user_id = $1',
        [userId]
      );
    }

    const tickets = ticketResult.rows[0].tickets;

    // 获取抽取记录统计（已抽取总数）
    const recordsResult = await pool.query(
      `SELECT reward_id, reward_name, reward_icon, reward_rarity, COUNT(*) as count
       FROM reward_records
       WHERE user_id = $1
       GROUP BY reward_id, reward_name, reward_icon, reward_rarity`,
      [userId]
    );

    // 获取已兑换记录统计
    const exchangedResult = await pool.query(
      `SELECT reward_id, COUNT(*) as count
       FROM reward_exchanges
       WHERE user_id = $1
       GROUP BY reward_id`,
      [userId]
    );

    // 构建已兑换统计对象
    const exchangedCounts = {};
    exchangedResult.rows.forEach(row => {
      exchangedCounts[row.reward_id] = parseInt(row.count);
    });

    // 构建已抽取统计对象（总数）
    const totalDrawn = {};
    recordsResult.rows.forEach(row => {
      totalDrawn[row.reward_id] = parseInt(row.count);
    });

    // 构建可兑换统计对象（剩余可兑换 = 总抽取 - 已兑换）
    const rewardStats = {};
    recordsResult.rows.forEach(row => {
      const total = parseInt(row.count);
      const exchanged = exchangedCounts[row.reward_id] || 0;
      rewardStats[row.reward_id] = Math.max(0, total - exchanged);
    });

    // 获取当前库存
    const stockResult = await pool.query('SELECT reward_id, stock FROM reward_stocks');
    const stockMap = {};
    stockResult.rows.forEach(row => {
      stockMap[row.reward_id] = row.stock;
    });

    res.json({
      tickets,
      totalDrawn,
      rewardStats,
      stockMap
    });
  } catch (error) {
    console.error('获取奖励信息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
}

// 抽取奖励
async function drawReward(req, res) {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { drawMode } = req.body; // 1 或 5

    if (![1, 5].includes(drawMode)) {
      return res.status(400).json({ success: false, message: '无效的抽取模式' });
    }

    const ticketsNeeded = drawMode;

    await client.query('BEGIN');

    // 获取用户抽奖券数量（带锁）
    let ticketResult = await client.query(
      'SELECT tickets FROM reward_tickets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    let currentTickets;

    if (ticketResult.rows.length === 0) {
      // 如果没有记录，先创建一条
      await client.query(
        'INSERT INTO reward_tickets (user_id, tickets) VALUES ($1, 9999)',
        [userId]
      );
      currentTickets = 9999;
    } else {
      currentTickets = ticketResult.rows[0].tickets;
    }

    // 检查券是否足够
    if (currentTickets < ticketsNeeded) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: '抽奖券不足' });
    }

    // 扣除抽奖券
    await client.query(
      `UPDATE reward_tickets SET tickets = tickets - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [ticketsNeeded, userId]
    );

    // 获取当前库存
    const stockResult = await client.query('SELECT reward_id, stock FROM reward_stocks');
    const stockMap = {};
    stockResult.rows.forEach(row => {
      stockMap[row.reward_id] = row.stock;
    });

    // 调整概率：库存为0的奖品概率归零，转移到一元红包
    let totalProbability = 0;
    const adjustedPool = rewardsPool.map(reward => {
      if ((reward.id === 1 || reward.id === 2) && (stockMap[reward.id] || 0) <= 0) {
        // 库存耗尽，概率设为0
        return { ...reward, probability: 0 };
      }
      return { ...reward };
    });

    // 计算有效总概率
    totalProbability = adjustedPool.reduce((sum, r) => sum + r.probability, 0);

    // 执行抽取
    const drawnRewards = [];
    for (let i = 0; i < drawMode; i++) {
      let random = Math.random() * totalProbability;
      let selectedReward = adjustedPool[adjustedPool.length - 1];

      for (const reward of adjustedPool) {
        if (reward.rarity === 'none') continue;
        random -= reward.probability;
        if (random <= 0) {
          selectedReward = reward;
          break;
        }
      }

      drawnRewards.push({
        rewardId: selectedReward.id,
        rewardName: selectedReward.name,
        rewardIcon: selectedReward.icon,
        rewardRarity: selectedReward.rarity
      });

      // 扣除库存（仅针对有库存限制的奖品）
      if (selectedReward.id === 1 || selectedReward.id === 2) {
        await client.query(
          `UPDATE reward_stocks SET stock = stock - 1, updated_at = CURRENT_TIMESTAMP WHERE reward_id = $1`,
          [selectedReward.id]
        );
      }
    }

    await client.query('COMMIT');

    // 返回成功
    res.json({
      tickets: currentTickets - ticketsNeeded,
      rewards: drawnRewards
    });
  } catch (error) {
    console.error('[drawReward] 错误:', error);
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // ignore
    }
    res.status(500).json({ message: '服务器错误' });
  } finally {
    client.release();
  }
}

// 记录抽取结果（抽取后调用）
async function recordReward(req, res) {
  try {
    const userId = req.user.userId;
    const { rewards } = req.body; // 数组，每项包含 rewardId, rewardName, rewardIcon, rewardRarity

    if (!Array.isArray(rewards)) {
      return res.status(400).json({ success: false, message: '无效的奖励数据' });
    }

    // 批量插入记录
    for (const reward of rewards) {
      if (!reward) continue;
      await pool.query(
        `INSERT INTO reward_records (user_id, reward_id, reward_name, reward_icon, reward_rarity)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, reward.rewardId, reward.rewardName, reward.rewardIcon, reward.rewardRarity]
      );
    }

    res.json({});
  } catch (error) {
    console.error('记录奖励错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
}

// 创建/更新兑换记录
async function exchangeReward(req, res) {
  try {
    const userId = req.user.userId;
    const { rewardId, rewardName, rewardIcon, rewardRarity, rewardType, wechatAccount, campus, dormitoryEmail } = req.body;

    if (!rewardId || !rewardName) {
      return res.status(400).json({ success: false, message: '无效的奖励信息' });
    }

    // 验证是否有可兑换的奖励
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM reward_records WHERE user_id = $1 AND reward_id = $2`,
      [userId, rewardId]
    );

    // 查询已兑换数量
    const exchangedResult = await pool.query(
      `SELECT COUNT(*) as count FROM reward_exchanges WHERE user_id = $1 AND reward_id = $2 AND status = 'completed'`,
      [userId, rewardId]
    );

    const available = parseInt(countResult.rows[0].count) - parseInt(exchangedResult.rows[0].count);
    if (available <= 0) {
      return res.status(400).json({ success: false, message: '没有可兑换的奖励' });
    }

    // 创建兑换记录
    const result = await pool.query(
      `INSERT INTO reward_exchanges (user_id, reward_id, reward_name, reward_icon, reward_rarity, reward_type, wechat_account, campus, dormitory_email, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING id, created_at`,
      [userId, rewardId, rewardName, rewardIcon, rewardRarity, rewardType, wechatAccount || null, campus || null, dormitoryEmail || null]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('兑换奖励错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
}

// 获取兑换记录列表
async function getExchangeRecords(req, res) {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT id, reward_id, reward_name, reward_icon, reward_rarity, reward_type,
              wechat_account, campus, dormitory_email, status, is_edited, created_at, updated_at
       FROM reward_exchanges
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('获取兑换记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
}

// 更新兑换记录（修改兑奖信息）
async function updateExchangeRecord(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { wechatAccount, campus, dormitoryEmail } = req.body;

    // 验证记录属于当前用户
    const checkResult = await pool.query(
      `SELECT id, is_edited FROM reward_exchanges WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '兑换记录不存在' });
    }

    if (checkResult.rows[0].is_edited) {
      return res.status(400).json({ success: false, message: '该记录已修改过，无法再次修改' });
    }

    // 更新记录并标记为已修改
    await pool.query(
      `UPDATE reward_exchanges
       SET wechat_account = COALESCE($1, wechat_account),
           campus = COALESCE($2, campus),
           dormitory_email = COALESCE($3, dormitory_email),
           is_edited = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5`,
      [wechatAccount, campus, dormitoryEmail, id, userId]
    );

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新兑换记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
}

module.exports = {
  getRewardInfo,
  drawReward,
  recordReward,
  exchangeReward,
  getExchangeRecords,
  updateExchangeRecord
};