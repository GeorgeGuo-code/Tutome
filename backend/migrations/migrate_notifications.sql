-- ============================================
-- 通知系统迁移脚本
-- ============================================

-- 1. 创建 notifications 表
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'pair_application', 'pair_accepted', 'pair_rejected', 'end_request'
    related_id INTEGER, -- pair_id 或其他相关ID
    title VARCHAR(200) NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processed', 'archived'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 复合索引：用户 + 状态 + 创建时间（用于获取待处理通知）
CREATE INDEX IF NOT EXISTS idx_notifications_user_status_created ON notifications(user_id, status, created_at DESC);

-- 3. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- 4. 添加注释
COMMENT ON TABLE notifications IS '通用通知表，存储所有类型的通知';
COMMENT ON COLUMN notifications.type IS '通知类型：pair_application(结对申请), pair_accepted(结对接受), pair_rejected(结对拒绝), end_request(结束申请)';
COMMENT ON COLUMN notifications.related_id IS '关联ID，通常是 pair_id';
COMMENT ON COLUMN notifications.status IS '通知状态：pending(待处理), processed(已处理), archived(已归档)';