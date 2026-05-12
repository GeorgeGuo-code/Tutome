-- 教学质量评估问卷系统迁移脚本

-- 预练习题目表（对话前热身测试）
CREATE TABLE IF NOT EXISTS pre_questions (
  id SERIAL PRIMARY KEY,
  pair_id INT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  question JSONB NOT NULL,  -- {question, options[], topic}
  correct_index INT NOT NULL,  -- 正确答案索引 (0-3)
  position INT NOT NULL,    -- 题目顺序 (1-5)
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pair_id, position)
);

-- 预练习回答表
CREATE TABLE IF NOT EXISTS pre_responses (
  id SERIAL PRIMARY KEY,
  pair_id INT NOT NULL,
  question_id INT NOT NULL REFERENCES pre_questions(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selected_index INT NOT NULL,  -- 用户选择的选项索引 (0-3)
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(question_id, user_id)  -- 每个用户每题只能回答一次
);

-- 对话后问卷表
CREATE TABLE IF NOT EXISTS post_surveys (
  id SERIAL PRIMARY KEY,
  pair_id INT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,  -- [{question, options[], correct_index, topic, difficulty, is_original}]
  fixed_components JSONB,     -- 固定评价组件定义
  status VARCHAR(20) DEFAULT 'pending',  -- pending/completed
  expires_at TIMESTAMP,       -- 7天后过期
  created_at TIMESTAMP DEFAULT NOW()
);

-- 对话后回答表
CREATE TABLE IF NOT EXISTS post_responses (
  id SERIAL PRIMARY KEY,
  survey_id INT NOT NULL REFERENCES post_surveys(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_role VARCHAR(20) NOT NULL,  -- teacher/student
  answers JSONB NOT NULL,   -- [{question_id, selected_index, is_correct, is_fixed}]
  score FLOAT,               -- 得分率 (0-1)
  ai_review_result JSONB,   -- AI批改反馈 {results, total_score, overall_comment}
  submitted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(survey_id, user_id)  -- 每个用户每份问卷只能提交一次
);

-- 掌握度进度表
CREATE TABLE IF NOT EXISTS mastery_progress (
  id SERIAL PRIMARY KEY,
  pair_id INT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  topic VARCHAR(100),
  pre_correct_rate FLOAT,    -- 热身正确率 (0-1)
  post_correct_rate FLOAT,   -- 问卷正确率 (0-1)
  pre_total INT,             -- 热身题目总数
  post_total INT,           -- 问卷题目总数
  progress FLOAT,            -- 差值 (post - pre)
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pair_id, topic)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pre_responses_pair ON pre_responses(pair_id);
CREATE INDEX IF NOT EXISTS idx_pre_responses_user ON pre_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_post_responses_survey ON post_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_post_responses_user ON post_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_mastery_progress_pair ON mastery_progress(pair_id);