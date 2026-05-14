require('dotenv').config({ path: './config/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('开始创建奖励系统表...');

    // 创建 reward_tickets 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS reward_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tickets INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ reward_tickets 表创建成功');

    // 创建 reward_records 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS reward_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_id INTEGER NOT NULL,
        reward_name VARCHAR(100) NOT NULL,
        reward_icon VARCHAR(50) NOT NULL,
        reward_rarity VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ reward_records 表创建成功');

    // 创建 reward_exchanges 表（已兑换奖励记录）
    await client.query(`
      CREATE TABLE IF NOT EXISTS reward_exchanges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_id INTEGER NOT NULL,
        reward_name VARCHAR(100) NOT NULL,
        reward_icon VARCHAR(50) NOT NULL,
        reward_rarity VARCHAR(20) NOT NULL,
        reward_type VARCHAR(20) NOT NULL,
        wechat_account VARCHAR(100),
        campus VARCHAR(100),
        dormitory_email VARCHAR(200),
        status VARCHAR(20) DEFAULT 'pending',
        is_edited BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ reward_exchanges 表创建成功');

    // 创建 reward_stocks 表（奖品库存）
    await client.query(`
      CREATE TABLE IF NOT EXISTS reward_stocks (
        reward_id INTEGER PRIMARY KEY,
        stock INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ reward_stocks 表创建成功');

    // 为现有用户创建初始数据
    const result = await client.query(`
      INSERT INTO reward_tickets (user_id, tickets)
      SELECT id, 0 FROM users
      WHERE NOT EXISTS (SELECT 1 FROM reward_tickets WHERE reward_tickets.user_id = users.id)
      RETURNING user_id, tickets
    `);
    console.log(`✓ 为 ${result.rowCount} 个现有用户创建了抽奖券数据`);

    // 创建索引
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reward_records_user_id ON reward_records(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reward_tickets_user_id ON reward_tickets(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reward_exchanges_user_id ON reward_exchanges(user_id)
    `);
    console.log('✓ 索引创建成功');

    // 初始化奖品库存
    const stockResult = await client.query(`
      INSERT INTO reward_stocks (reward_id, stock)
      VALUES (1, 3), (2, 5), (3, 100)
      ON CONFLICT (reward_id) DO NOTHING
      RETURNING reward_id, stock
    `);
    console.log(`✓ 奖品库存已初始化: ${stockResult.rows.map(r => `${r.reward_id}号=${r.stock}`).join(', ')}`);

    // 创建 reward_draw_stats 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS reward_draw_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_draws INTEGER NOT NULL DEFAULT 0,
        red_pocket_pity INTEGER NOT NULL DEFAULT 0,
        notebook_pity INTEGER NOT NULL DEFAULT 0,
        notebook_pity_used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ reward_draw_stats 表创建成功');

    // 为现有用户创建初始数据
    await client.query(`
      INSERT INTO reward_draw_stats (user_id, total_draws, red_pocket_pity, notebook_pity, notebook_pity_used)
      SELECT id, 0, 0, 0, FALSE FROM users
      WHERE NOT EXISTS (SELECT 1 FROM reward_draw_stats WHERE reward_draw_stats.user_id = users.id)
    `);
    console.log('✓ 为现有用户创建了统计数据');

    console.log('\n奖励系统表创建完成！');
  } catch (error) {
    console.error('创建表失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
