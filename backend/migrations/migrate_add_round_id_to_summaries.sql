-- 添加 round_id 列到 conversation_summaries 表
-- 当 round_id 为 NULL 时为总总结，不为 NULL 时为子总结
ALTER TABLE conversation_summaries ADD COLUMN IF NOT EXISTS round_id VARCHAR(100);

-- 删除原有的 pair_id UNIQUE 约束
-- 注意：如果约束名不同，可能需要手动调整
ALTER TABLE conversation_summaries DROP CONSTRAINT IF EXISTS conversation_summaries_pair_id_key;

-- 确保每个 pair_id 只有一条总总结（round_id IS NULL）
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_summaries_pair_unique
  ON conversation_summaries (pair_id)
  WHERE round_id IS NULL;

-- 确保每对 (pair_id, round_id) 只有一条子总结
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_summaries_pair_round_unique
  ON conversation_summaries (pair_id, round_id)
  WHERE round_id IS NOT NULL;

-- 添加普通索引加速查询
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_round ON conversation_summaries(round_id);
