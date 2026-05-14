-- 奖励系统表

-- 用户抽奖券表
CREATE TABLE IF NOT EXISTS reward_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tickets INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户奖励抽取记录表
CREATE TABLE IF NOT EXISTS reward_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id INTEGER NOT NULL,
    reward_name VARCHAR(100) NOT NULL,
    reward_icon VARCHAR(50) NOT NULL,
    reward_rarity VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 为reward_tickets创建初始数据（所有现有用户获得0张券）
INSERT INTO reward_tickets (user_id, tickets)
SELECT id, 0 FROM users
WHERE NOT EXISTS (SELECT 1 FROM reward_tickets WHERE reward_tickets.user_id = users.id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_reward_records_user_id ON reward_records(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_tickets_user_id ON reward_tickets(user_id);
