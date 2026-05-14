-- 为 post_responses 表添加 pair_id 字段，便于直接通过 pair_id 关联查询问卷回答

ALTER TABLE post_responses ADD COLUMN IF NOT EXISTS pair_id INT REFERENCES pairs(id);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_post_responses_pair ON post_responses(pair_id);