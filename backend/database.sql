-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建知识点表（在 pairs 表之前创建）
CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES topics(id),
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建问题表
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建问题标签关联表（多对多）
CREATE TABLE IF NOT EXISTS question_tags (
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (question_id, tag_id)
);

-- 创建结对表
CREATE TABLE IF NOT EXISTS pairs (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed, end_requested
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    end_requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    end_request_status VARCHAR(20), -- pending, accepted, rejected
    end_requested_at TIMESTAMP
);

-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    pair_id INTEGER REFERENCES pairs(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_question_tags_question_id ON question_tags(question_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag_id ON question_tags(tag_id);

-- 为聊天功能添加索引
CREATE INDEX IF NOT EXISTS idx_pairs_teacher ON pairs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_pairs_student ON pairs(student_id);
CREATE INDEX IF NOT EXISTS idx_pairs_status ON pairs(status);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(pair_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入标签数据
INSERT INTO tags (name, category) VALUES
('数学', 'subject'),
('英语', 'subject'),
('编程语言', 'subject'),
('物理', 'subject'),
('简单', 'difficulty'),
('中等', 'difficulty'),
('偏难', 'difficulty'),
('极难', 'difficulty'),
('开始', 'progress'),
('中程', 'progress'),
('末尾', 'progress')
ON CONFLICT (name) DO NOTHING;

-- 插入知识点数据（用于结对）
INSERT INTO topics (name, level) VALUES 
('数学', 1),
('英语', 1),
('编程', 1),
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

-- 为 pairs.question_id 添加索引
CREATE INDEX IF NOT EXISTS idx_pairs_question_id ON pairs(question_id);
