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
        'INSERT INTO reward_tickets (user_id, tickets) VALUES ($1, 0)',
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

    // 获取已兑换记录统计（累加 exchange_count，只统计已完成的）
    const exchangedResult = await pool.query(
      `SELECT reward_id, COALESCE(SUM(exchange_count), 0) as count
       FROM reward_exchanges
       WHERE user_id = $1 AND status = 'completed'
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

// 获取用户抽奖统计
async function getDrawStats(req, res) {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT total_draws, red_pocket_pity, notebook_pity, notebook_pity_used FROM reward_draw_stats WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ total_draws: 0, red_pocket_pity: 0, notebook_pity: 0, notebook_pity_used: false });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('获取抽奖统计错误:', error);
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
      // 如果没有记录，先创建一条（初始为0）
      await client.query(
        'INSERT INTO reward_tickets (user_id, tickets) VALUES ($1, 0)',
        [userId]
      );
      currentTickets = 0;
    } else {
      currentTickets = ticketResult.rows[0].tickets;
    }

    // 检查券是否足够
    if (currentTickets < ticketsNeeded) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `抽奖券不足，当前拥有 ${currentTickets} 张，需要 ${ticketsNeeded} 张` });
    }

    // 扣除抽奖券
    await client.query(
      `UPDATE reward_tickets SET tickets = tickets - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [ticketsNeeded, userId]
    );

    // 获取用户保底统计数据（带锁）
    let statsResult = await client.query(
      'SELECT total_draws, red_pocket_pity, notebook_pity, notebook_pity_used FROM reward_draw_stats WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    let stats = statsResult.rows[0] || { total_draws: 0, red_pocket_pity: 0, notebook_pity: 0, notebook_pity_used: false };
    if (!statsResult.rows.length) {
      // 创建统计记录
      await client.query(
        'INSERT INTO reward_draw_stats (user_id, total_draws, red_pocket_pity, notebook_pity, notebook_pity_used) VALUES ($1, 0, 0, 0, FALSE)',
        [userId]
      );
      stats = { total_draws: 0, red_pocket_pity: 0, notebook_pity: 0, notebook_pity_used: false };
    }

    // 获取当前库存
    const stockResult = await client.query('SELECT reward_id, stock FROM reward_stocks');
    const stockMap = {};
    stockResult.rows.forEach(row => {
      stockMap[row.reward_id] = row.stock;
    });

    // 调整概率：库存为0的奖品概率归零
    // 国誉文具(id=1)和精品笔记本(id=2)耗尽后概率转为一元红包(id=3)
    // 一元红包(id=3)耗尽后概率转为小零食(id=4)
    let totalProbability = 0;
    const adjustedPool = rewardsPool.map(reward => {
      if (reward.rarity === 'none') return { ...reward, probability: 0 };
      if ((reward.id === 1 || reward.id === 2) && (stockMap[reward.id] || 0) <= 0) {
        return { ...reward, probability: 0 }; // 概率归零
      }
      if (reward.id === 3 && (stockMap[reward.id] || 0) <= 0) {
        return { ...reward, probability: 0 }; // 一元红包耗尽，概率归零
      }
      return { ...reward };
    });

    // 计算有效总概率
    totalProbability = adjustedPool.reduce((sum, r) => sum + r.probability, 0);

    // 执行抽取（考虑保底）
    const drawnRewards = [];
    for (let i = 0; i < drawMode; i++) {
      // 先执行普通抽取
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

      // 更新保底计数
      stats.total_draws++;
      stats.red_pocket_pity++;
      // 只有笔记本保底未用完时才增加计数
      if (!stats.notebook_pity_used) {
        stats.notebook_pity++;
      }

      // 判断是否触发保底（只在抽到非红包/非笔记本/非文具时触发替换）
      const isLowReward = selectedReward.id === 4 || selectedReward.id === 5; // 小零食或谢谢参与

      // 5次保底：红包（id=3）- 无限触发（库存为0时不触发）
      if (stats.red_pocket_pity >= 5 && isLowReward && (stockMap[3] || 0) > 0) {
        selectedReward = rewardsPool.find(r => r.id === 3); // 强制红包
        stats.red_pocket_pity = 0; // 重置保底计数
        console.log(`[drawReward] 保底触发：5次内必出红包`);
      } else if (stats.red_pocket_pity >= 5 && isLowReward && (stockMap[3] || 0) <= 0) {
        // 一元红包库存耗尽，跳过保底，让普通抽取处理
        stats.red_pocket_pity = 0; // 重置保底计数避免一直触发
      }

      // 10次保底：精品笔记本（id=2）- 只能触发1次
      if (stats.notebook_pity >= 10 && isLowReward && selectedReward.id !== 3 && !stats.notebook_pity_used) {
        // 库存为0时不允许触发保底，直接跳过
        const notebookStock = stockMap[2] || 0;
        if (notebookStock > 0) {
          selectedReward = rewardsPool.find(r => r.id === 2); // 强制笔记本
        } else if ((stockMap[3] || 0) > 0) {
          // 笔记本没库存，强制一元红包（保底依然用掉）
          selectedReward = rewardsPool.find(r => r.id === 3);
        } else {
          // 红包也没库存，强制小零食（保底依然用掉）
          selectedReward = rewardsPool.find(r => r.id === 4);
        }
        stats.notebook_pity = 0;
        stats.notebook_pity_used = true; // 标记笔记本保底已使用
        console.log(`[drawReward] 保底触发：10次内必出笔记本（笔记本保底已用完）`);
      }

      // 如果抽到红包/笔记本/文具，重置对应保底计数
      if (selectedReward.id === 3) stats.red_pocket_pity = 0;
      if (selectedReward.id === 2 || selectedReward.id === 1) stats.notebook_pity = 0;

      drawnRewards.push({
        rewardId: selectedReward.id,
        rewardName: selectedReward.name,
        rewardIcon: selectedReward.icon,
        rewardRarity: selectedReward.rarity
      });

      // 扣除库存（仅针对有库存限制的奖品，且库存大于0）
      if ((selectedReward.id === 1 || selectedReward.id === 2 || selectedReward.id === 3) && (stockMap[selectedReward.id] || 0) > 0) {
        await client.query(
          `UPDATE reward_stocks SET stock = stock - 1, updated_at = CURRENT_TIMESTAMP WHERE reward_id = $1`,
          [selectedReward.id]
        );
        stockMap[selectedReward.id]--; // 更新本地库存映射
      }
    }

    // 更新统计数据
    await client.query(
      `UPDATE reward_draw_stats
       SET total_draws = $1, red_pocket_pity = $2, notebook_pity = $3, notebook_pity_used = $4, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $5`,
      [stats.total_draws, stats.red_pocket_pity, stats.notebook_pity, stats.notebook_pity_used, userId]
    );

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
    const { rewardId, rewardName, rewardIcon, rewardRarity, rewardType, exchangeCount, area, address } = req.body;

    if (!rewardId || !rewardName) {
      return res.status(400).json({ success: false, message: '无效的奖励信息' });
    }

    // 验证是否有可兑换的奖励
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM reward_records WHERE user_id = $1 AND reward_id = $2`,
      [userId, rewardId]
    );

    // 查询已兑换数量（累加 exchange_count）
    const exchangedResult = await pool.query(
      `SELECT COALESCE(SUM(exchange_count), 0) as count FROM reward_exchanges WHERE user_id = $1 AND reward_id = $2 AND status = 'completed'`,
      [userId, rewardId]
    );

    const total = parseInt(countResult.rows[0].count);
    const exchanged = parseInt(exchangedResult.rows[0].count);
    const available = total - exchanged;

    // 红包必须一次性兑换全部
    const countToExchange = rewardType === 'wechat' ? available : (exchangeCount || 1);
    if (available <= 0) {
      return res.status(400).json({ success: false, message: '没有可兑换的奖励' });
    }
    if (countToExchange > available) {
      return res.status(400).json({ success: false, message: '兑换数量超过可用数量' });
    }

    // 创建兑换记录
    const result = await pool.query(
      `INSERT INTO reward_exchanges (user_id, reward_id, reward_name, reward_icon, reward_rarity, reward_type, exchange_count, area, address, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING id, created_at`,
      [userId, rewardId, rewardName, rewardIcon, rewardRarity, rewardType, countToExchange, area || null, address || null]
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
              exchange_count, area, address, status, is_edited, created_at, updated_at
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
    const { area, address } = req.body;

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
       SET area = COALESCE($1, area),
           address = COALESCE($2, address),
           is_edited = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4`,
      [area, address, id, userId]
    );

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新兑换记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
}

// 增加用户抽奖券（问卷提交奖励）
async function incrementTickets(userId, increment = 1) {
  const result = await pool.query(
    `INSERT INTO reward_tickets (user_id, tickets)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE
     SET tickets = reward_tickets.tickets + $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE reward_tickets.user_id = $1
     RETURNING tickets`,
    [userId, increment]
  );
  return result.rows[0]?.tickets;
}

module.exports = {
  getRewardInfo,
  drawReward,
  recordReward,
  exchangeReward,
  getExchangeRecords,
  updateExchangeRecord,
  getDrawStats,
  incrementTickets
};