const pool = require('./pool');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config/.env' });

// 注册函数
async function registerUser(username, password){
  try {
    // 1. 验证用户名是否已经存在
    const checkUserQuery = `SELECT * FROM ${process.env.DB_TABLE_NAME} WHERE username = $1`;
    const checkUserResult = await pool.query(checkUserQuery, [username]);

    if (checkUserResult.rows.length > 0) {
      throw new Error('用户名已存在');
    }

    // 2. 对密码进行加密
    const hashedPassword = await bcrypt.hash(password, 10); // 10 是加密的 salt rounds

    // 3. 将新用户信息插入数据库
    const insertUserQuery = `INSERT INTO ${process.env.DB_TABLE_NAME} (username, password) VALUES ($1, $2) RETURNING *`;
    const insertUserResult = await pool.query(insertUserQuery, [username, hashedPassword]);

    // 4. 返回新注册的用户信息
    const newUser = insertUserResult.rows[0];
    return {
      success: true,
      message: '注册成功',
      user: { id: newUser.id, username: newUser.username },
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

const findUserByUsername = async (username) => {
  try {
    // 使用 SQL 查询来查找数据库中的用户
    const result = await pool.query(`SELECT * FROM ${process.env.DB_TABLE_NAME} WHERE username = $1`, [username]);

    // 如果找到用户，返回第一个用户（或者返回 null）
    if (result.rows.length > 0) {
      return result.rows[0];  // 返回找到的第一个用户
    } else {
      return null;  // 如果没有找到用户
    }
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
};

//创建问题
async function createQuestion(title, content, userId, tagIds = [], categoryRules = {}) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. 插入问题
    const questionQuery = `
      INSERT INTO questions (title, content, user_id) 
      VALUES ($1, $2, $3) 
      RETURNING id, title, content, user_id, created_at
    `;
    const questionResult = await client.query(questionQuery, [title, content, userId]);
    const questionId = questionResult.rows[0].id;
    
    // 2. 验证标签并分类校验（核心修改部分）
    if (tagIds && tagIds.length > 0) {
      // 2.1 获取标签信息
      const placeholders = tagIds.map((_, idx) => `$${idx + 1}`).join(',');
      const tagsInfoQuery = `
        SELECT id, name, category 
        FROM tags 
        WHERE id IN (${placeholders})
      `;
      const tagsInfoResult = await client.query(tagsInfoQuery, tagIds);
      
      const validTags = tagsInfoResult.rows;
      const validTagIds = validTags.map(tag => tag.id);
      const invalidTagIds = tagIds.filter(id => !validTagIds.includes(id));
      
      if (invalidTagIds.length > 0) {
        throw new Error(`以下标签ID不存在: ${invalidTagIds.join(', ')}`);
      }
      
      // 2.2 按分类统计
      const categoryCount = {};
      validTags.forEach(tag => {
        categoryCount[tag.category] = (categoryCount[tag.category] || 0) + 1;
      });
      
      // 2.3 【新增】获取所有有规则限制的类别（用于检查必须选的类别是否漏选）
      const allRuleCategories = new Set(
        Object.keys(categoryRules).filter(cat => cat !== 'default')
      );
      const selectedCategories = new Set(Object.keys(categoryCount));
      
      // 2.4 校验每个类别的数量是否符合min-max范围
      // 默认规则（备用）
      const defaultRule = categoryRules['default'] || { min: 0, max: 99 };
      
      // 检查已选的类别
      for (const [category, count] of Object.entries(categoryCount)) {
        const rule = categoryRules[category] || defaultRule;
        const { min = 0, max = 99 } = rule;
        
        if (count < min) {
          throw new Error(`"${category}" 类别的标签至少需要选择 ${min} 个，您只选择了 ${count} 个`);
        }
        if (count > max) {
          throw new Error(`"${category}" 类别的标签最多选择 ${max} 个，您选择了 ${count} 个`);
        }
      }
      
      // 2.5 【新增】检查必须选但未选的类别
      for (const category of allRuleCategories) {
        const rule = categoryRules[category];
        // 如果这个类别有最小限制(min>0)，但用户根本没选这个类别的任何标签
        if (rule.min > 0 && !selectedCategories.has(category)) {
          throw new Error(`必须选择至少 ${rule.min} 个 "${category}" 类别的标签`);
        }
      }
      
      // 2.6 插入关联关系
      for (const tagId of validTagIds) {
        await client.query(
          'INSERT INTO question_tags (question_id, tag_id) VALUES ($1, $2)',
          [questionId, tagId]
        );
      }
    } else {
      // 【新增】如果没有选择任何标签，检查是否有必须选的类别
      const allRuleCategories = new Set(
        Object.keys(categoryRules).filter(cat => cat !== 'default')
      );
      for (const category of allRuleCategories) {
        const rule = categoryRules[category];
        if (rule.min > 0) {
          throw new Error(`必须选择至少 ${rule.min} 个 "${category}" 类别的标签`);
        }
      }
    }
    
    await client.query('COMMIT');
    
    // 3. 获取完整的问题信息
    const completeQuestion = await getQuestionWithTags(questionId);
    
    return {
      success: true,
      question: completeQuestion
    };
  } catch (error) {
    await client.query('ROLLBACK');
    return { success: false, message: error.message };
  } finally {
    client.release();
  }
}

// 修改原有的 searchQuestionsByTag 函数，使其按标签ID搜索
async function getQuestionsByTagId(tagId, page = 1, limit = 20) {
  // 直接调用已有的 getQuestions 函数，传入 tagId 参数
  return await getQuestions(page, limit, tagId);
}

// 新增：根据问题ID获取问题及标签
async function getQuestionWithTags(questionId) {
  const questionQuery = `
    SELECT q.*, u.username 
    FROM questions q 
    JOIN users u ON q.user_id = u.id 
    WHERE q.id = $1
  `;
  const questionResult = await pool.query(questionQuery, [questionId]);
  
  if (questionResult.rows.length === 0) {
    return null;
  }
  
  const question = questionResult.rows[0];
  
  // 获取标签
  const tagsQuery = `
    SELECT t.id, t.name 
    FROM tags t 
    JOIN question_tags qt ON t.id = qt.tag_id 
    WHERE qt.question_id = $1
    ORDER BY t.name
  `;
  const tagsResult = await pool.query(tagsQuery, [questionId]);
  
  question.tags = tagsResult.rows;
  return question;
}

// 修改：获取所有问题（包含标签）
async function getQuestions(page = 1, limit = 20, tagId = null) {
  try {
    const offset = (page - 1) * limit;
    let queryParams = [limit, offset];
    let queryIndex = 3;
    
    // 基础查询
    let query = `
      SELECT q.*, u.username 
      FROM questions q 
      JOIN users u ON q.user_id = u.id 
    `;
    
    // 如果指定了标签，添加关联
    if (tagId) {
      query += `JOIN question_tags qt ON q.id = qt.question_id WHERE qt.tag_id = $${queryIndex}`;
      queryParams.push(tagId);
      queryIndex++;
    }
    
    query += ` ORDER BY q.created_at DESC LIMIT $1 OFFSET $2`;
    
    // 获取问题列表
    const questionsResult = await pool.query(query, queryParams);
    
    // 为每个问题获取标签
    const questionsWithTags = await Promise.all(
      questionsResult.rows.map(async (question) => {
        const tagsQuery = `
          SELECT t.id, t.name 
          FROM tags t 
          JOIN question_tags qt ON t.id = qt.tag_id 
          WHERE qt.question_id = $1
          ORDER BY t.name
        `;
        const tagsResult = await pool.query(tagsQuery, [question.id]);
        question.tags = tagsResult.rows;
        return question;
      })
    );
    
    // 获取总数
    let countQuery = `SELECT COUNT(*) FROM questions`;
    let countParams = [];
    
    if (tagId) {
      countQuery = `
        SELECT COUNT(DISTINCT q.id) 
        FROM questions q 
        JOIN question_tags qt ON q.id = qt.question_id 
        WHERE qt.tag_id = $1
      `;
      countParams = [tagId];
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    return {
      success: true,
      questions: questionsWithTags,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 修改：获取用户的问题（包含标签）
async function getUserQuestions(userId) {
  try {
    const query = `
      SELECT q.*, u.username 
      FROM questions q 
      JOIN users u ON q.user_id = u.id 
      WHERE q.user_id = $1 
      ORDER BY q.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    
    // 为每个问题获取标签
    const questionsWithTags = await Promise.all(
      result.rows.map(async (question) => {
        const tagsQuery = `
          SELECT t.id, t.name 
          FROM tags t 
          JOIN question_tags qt ON t.id = qt.tag_id 
          WHERE qt.question_id = $1
          ORDER BY t.name
        `;
        const tagsResult = await pool.query(tagsQuery, [question.id]);
        question.tags = tagsResult.rows;
        return question;
      })
    );
    
    return {
      success: true,
      questions: questionsWithTags
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function getAvailableTags() {
  try {
    const query = `SELECT id, name FROM tags ORDER BY name`;
    const result = await pool.query(query);
    return {
      success: true,
      tags: result.rows
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 新增：按分类获取标签的函数（给前端用）
async function getTagsByCategory() {
  try {
    const query = `SELECT id, name, category FROM tags ORDER BY category, name`;
    const result = await pool.query(query);
    
    // 按分类分组
    const grouped = {};
    result.rows.forEach(tag => {
      if (!grouped[tag.category]) {
        grouped[tag.category] = [];
      }
      grouped[tag.category].push({ id: tag.id, name: tag.name });
    });
    
    return {
      success: true,
      categories: grouped
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

//搜索问题
async function searchByMultipleTags(tagIds = [], page = 1, limit = 20, categoryRules = {}) {
  try {
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      // 如果没有提供标签ID，返回所有问题
      return await getQuestions(page, limit);
    }
    
    // 1. 获取标签的详细信息（包括分类）
    const placeholders = tagIds.map((_, idx) => `$${idx + 1}`).join(',');
    const tagsInfoQuery = `
      SELECT id, name, category 
      FROM tags 
      WHERE id IN (${placeholders})
    `;
    const tagsInfoResult = await pool.query(tagsInfoQuery, tagIds);
    
    // 验证所有标签ID是否存在
    if (tagsInfoResult.rows.length !== tagIds.length) {
      const foundIds = tagsInfoResult.rows.map(row => row.id);
      const invalidIds = tagIds.filter(id => !foundIds.includes(id));
      return {
        success: false,
        message: `以下标签ID不存在: ${invalidIds.join(', ')}`
      };
    }
    
    // 2. 【内联校验】搜索标签分类规则校验
    if (Object.keys(categoryRules).length > 0) {
      // 2.1 按分类统计标签数量
      const categoryCount = {};
      tagsInfoResult.rows.forEach(tag => {
        categoryCount[tag.category] = (categoryCount[tag.category] || 0) + 1;
      });
      
      // 2.2 获取所有有规则限制的类别
      const allRuleCategories = new Set(
        Object.keys(categoryRules).filter(cat => cat !== 'default')
      );
      
      // 2.3 默认规则
      const defaultRule = categoryRules['default'] || { min: 0, max: 99 };
      
      // 2.4 校验每个已选类别的数量
      for (const [category, count] of Object.entries(categoryCount)) {
        const rule = categoryRules[category] || defaultRule;
        const { min = 0, max = 99 } = rule;
        
        if (count < min) {
          return {
            success: false,
            message: `搜索时"${category}"类别的标签至少需要选择 ${min} 个，您只选择了 ${count} 个`,
            tagCountByCategory: categoryCount
          };
        }
        if (count > max) {
          return {
            success: false,
            message: `搜索时"${category}"类别的标签最多选择 ${max} 个，您选择了 ${count} 个`,
            tagCountByCategory: categoryCount
          };
        }
      }
      
      // 2.5 检查必须选但未选的类别（当min>0时）
      const selectedCategories = new Set(Object.keys(categoryCount));
      for (const category of allRuleCategories) {
        const rule = categoryRules[category];
        if (rule.min > 0 && !selectedCategories.has(category)) {
          return {
            success: false,
            message: `搜索时必须选择至少 ${rule.min} 个"${category}"类别的标签`,
            tagCountByCategory: categoryCount
          };
        }
      }
    }
    
    // 3. 执行搜索查询
    const offset = (page - 1) * limit;
    
    const searchQuery = `
      SELECT q.*, u.username 
      FROM questions q
      JOIN users u ON q.user_id = u.id
      JOIN question_tags qt ON q.id = qt.question_id
      WHERE qt.tag_id IN (${placeholders})
      GROUP BY q.id, u.username
      HAVING COUNT(DISTINCT qt.tag_id) = $${tagIds.length + 1}
      ORDER BY q.created_at DESC
      LIMIT $${tagIds.length + 2} OFFSET $${tagIds.length + 3}
    `;
    
    // 总数查询
    const countQuery = `
      SELECT COUNT(DISTINCT q.id) as total
      FROM questions q
      JOIN question_tags qt ON q.id = qt.question_id
      WHERE qt.tag_id IN (${placeholders})
      GROUP BY q.id
      HAVING COUNT(DISTINCT qt.tag_id) = $${tagIds.length + 1}
    `;
    
    // 准备查询参数
    const queryParams = [...tagIds, tagIds.length, limit, offset];
    const countParams = [...tagIds, tagIds.length];
    
    // 并行执行查询
    const [questionsResult, countResult] = await Promise.all([
      pool.query(searchQuery, queryParams),
      pool.query(countQuery, countParams)
    ]);
    
    // 为每个问题获取标签详情
    const questionsWithTags = await Promise.all(
      questionsResult.rows.map(async (question) => {
        const tagsQuery = `
          SELECT t.id, t.name, t.category
          FROM tags t
          JOIN question_tags qt ON t.id = qt.tag_id
          WHERE qt.question_id = $1
          ORDER BY t.name
        `;
        const tagsResult = await pool.query(tagsQuery, [question.id]);
        question.tags = tagsResult.rows;
        return question;
      })
    );
    
    return {
      success: true,
      questions: questionsWithTags,
      total: countResult.rows.length,
      page,
      limit,
      searchTags: tagIds,
      tagCategories: tagsInfoResult.rows.map(tag => ({
        id: tag.id,
        name: tag.name,
        category: tag.category
      }))
    };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  registerUser,
  findUserByUsername,
  createQuestion,    
  getQuestions,      
  getUserQuestions,   
  getAvailableTags,
  getQuestionsByTagId,
  getQuestionWithTags,
  getTagsByCategory,
  searchByMultipleTags
};