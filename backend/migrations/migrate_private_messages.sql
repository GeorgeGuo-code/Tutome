-- 私信表迁移
CREATE TABLE IF NOT EXISTS private_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_different_users CHECK (sender_id != receiver_id)
);

-- 创建索引
CREATE INDEX idx_pm_sender ON private_messages(sender_id);
CREATE INDEX idx_pm_receiver ON private_messages(receiver_id);
CREATE INDEX idx_pm_created_at ON private_messages(created_at DESC);

-- 注释
COMMENT ON TABLE private_messages IS '私信表';
COMMENT ON COLUMN private_messages.sender_id IS '发送者用户ID';
COMMENT ON COLUMN private_messages.receiver_id IS '接收者用户ID';
COMMENT ON COLUMN private_messages.content IS '消息内容';
COMMENT ON COLUMN private_messages.image_url IS '图片URL（可选）';
COMMENT ON COLUMN private_messages.is_read IS '是否已读';