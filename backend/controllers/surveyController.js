const surveyService = require('../services/surveyService');
const queries = require('../models/queries');
const rewardController = require('./rewardController');

// ==================== 热身测试接口 ====================

/**
 * 生成热身题目
 * POST /api/survey/pre/:pairId
 */
const generatePreQuestions = async (req, res) => {
  const { pairId } = req.params;
  const userId = req.user?.userId;

  try {
    // 参数验证
    if (!pairId) {
      return res.status(400).json({ error: '缺少 pairId 参数' });
    }

    // 获取结对信息
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return res.status(404).json({ error: '结对不存在' });
    }

    // 权限检查：只有结对的参与者才能生成
    if (userId && pair.teacher_id !== userId && pair.student_id !== userId) {
      return res.status(403).json({ error: '无权操作此结对' });
    }

    // 检查是否已经生成过
    const existing = await queries.survey.getPreQuestionsByPairId(pairId);
    if (existing.length > 0) {
      return res.json({
        success: true,
        data: existing,
        message: '热身题目已存在'
      });
    }

    // 调用服务生成题目
    const result = await surveyService.generatePreQuestions(parseInt(pairId));

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result.questions
    });

  } catch (error) {
    console.error('[SurveyController] 生成热身题目失败:', error);
    const message = error.message && error.message.includes('relation') && error.message.includes('does not exist')
      ? '系统初始化中，请稍后重试'
      : error.message;
    res.status(500).json({ error: message });
  }
};

/**
 * 获取热身题目
 * GET /api/survey/pre/:pairId
 */
const getPreQuestions = async (req, res) => {
  const { pairId } = req.params;
  const userId = req.user?.userId;

  try {
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return res.status(404).json({ error: '结对不存在' });
    }

    // 权限检查
    if (userId && pair.teacher_id !== userId && pair.student_id !== userId) {
      return res.status(403).json({ error: '无权查看此结对' });
    }

    const questions = await queries.survey.getPreQuestionsByPairId(pairId);
    console.log('[SurveyController] 获取到的题目数量:', questions.length);
    if (questions.length > 0) {
      console.log('[SurveyController] 第一题数据:', JSON.stringify(questions[0], null, 2));
      console.log('[SurveyController] 第一题 question 字段类型:', typeof questions[0].question);
      console.log('[SurveyController] 第一题 question 字段值:', questions[0].question);
    }

    // 获取已回答状态
    const responses = await queries.survey.getPreResponsesByPairId(pairId);
    const userResponses = userId ? responses.filter(r => r.user_id === userId) : [];

    res.json({
      success: true,
      data: {
        questions: questions,
        completed: userResponses.length === questions.length,
        totalQuestions: questions.length,
        answeredCount: userResponses.length
      }
    });

  } catch (error) {
    console.error('[SurveyController] 获取热身题目失败:', error);
    const message = error.message && error.message.includes('relation') && error.message.includes('does not exist')
      ? '系统初始化中，请稍后重试'
      : error.message;
    res.status(500).json({ error: message });
  }
};

/**
 * 提交热身回答
 * POST /api/survey/pre/respond
 */
const submitPreResponse = async (req, res) => {
  const { pairId, questionId, selectedIndex } = req.body;
  const userId = req.user?.userId;

  try {
    if (!pairId || questionId === undefined || selectedIndex === undefined) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return res.status(404).json({ error: '结对不存在' });
    }

    // 权限检查
    if (userId && pair.teacher_id !== userId && pair.student_id !== userId) {
      return res.status(403).json({ error: '无权操作' });
    }

    // 获取题目
    const question = await queries.survey.getPreQuestionById(questionId);
    if (!question || question.pair_id !== pairId) {
      return res.status(404).json({ error: '题目不存在' });
    }

    // 检查是否已回答
    const existing = await queries.survey.getPreResponse(questionId, userId);
    if (existing) {
      return res.status(400).json({ error: '已回答过此问题' });
    }

    // 计算是否正确（热身题目需要判断对错）
    const questionData = typeof question.question === 'string'
      ? JSON.parse(question.question)
      : question.question;
    const correctIndex = question.correct_index ?? questionData.correct_index;
    const isCorrect = selectedIndex === correctIndex;

    // 保存回答
    const response = await queries.survey.createPreResponse({
      pair_id: pairId,
      question_id: questionId,
      user_id: userId,
      selected_index: selectedIndex,
      is_correct: isCorrect // 即使是false也记录，因为热身不显示答案
    });

    // 检查是否全部完成
    const allResponses = await queries.survey.getPreResponsesByPairId(pairId);
    const allQuestions = await queries.survey.getPreQuestionsByPairId(pairId);

    res.json({
      success: true,
      data: {
        submitted: true,
        isCorrect: isCorrect,
        totalQuestions: allQuestions.length,
        answeredCount: allResponses.filter(r => r.user_id === userId).length
      }
    });

  } catch (error) {
    console.error('[SurveyController] 提交热身回答失败:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== 对话后问卷接口 ====================

/**
 * 生成对话后问卷
 * POST /api/survey/post/:pairId
 */
const generatePostSurvey = async (req, res) => {
  const { pairId } = req.params;
  const userId = req.user?.userId;

  try {
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return res.status(404).json({ error: '结对不存在' });
    }

    // 权限检查
    if (userId && pair.teacher_id !== userId && pair.student_id !== userId) {
      return res.status(403).json({ error: '无权操作' });
    }

    // 检查是否已经生成过
    const existing = await queries.survey.getPostSurveysByPairId(pairId);
    if (existing.length > 0) {
      return res.json({
        success: true,
        data: existing[0],
        message: '问卷已存在'
      });
    }

    // 调用服务生成问卷
    const result = await surveyService.generatePostSurvey(parseInt(pairId));

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result.survey
    });

  } catch (error) {
    console.error('[SurveyController] 生成问卷失败:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 获取问卷
 * GET /api/survey/post/:pairId
 */
const getPostSurvey = async (req, res) => {
  const { pairId } = req.params;
  const userId = req.user?.userId;

  try {
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return res.status(404).json({ error: '结对不存在' });
    }

    // 权限检查
    if (userId && pair.teacher_id !== userId && pair.student_id !== userId) {
      return res.status(403).json({ error: '无权查看' });
    }

    const survey = await queries.survey.getLatestPostSurvey(pairId);
    if (!survey) {
      return res.json({
        success: true,
        data: null,
        message: '暂无问卷'
      });
    }

    // 检查用户是否已提交
    const existingResponse = await queries.survey.getPostResponse(survey.id, userId);

    // 隐藏答案
    const questionsForUser = survey.questions.map(q => {
      if (q.is_fixed) {
        return q; // 评价题不需要隐藏
      }
      return {
        id: q.id,
        question: q.question,
        options: q.options,
        is_fixed: q.is_fixed,
        component_type: q.component_type,
        difficulty: q.difficulty
        // 隐藏 correct_index 和 explanation
      };
    });

    res.json({
      success: true,
      data: {
        id: survey.id,
        questions: questionsForUser,
        status: survey.status,
        expires_at: survey.expires_at,
        has_answered: !!existingResponse,
        is_expired: new Date(survey.expires_at) < new Date()
      }
    });

  } catch (error) {
    console.error('[SurveyController] 获取问卷失败:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 提交问卷回答（AI批改）
 * POST /api/survey/post/respond
 */
const submitPostResponse = async (req, res) => {
  const { surveyId, answers } = req.body;
  const userId = req.user?.userId;

  try {
    if (!surveyId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const survey = await queries.survey.getPostSurveyById(surveyId);
    if (!survey) {
      return res.status(404).json({ error: '问卷不存在' });
    }

    // 检查是否过期
    if (new Date(survey.expires_at) < new Date()) {
      return res.status(400).json({ error: '问卷已过期' });
    }

    // 检查是否已提交
    const existing = await queries.survey.getPostResponse(surveyId, userId);
    if (existing) {
      return res.status(400).json({ error: '已提交过问卷' });
    }

    // 获取用户角色
    const pair = await queries.pair.getById(survey.pair_id);
    const userRole = userId === pair.teacher_id ? 'teacher' : 'student';

    // 调用服务批改
    const gradingResult = await surveyService.gradeSurveyAnswers(survey, answers, userRole);

    if (!gradingResult.success) {
      return res.status(500).json({ error: gradingResult.error });
    }

    // 保存回答
    const response = await queries.survey.createPostResponse({
      survey_id: surveyId,
      pair_id: survey.pair_id,
      user_id: userId,
      user_role: userRole,
      answers: gradingResult.results,
      score: gradingResult.score,
      ai_review_result: gradingResult.ai_review
    });

    // 增加用户抽奖券（每提交一次问卷 +1）
    try {
      await rewardController.incrementTickets(userId, 1);
      console.log(`[SurveyController] 用户 ${userId} 提交问卷获得 +1 tickets`);
    } catch (ticketError) {
      console.error('[SurveyController] 增加抽奖券失败:', ticketError);
    }

    // 立即归档当前用户的问卷提醒通知
    try {
      await queries.notification.archiveByRelatedIdAndUser(survey.pair_id, 'survey_reminder', userId);
      console.log('[SurveyController] 已归档用户 ${userId} 的问卷提醒通知');
    } catch (notifError) {
      console.error('[SurveyController] 归档问卷通知失败:', notifError);
    }

    // 检查是否双方都已提交
    const allResponses = await queries.survey.getPostResponsesBySurveyId(surveyId);
    if (allResponses.length === 2) {
      await queries.survey.updatePostSurveyStatus(surveyId, 'completed');
      // 计算进度
      await surveyService.calculateMasteryProgress(survey.pair_id);

      // 归档双方的问卷提醒通知
      try {
        await queries.notification.archiveByRelatedId(survey.pair_id, 'survey_reminder');
        console.log('[SurveyController] 已归档问卷提醒通知');
      } catch (notifError) {
        console.error('[SurveyController] 归档问卷通知失败:', notifError);
      }
    }

    res.json({
      success: true,
      data: {
        submitted: true,
        score: gradingResult.score,
        results: gradingResult.results,
        ai_review: gradingResult.ai_review
      }
    });

  } catch (error) {
    console.error('[SurveyController] 提交问卷失败:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== 进度查询接口 ====================

/**
 * 获取掌握度进度
 * GET /api/survey/progress/:pairId
 */
const getProgress = async (req, res) => {
  const { pairId } = req.params;
  const userId = req.user?.userId;

  try {
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return res.status(404).json({ error: '结对不存在' });
    }

    // 权限检查
    if (userId && pair.teacher_id !== userId && pair.student_id !== userId) {
      return res.status(403).json({ error: '无权查看' });
    }

    const progressList = await queries.survey.getMasteryProgressByPairId(pairId);

    // 获取热身统计
    const preQuestions = await queries.survey.getPreQuestionsByPairId(pairId);
    const preResponses = await queries.survey.getPreResponsesByPairId(pairId);
    const teacherCorrect = preResponses.filter(r => r.user_id === pair.teacher_id && r.is_correct).length;
    const studentCorrect = preResponses.filter(r => r.user_id === pair.student_id && r.is_correct).length;

    res.json({
      success: true,
      data: {
        pre_session: {
          total_questions: preQuestions.length,
          teacher_correct: teacherCorrect,
          student_correct: studentCorrect
        },
        progress: progressList
      }
    });

  } catch (error) {
    console.error('[SurveyController] 获取进度失败:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== 问卷反馈查询接口 ====================

/**
 * 获取问卷反馈（包含错误题目详情）
 * GET /api/survey/post/:pairId/feedback
 */
const getPostSurveyFeedback = async (req, res) => {
  const { pairId } = req.params;
  const userId = req.user?.userId;

  try {
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return res.status(404).json({ error: '结对不存在' });
    }

    // 权限检查
    if (userId && pair.teacher_id !== userId && pair.student_id !== userId) {
      return res.status(403).json({ error: '无权查看' });
    }

    // 获取问卷（使用最新的）
    const survey = await queries.survey.getLatestPostSurvey(pairId);
    if (!survey) {
      return res.json({
        success: true,
        data: null,
        message: '暂无问卷'
      });
    }

    // 获取双方回答
    const responses = await queries.survey.getPostResponsesBySurveyId(survey.id);

    if (responses.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: '问卷尚未填写'
      });
    }

    // 解析问卷题目（包含正确答案和解析）
    const surveyQuestions = typeof survey.questions === 'string'
      ? JSON.parse(survey.questions)
      : survey.questions;

    // 构建题目ID到题目信息的映射
    const questionMap = {};
    surveyQuestions.forEach((q, index) => {
      questionMap[index] = q;
    });

    // 获取当前用户的回答
    const userResponse = responses.find(r => r.user_id === userId);

    // 构建反馈数据
    const feedbackData = {
      survey_id: survey.id,
      status: survey.status
    };

    if (userResponse) {
      feedbackData.score = userResponse.score;
      feedbackData.wrongQuestions = [];

      const answers = typeof userResponse.answers === 'string'
        ? JSON.parse(userResponse.answers)
        : userResponse.answers;

      // 筛选错误题目（is_correct === false && is_fixed === false）
      answers.forEach((answer, index) => {
        if (answer.is_correct === false && answer.is_fixed === false) {
          const question = questionMap[index];
          if (question) {
            const selectedIndex = answer.selected_index;
            const myAnswer = question.options && question.options[selectedIndex]
              ? question.options[selectedIndex]
              : '未知答案';

            feedbackData.wrongQuestions.push({
              question: question.question,
              myAnswer: myAnswer,
              explanation: answer.feedback || question.explanation || '暂无解析'
            });
          }
        }
      });
    }

    res.json({
      success: true,
      data: feedbackData
    });

  } catch (error) {
    console.error('[SurveyController] 获取问卷反馈失败:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  generatePreQuestions,
  getPreQuestions,
  submitPreResponse,
  generatePostSurvey,
  getPostSurvey,
  submitPostResponse,
  getPostSurveyFeedback,
  getProgress
};