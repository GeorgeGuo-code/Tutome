-- 用户在线状态字段
-- 添加 last_active 字段到 users 表，用于追踪用户最后活跃时间

-- 添加 last_active 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_active'
    ) THEN
        ALTER TABLE users ADD COLUMN last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- 创建触发器自动更新 last_active 时间
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 users 表创建触发器（当用户登录或进行其他活动时更新）
-- 注意：这个触发器会在每次 UPDATE 时更新 last_active
DROP TRIGGER IF EXISTS update_users_last_active ON users;
CREATE TRIGGER update_users_last_active
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_last_active();

-- 初始化现有用户的 last_active 时间
UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE last_active IS NULL;