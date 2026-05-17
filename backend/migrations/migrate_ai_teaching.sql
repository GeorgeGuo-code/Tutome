-- AI教学模式迁移
-- 为 pairs 表添加 is_ai_teaching 字段

ALTER TABLE pairs ADD COLUMN IF NOT EXISTS is_ai_teaching BOOLEAN DEFAULT FALSE;
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS initial_question TEXT;

-- 添加注释
COMMENT ON COLUMN pairs.is_ai_teaching IS '是否为AI教学模式';
COMMENT ON COLUMN pairs.initial_question IS 'AI教学的初始问题';