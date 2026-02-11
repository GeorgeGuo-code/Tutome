-- 创建用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建标签表
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建问题表
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建问题标签关联表（多对多）
CREATE TABLE question_tags (
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (question_id, tag_id)
);

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_questions_user_id ON questions(user_id);
CREATE INDEX idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_question_tags_question_id ON question_tags(question_id);
CREATE INDEX idx_question_tags_tag_id ON question_tags(tag_id);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- 插入测试数据
INSERT INTO users (username, password) VALUES 
('testuser', '$2a$10$N9qo8uLOickgx2ZMRZoMye1s5QjN7qR8aGc9sZJXY2J5K9Yb5KL2C');
