-- 为questions表添加预生成热身题目模板字段
ALTER TABLE questions ADD COLUMN IF NOT EXISTS pre_questions_template JSONB DEFAULT NULL;