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


module.exports = {
  registerUser,
  findUserByUsername,
  
};