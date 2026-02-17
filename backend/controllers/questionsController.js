const queries = require('../models/queries');

// 定义分类规则（可配置）
const CATEGORY_RULES = {
  'subject': { min: 1, max: 2 }, 
  'difficulty': { min: 1, max: 1 },  
  'progress': { min: 1, max: 1 },
  'default': { min: 0, max: 99 }  // 默认规则：不限制（备用）
};

//搜索功能标签分类规则
const SEARCH_CATEGORY_RULES = {
  'subject': { min: 1, max: 3 }, 
  'difficulty':       { min: 0, max: 2 },  
  'progress':      { min: 0, max: 1 },
  'default':    { min: 0, max: 99 }
};

// 创建问题（支持标签）
const createQuestion = async (req, res) => {
  try {
    const { title, content, tagIds } = req.body;
    const userId = req.user.userId;

    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: '标题和内容是必填项' 
      });
    }

    // 处理tagIds
    let tagIdsArray = [];
    if (tagIds) {
      tagIdsArray = Array.isArray(tagIds) ? tagIds : [tagIds];
      tagIdsArray = tagIdsArray.map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    // 调用修改后的createQuestion，传入新的分类规则对象
    const result = await queries.createQuestion(
      title, 
      content, 
      userId, 
      tagIdsArray,
      CATEGORY_RULES // 传入完整的规则对象
    );
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      const statusCode = result.message.includes('至少选择') || 
                        result.message.includes('最多选择') ? 400 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '服务器错误', 
      error: error.message 
    });
  }
};

// 新增：按分类获取标签
const getTagsByCategory = async (req, res) => {
  try {
    const result = await queries.getTagsByCategory();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '获取标签失败', 
      error: error.message 
    });
  }
};

// 获取问题列表（支持标签筛选）
const getQuestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const tagId = req.query.tagId ? parseInt(req.query.tagId) : null;
    
    const result = await queries.getQuestions(page, limit, tagId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '服务器错误', 
      error: error.message 
    });
  }
};

// 获取用户的问题
const getUserQuestions = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    const result = await queries.getUserQuestions(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '服务器错误', 
      error: error.message 
    });
  }
};

// 按标签id获取问题
const getQuestionsByTagId = async (req, res) => {
  try {
    const tagId = parseInt(req.params.tagId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    if (isNaN(tagId) || tagId <= 0) {
      return res.status(400).json({
        success: false,
        message: '标签ID必须是一个正整数'
      });
    }
    
    // 调用模型层函数
    const result = await queries.getQuestionsByTagId(tagId, page, limit);
    
    // 如果标签不存在，可以返回404或空列表
    if (result.questions.length === 0 && result.total === 0) {
      // 可以选择返回404，或者像这样返回空结果
      // return res.status(404).json({ success: false, message: '标签不存在' });
    }
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '服务器错误', 
      error: error.message 
    });
  }
};

// 获取所有可用标签
const getAvailableTags = async (req, res) => {
  try {
    const result = await queries.getAvailableTags();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '获取标签失败', 
      error: error.message 
    });
  }
};

//按多类标签搜索
const searchByMultipleTags = async (req, res) => {
  try {
    // 解析标签ID
    let tagIds = [];
    
    if (req.query.tags) {
      tagIds = req.query.tags.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    } else if (req.body.tagIds) {
      tagIds = Array.isArray(req.body.tagIds) 
        ? req.body.tagIds.map(id => parseInt(id)).filter(id => !isNaN(id))
        : [parseInt(req.body.tagIds)].filter(id => !isNaN(id));
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    // 新增：调用带规则校验的搜索函数
    const result = await queries.searchByMultipleTags(
      tagIds, 
      page, 
      limit, 
      SEARCH_CATEGORY_RULES  // 传入搜索规则
    );
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      // 根据错误类型返回不同状态码
      const statusCode = result.message.includes('至少选择') || 
                        result.message.includes('最多选择') ? 400 : 500;
      res.status(statusCode).json(result);
    }
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '搜索失败', 
      error: error.message 
    });
  }
};

// 删除问题（提问者才能删除）
const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params; // 获取请求中的 questionId
    const userId = req.user.userId; // 获取当前用户的 userId

    // 检查问题是否存在
    const question = await queries.getQuestionById(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '问题不存在',
      }); 
    }

    // 验证用户是否是问题的创建者
    if (question.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '您无权删除此问题',
      });
    }
    
    // 删除问题
    const result = await queries.deleteQuestion(questionId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: '问题已成功删除',
      });
    } else {
      return res.status(500).json({
        success: false,
        message: '删除问题失败',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};


module.exports = {
  createQuestion,
  getQuestions,
  getUserQuestions,
  getAvailableTags,
  getQuestionsByTagId,
  getTagsByCategory,
  searchByMultipleTags,
  deleteQuestion
};