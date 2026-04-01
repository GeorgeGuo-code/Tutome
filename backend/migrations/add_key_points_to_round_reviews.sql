-- 添加 key_points 列到 round_reviews 表
-- 用于存储每轮对话的核心知识点

-- 添加 key_points 列（JSONB 类型）
ALTER TABLE round_reviews
ADD COLUMN IF NOT EXISTS key_points jsonb DEFAULT '[]';

-- 添加注释
COMMENT ON COLUMN round_reviews.key_points IS '本轮对话的核心知识点数组，用于最终总结生成';

-- 验证
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'round_reviews' AND column_name = 'key_points';
