const pool = require('./pool');

async function autoMigrate() {
  let client;
  try {
    console.log('[AutoMigrate] 检查并创建缺失的表...');
    client = await pool.connect();

    await client.query(`CREATE TABLE IF NOT EXISTS pre_questions (id SERIAL PRIMARY KEY, pair_id INT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE, question JSONB NOT NULL, correct_index INT NOT NULL, position INT NOT NULL, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(pair_id, position))`);

    await client.query(`CREATE TABLE IF NOT EXISTS pre_responses (id SERIAL PRIMARY KEY, pair_id INT NOT NULL, question_id INT NOT NULL REFERENCES pre_questions(id) ON DELETE CASCADE, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, selected_index INT NOT NULL, is_correct BOOLEAN NOT NULL, answered_at TIMESTAMP DEFAULT NOW(), UNIQUE(question_id, user_id))`);

    await client.query(`CREATE TABLE IF NOT EXISTS post_surveys (id SERIAL PRIMARY KEY, pair_id INT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE, questions JSONB NOT NULL, fixed_components JSONB, status VARCHAR(20) DEFAULT 'pending', expires_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())`);

    await client.query(`CREATE TABLE IF NOT EXISTS post_responses (id SERIAL PRIMARY KEY, survey_id INT NOT NULL REFERENCES post_surveys(id) ON DELETE CASCADE, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, user_role VARCHAR(20) NOT NULL, answers JSONB NOT NULL, score FLOAT, ai_review_result JSONB, submitted_at TIMESTAMP DEFAULT NOW(), UNIQUE(survey_id, user_id))`);

    await client.query(`CREATE TABLE IF NOT EXISTS mastery_progress (id SERIAL PRIMARY KEY, pair_id INT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE, topic VARCHAR(100), pre_correct_rate FLOAT, post_correct_rate FLOAT, pre_total INT, post_total INT, progress FLOAT, calculated_at TIMESTAMP DEFAULT NOW(), UNIQUE(pair_id, topic))`);

    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS pre_questions_template JSONB DEFAULT NULL`);

    // 通知系统表
    await client.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, type VARCHAR(50) NOT NULL, related_id INTEGER, title VARCHAR(200) NOT NULL, content TEXT, is_read BOOLEAN DEFAULT FALSE, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_status_created ON notifications(user_id, status, created_at DESC)`);

    // 私信表
    await client.query(`CREATE TABLE IF NOT EXISTS private_messages (id SERIAL PRIMARY KEY, sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, content TEXT, image_url TEXT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_private_messages_receiver ON private_messages(receiver_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC)`);

    console.log('[AutoMigrate] 所有表检查完成');
  } catch (error) {
    console.error('[AutoMigrate] 自动迁移失败:', error.message);
  } finally {
    if (client) client.release();
  }
}

module.exports = autoMigrate;
