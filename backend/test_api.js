const { Pool } = require('pg');

// 从环境变量或配置文件中读取数据库配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'tutome',
  password: 'postgres',
  port: 5432,
});

async function testQueries() {
  try {
    console.log('=== 测试 1: 检查问题表 ===');
    const questionsResult = await pool.query('SELECT COUNT(*) as count FROM questions');
    console.log('问题总数:', questionsResult.rows[0].count);

    if (questionsResult.rows[0].count > 0) {
      const questionsList = await pool.query('SELECT id, title, user_id FROM questions LIMIT 5');
      console.log('前5个问题:', questionsList.rows);
    }

    console.log('\n=== 测试 2: 检查结对表 ===');
    const pairsResult = await pool.query('SELECT COUNT(*) as count FROM pairs');
    console.log('结对总数:', pairsResult.rows[0].count);

    if (pairsResult.rows[0].count > 0) {
      const pairsList = await pool.query('SELECT id, teacher_id, student_id, question_id, status FROM pairs LIMIT 5');
      console.log('前5个结对:', pairsList.rows);
    }

    console.log('\n=== 测试 3: 检查问题是否有 question_id 字段 ===');
    const columnResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'pairs' AND column_name = 'question_id'
    `);
    if (columnResult.rows.length > 0) {
      console.log('pairs 表有 question_id 字段:', columnResult.rows[0]);
    } else {
      console.log('⚠️  pairs 表没有 question_id 字段！需要执行数据库迁移。');
    }

    console.log('\n=== 测试 4: 模拟 getUserHistory 查询（用户ID = 1） ===');
    const testUserId = 1;
    const historyQuery = `
      WITH user_questions AS (
        SELECT q.*, u.username, 'created' as participation_type
        FROM questions q
        JOIN users u ON q.user_id = u.id
        WHERE q.user_id = $1

        UNION

        SELECT q.*, u.username, 'participated' as participation_type
        FROM questions q
        JOIN users u ON q.user_id = u.id
        JOIN pairs p ON p.question_id = q.id
        WHERE (p.teacher_id = $1 OR p.student_id = $1) AND q.user_id != $1
      )
      SELECT DISTINCT ON (id) id, title, content, user_id, username, created_at, updated_at, role, participation_type
      FROM user_questions
      ORDER BY created_at DESC, id DESC
      LIMIT 5
    `;
    const historyResult = await pool.query(historyQuery, [testUserId]);
    console.log('用户1的历史记录数量:', historyResult.rows.length);
    if (historyResult.rows.length > 0) {
      console.log('用户1的历史记录:', historyResult.rows);
    }

  } catch (error) {
    console.error('测试失败:', error.message);
  } finally {
    await pool.end();
  }
}

testQueries();