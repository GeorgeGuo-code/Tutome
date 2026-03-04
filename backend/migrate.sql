-- 扩展 topics 表，添加所有学科的 topic
INSERT INTO topics (name, level) VALUES
('物理', 1),
('化学', 1),
('生物', 1),
('经管/社科', 1),
('电子与工程', 1),
('科研', 1),
('其他', 1)
ON CONFLICT DO NOTHING;

-- 添加 question_id 字段到 pairs 表
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE;

-- 添加 role 字段到 questions 表
ALTER TABLE questions ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student';

-- 添加结束请求相关字段到 pairs 表
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS end_requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS end_request_status VARCHAR(20);
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS end_requested_at TIMESTAMP;

-- 为 pairs.question_id 添加索引
CREATE INDEX IF NOT EXISTS idx_pairs_question_id ON pairs(question_id);