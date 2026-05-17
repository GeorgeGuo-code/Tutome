-- 添加 sender_role 字段用于标识消息发送者角色
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_role VARCHAR(20) DEFAULT NULL;