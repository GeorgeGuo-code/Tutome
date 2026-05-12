-- 优化 conversation_summaries 表结构
-- 添加问题汇总和相关学习链接字段

-- 添加新字段
ALTER TABLE conversation_summaries
ADD COLUMN IF NOT EXISTS problem_count INTEGER DEFAULT 0;

ALTER TABLE conversation_summaries
ADD COLUMN IF NOT EXISTS problem_summary JSONB DEFAULT '[]';

ALTER TABLE conversation_summaries
ADD COLUMN IF NOT EXISTS related_links JSONB DEFAULT '[]';
