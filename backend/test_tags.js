require('dotenv').config({ path: './config/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function testTags() {
  try {
    console.log('=== 测试标签数据 ===\n');

    // 1. 检查所有标签
    const allTagsResult = await pool.query(`
      SELECT id, name, category
      FROM tags
      ORDER BY id
    `);
    console.log('数据库中的所有标签:');
    allTagsResult.rows.forEach(tag => {
      console.log(`  ID ${tag.id}: ${tag.name} (${tag.category})`);
    });

    // 2. 检查是否有ID 12-19的标签
    const missingTags = [];
    for (let i = 12; i <= 19; i++) {
      const tagExists = allTagsResult.rows.some(tag => tag.id === i);
      if (!tagExists) {
        missingTags.push(i);
      }
    }

    if (missingTags.length > 0) {
      console.log(`\n⚠️  缺失的标签ID: ${missingTags.join(', ')}`);
      console.log('需要执行数据库迁移！');
    } else {
      console.log('\n✅ 所有标签都已存在！');
    }

    // 3. 测试查询化学标签（ID 12）
    const chemistryTag = await pool.query(`
      SELECT id, name, category
      FROM tags
      WHERE id = 12
    `);
    if (chemistryTag.rows.length > 0) {
      console.log('\n✅ 化学标签存在:', chemistryTag.rows[0]);
    } else {
      console.log('\n❌ 化学标签（ID 12）不存在！');
    }

  } catch (error) {
    console.error('测试失败:', error.message);
  } finally {
    await pool.end();
  }
}

testTags();