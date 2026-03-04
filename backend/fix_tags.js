require('dotenv').config({ path: './config/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function fixTags() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('=== 修复标签ID ===\n');

    // 1. 删除错误ID的标签（ID 34-41）
    const deleteResult = await client.query(`
      DELETE FROM tags
      WHERE id IN (34, 35, 36, 37, 38, 39, 40, 41)
    `);
    console.log(`删除了 ${deleteResult.rowCount} 个错误ID的标签`);

    // 2. 插入正确ID的标签（ID 12-19）
    const insertResult = await client.query(`
      INSERT INTO tags (id, name, category) VALUES
      (12, '化学', 'subject'),
      (13, '生物', 'subject'),
      (14, '编程与计算机', 'subject'),
      (15, '经管/社科', 'subject'),
      (16, '电子与工程', 'subject'),
      (17, '英语与学术写作', 'subject'),
      (18, '科研', 'subject'),
      (19, '其他', 'subject')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
      RETURNING id, name, category
    `);
    console.log(`插入了 ${insertResult.rowCount} 个正确ID的标签:`);
    insertResult.rows.forEach(tag => {
      console.log(`  ID ${tag.id}: ${tag.name} (${tag.category})`);
    });

    // 3. 重置ID序列
    await client.query(`
      SELECT setval('tags_id_seq', (SELECT MAX(id) FROM tags))
    `);
    console.log('\n已重置标签ID序列');

    // 4. 验证结果
    const verifyResult = await client.query(`
      SELECT id, name, category
      FROM tags
      ORDER BY id
    `);
    console.log('\n验证 - 所有标签:');
    verifyResult.rows.forEach(tag => {
      console.log(`  ID ${tag.id}: ${tag.name} (${tag.category})`);
    });

    await client.query('COMMIT');
    console.log('\n✅ 标签修复完成！');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('修复失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixTags();