const bcrypt = require('bcryptjs');
const queries = require('../models/queries')
const jwt = require('jsonwebtoken');
const pool = require("../models/pool")

// 用户登录的功能
const loginUser = async (username, password, res) => {
  const user = await queries.findUserByUsername(username);

  if (!user) {
    return res.status(400).send("用户名或密码错误");
  }

  // 验证密码
  bcrypt.compare(password, user.password, (err, result) => {
    if (err) {
      return res.status(500).send("密码验证时发生错误");
    }

    if (!result) {
      return res.status(400).send("用户名或密码错误");
    }

    // 密码正确，返回成功消息或生成 token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });
};



const createUser = async (req, res) => {
 // 从请求体中解构出用户名和密码
  const { username, password } = req.body;

  // 确保用户名和密码存在
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码是必填项' });
  }

  try {
    // 调用 registerUser 函数
    const result = await queries.registerUser(username, password);

    // 根据结果返回响应
    if (result.success) {
      res.status(200).json(result); // 注册成功
    } else {
      res.status(400).json(result); // 注册失败
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
}



const verifyUserToken = (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1]; // 获取 Authorization 头中的 JWT

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // JWT 验证通过，返回成功
    res.json({ message: 'Token is valid', user: decoded });
  });
}



const updatePassword = async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: '新密码和确认密码不一致' });
  }

  try {
    const user = await queries.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '当前密码错误' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: '新密码不能与当前密码相同' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const updateQuery = `UPDATE ${process.env.DB_TABLE_NAME} SET password = $1 WHERE id = $2 RETURNING *`;
    const result = await pool.query(updateQuery, [hashedNewPassword, userId]);

    if (result.rows.length > 0) {
      res.json({ success: true, message: '密码更新成功' });
    } else {
      res.status(500).json({ success: false, message: '密码更新失败' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
}


const getAvailableUsers = async (req, res) => {
  try {
    // 从 JWT token 中获取当前用户 ID
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const currentUserId = decoded.userId;

    // 获取可用用户列表（排除当前用户）
    const availableUsers = await queries.user.getAvailableUsers(currentUserId);

    res.json({
      success: true,
      users: availableUsers
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: '无效的认证令牌' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '认证令牌已过期' });
    }
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 获取当前用户资料（需登录）
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await queries.getPublicUserProfile(userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 更新当前用户资料（需登录）：昵称、简介、头像、感兴趣学科、擅长学科、难度偏好（仅更新传入的字段）
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nickname, bio, avatar_url, interested_topic_ids, proficient_topic_ids, difficulty_tag_ids } = req.body;

    const user = await queries.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const profileUpdates = {};
    if (req.body.hasOwnProperty('nickname')) {
      profileUpdates.nickname = typeof nickname === 'string' && nickname.trim() ? nickname.trim() : null;
    }
    if (req.body.hasOwnProperty('bio')) {
      profileUpdates.bio = bio === '' ? null : (bio != null ? String(bio) : null);
    }
    if (req.body.hasOwnProperty('avatar_url')) {
      profileUpdates.avatar_url = avatar_url === '' ? null : (avatar_url != null ? String(avatar_url) : null);
    }
    if (Object.keys(profileUpdates).length > 0) {
      const existing = await queries.user.getProfile(userId);
      await queries.user.upsertProfile(userId, {
        nickname: profileUpdates.nickname !== undefined ? profileUpdates.nickname : (existing && existing.nickname),
        bio: profileUpdates.bio !== undefined ? profileUpdates.bio : (existing && existing.bio),
        avatar_url: profileUpdates.avatar_url !== undefined ? profileUpdates.avatar_url : (existing && existing.avatar_url)
      });
    }

    if (interested_topic_ids !== undefined) {
      const ids = Array.isArray(interested_topic_ids) ? interested_topic_ids : [interested_topic_ids];
      await queries.user.setInterestedTopics(userId, ids.filter(id => id != null));
    }
    if (proficient_topic_ids !== undefined) {
      const ids = Array.isArray(proficient_topic_ids) ? proficient_topic_ids : [proficient_topic_ids];
      await queries.user.setProficientTopics(userId, ids.filter(id => id != null));
    }
    if (difficulty_tag_ids !== undefined) {
      const ids = Array.isArray(difficulty_tag_ids) ? difficulty_tag_ids : [difficulty_tag_ids];
      await queries.user.setDifficultyPreferences(userId, ids.filter(id => id != null));
    }

    const profile = await queries.getPublicUserProfile(userId);
    res.json({ success: true, message: '资料已更新', profile });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 获取学科列表（用于结对、学科偏好等）
const getTopics = async (req, res) => {
  try {
    const topics = await queries.getTopics();
    res.json({ success: true, topics });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 获取难度标签列表（用于难度偏好选择）
const getDifficultyTags = async (req, res) => {
  try {
    const tags = await queries.getDifficultyTags();
    res.json({ success: true, tags });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 获取指定用户公开资料（id、昵称、简介、学科偏好等，不含密码）
const getProfileByUserId = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ success: false, message: '用户ID无效' });
    }
    const profile = await queries.getPublicUserProfile(userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

module.exports = {
  loginUser,
  createUser,
  verifyUserToken,
  updatePassword,
  getAvailableUsers,
  getTopics,
  getDifficultyTags,
  getMyProfile,
  updateMyProfile,
  getProfileByUserId
}


