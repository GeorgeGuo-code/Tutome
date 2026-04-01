-- 删除 conversation_summaries 表中无用的字段
-- 执行时间：2026-03-30

ALTER TABLE conversation_summaries DROP COLUMN IF EXISTS requested_by;
ALTER TABLE conversation_summaries DROP COLUMN IF EXISTS confidence_level;
