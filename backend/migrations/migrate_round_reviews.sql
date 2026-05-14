-- 创建轮次审查结果表
-- 用于存储每轮对话的 AI 审查结果

-- 创建 round_reviews 表
CREATE TABLE IF NOT EXISTS round_reviews (
  id SERIAL PRIMARY KEY,

  -- 关联结对
  pair_id INTEGER NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,

  -- 轮次标识（格式：round_{message_id}）
  round_id VARCHAR(100) NOT NULL UNIQUE,

  -- 关联消息（用于追溯原始对话内容）
  round_student_message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  round_teacher_message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,

  -- 审查结果
  has_error BOOLEAN DEFAULT false,
  error_details JSONB,

  -- 审查元数据
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP DEFAULT NOW(),

  -- 创建和更新时间
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 添加索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_round_reviews_pair ON round_reviews(pair_id);
CREATE INDEX IF NOT EXISTS idx_round_reviews_round_id ON round_reviews(round_id);
CREATE INDEX IF NOT EXISTS idx_round_reviews_has_error ON round_reviews(has_error);
CREATE INDEX IF NOT EXISTS idx_round_reviews_reviewed_at ON round_reviews(reviewed_at DESC);

-- 注释
-- round_id: 轮次 ID，格式为 round_{message_id}，与轮次检测器生成的 ID 保持一致
-- has_error: 该轮次是否检测到错误
-- error_details: 错误详情数组，JSON 格式存储
-- reviewed_by: 触发审查的用户 ID（默认为学生）
-- reviewed_at: 审查完成时间

-- 更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_round_round_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 round_reviews 表添加更新时间戳触发器
DROP TRIGGER IF EXISTS round_reviews_updated_at_trigger ON round_reviews;
CREATE TRIGGER round_reviews_updated_at_trigger
BEFORE UPDATE ON round_reviews
FOR EACH ROW
EXECUTE FUNCTION update_round_round_reviews_updated_at();

-- 创建对话总结结果表
-- 用于存储整个对话的总结结果
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id SERIAL PRIMARY KEY,
  pair_id INTEGER NOT NULL UNIQUE REFERENCES pairs(id) ON DELETE CASCADE,

  -- 总结内容
  summary_text TEXT,  -- 教学场景整体描述
  highlights JSONB,  -- 亮点数组
  improvements JSONB,  -- 改进建议数组
  key_learnings JSONB,  -- 核心知识点数组
  overall_rating VARCHAR(20),  -- excellent|good|fair|needs_improvement

  -- 统计信息
  statistics JSONB,  -- { totalRounds, roundsWithError, errorCount, averageConfidence }
  confidence_level VARCHAR(10),  -- 高|中|低

  -- 元数据
  requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- 谁请求的总结
  generated_at TIMESTAMP DEFAULT NOW(),

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_pair ON conversation_summaries(pair_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_rating ON conversation_summaries(overall_rating);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_generated_at ON conversation_summaries(generated_at DESC);

-- 为 conversation_summaries 表添加更新时间戳触发器
DROP TRIGGER IF EXISTS conversation_summaries_updated_at_trigger ON conversation_summaries;
CREATE TRIGGER conversation_summaries_updated_at_trigger
BEFORE UPDATE ON conversation_summaries
FOR EACH ROW
EXECUTE FUNCTION update_round_round_reviews_updated_at();
