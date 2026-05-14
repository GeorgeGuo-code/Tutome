-- 为 messages 表添加 image_url 字段
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_messages_image_url ON messages(image_url) WHERE image_url IS NOT NULL;