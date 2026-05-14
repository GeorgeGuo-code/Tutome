-- 兑换记录表增加字段
ALTER TABLE reward_exchanges ADD COLUMN IF NOT EXISTS area VARCHAR(50);
ALTER TABLE reward_exchanges ADD COLUMN IF NOT EXISTS address VARCHAR(200);
ALTER TABLE reward_exchanges ADD COLUMN IF NOT EXISTS exchange_count INTEGER DEFAULT 1;