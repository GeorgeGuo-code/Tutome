-- 偏好细化：学科分「感兴趣」与「擅长」，新增「难度偏好」
-- 1. 为学科偏好表增加类型：interested（感兴趣学科）、proficient（擅长学科）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_topic_preferences' AND column_name = 'type'
  ) THEN
    ALTER TABLE user_topic_preferences ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'interested';
    ALTER TABLE user_topic_preferences DROP CONSTRAINT IF EXISTS user_topic_preferences_pkey;
    ALTER TABLE user_topic_preferences ADD PRIMARY KEY (user_id, topic_id, type);
    CREATE INDEX IF NOT EXISTS idx_user_topic_preferences_type ON user_topic_preferences(user_id, type);
  END IF;
END $$;

-- 2. 难度偏好表（多对多：用户 <-> 难度标签，使用 tags 中 category='difficulty' 的标签）
CREATE TABLE IF NOT EXISTS user_difficulty_preferences (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_user_difficulty_preferences_user_id ON user_difficulty_preferences(user_id);

-- 可选：约束 tag_id 仅允许 difficulty 分类（应用层校验亦可）
-- ALTER TABLE user_difficulty_preferences ADD CONSTRAINT chk_difficulty_tag
--   CHECK (tag_id IN (SELECT id FROM tags WHERE category = 'difficulty'));
