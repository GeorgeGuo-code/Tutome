const OpenAI = require('openai');
const queries = require('../models/queries');
const pool = require('../models/pool');
require('dotenv').config({ path: './config/.env' });

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  baseURL: process.env.AI_BASE_URL,
  apiKey: process.env.AI_SECRET_KEY
});

// ==================== 系统提示词 ====================

// 热身题目生成提示词
const PRE_QUESTIONS_SYSTEM_PROMPT = `你是一个教学辅导专家，负责根据师生结对的问题生成启发性的热身选择题。

## 你的任务
根据结对的问题主题，生成5道具有启发性的选择题，帮助学生和老师建立对问题的基本认识。

## 要求
1. 题目精简，30字以内
2. 选项4个，各选项差异明显，避免过于接近的选项
3. 能激发进一步思考和提问
4. 不出超纲题，难度适中
5. 每道题需标注关联的知识点（topic）

## 输出格式（严格JSON）
{
  "questions": [
    {
      "question": "题目内容",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "topic": "关联知识点"
    }
  ]
}

## 注意事项
- 不要在题目中透露正确答案
- 选项应该是有一定区分度的，不能明显错误
- 题目应该既能检验基本理解，又能启发深入思考`;

// 问卷题目生成提示词
const POST_SURVEY_SYSTEM_PROMPT = `你是一个教学评估专家，负责基于师生对话总结生成测试问卷。

## 你的任务
根据对话总结，生成一份测试问卷，包含知识题和固定评价组件。

## 问卷结构

### 第一部分：知识题（8-10道）
- 包含2-3道原题（复用热身题目，考察是否真正掌握）
- 包含6-7道新题（同知识点，难度略高，考察迁移能力）
- 每道题需标注：
  - difficulty: 1=基础, 2=中等, 3=进阶
  - is_original: true表示原题，false表示新题
  - 正确答案和解析

### 第二部分：固定评价组件
**学生评价老师**（3题，5分制）：
1. 教学清晰度：老师是否能清楚地解释概念？
2. 教学态度：老师的教学态度是否积极？
3. 专业水平：老师的专业知识是否扎实？

**老师评价学生**（3题，5分制）：
1. 学习态度：学生的学习态度是否认真？
2. 参与程度：学生是否积极参与讨论？
3. 理解程度：学生是否理解讲解的内容？

**双方评价教学**（3题，5分制）：
1. 总体满意度：对本次教学的总体满意度
2. 内容质量：教学内容是否丰富有价值
3. 推荐意愿：是否愿意推荐给其他人

## 输出格式（严格JSON）
{
  "questions": [
    {
      "question": "题目内容",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "correct_index": 0,
      "explanation": "答案解析",
      "topic": "关联知识点",
      "difficulty": 1,
      "is_original": false
    }
  ],
  "fixedComponents": {
    "teacher_evaluation": [
      {
        "component_id": "clarity",
        "question": "老师是否能清楚地解释概念？",
        "options": ["1分", "2分", "3分", "4分", "5分"]
      }
    ],
    "student_evaluation": [...],
    "teaching_evaluation": [...]
  }
}`;

// AI批改提示词
const GRADING_SYSTEM_PROMPT = `你是一个教学评估助手，负责批改用户的问卷回答。

## 你的任务
根据题目和用户的回答，给出对错判断和简要反馈。

## 输入格式
你会收到：
1. 题目列表（包含正确答案）
2. 用户的回答列表

## 输出格式（严格JSON）
{
  "results": [
    {
      "question_id": 0,
      "is_correct": true/false,
      "feedback": "简要反馈（答对称赞，答错说明原因）"
    }
  ],
  "total_score": "正确数/总数",
  "overall_comment": "总体评语，2-3句话"
}`;

// ==================== 辅助函数 ====================

/**
 * 调用 AI 生成内容
 * @param {Array} context - 消息上下文
 * @param {number} temperature - 温度参数
 * @param {number} maxTokens - 最大token数
 * @returns {Object} 解析后的JSON结果
 */
async function callAI(context, temperature = 0.3, maxTokens = 2000) {
  const model = process.env.AI_MODEL || 'deepseek-chat';

  const response = await openai.chat.completions.create({
    model: model,
    messages: context,
    temperature: temperature,
    max_tokens: maxTokens
  });

  const content = response.choices[0].message.content;

  // 尝试解析 JSON 响应
  try {
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }

    return JSON.parse(jsonContent.trim());
  } catch (parseError) {
    console.error('[SurveyService] AI 响应解析失败:', parseError);
    throw new Error('AI 响应格式错误：' + content.slice(0, 100));
  }
}

// ==================== 核心服务函数 ====================

/**
 * 为问题生成热身题目模板（在问题创建时调用）
 * @param {number} questionId - 问题ID
 * @returns {Object} 生成结果 {success, templates}
 */
async function generatePreQuestionTemplates(questionId) {
  try {
    // 获取问题内容
    const question = await queries.getQuestionById(questionId);
    if (!question) {
      return { success: false, error: '问题不存在' };
    }

    // 构建上下文
    const context = [
      { role: 'system', content: PRE_QUESTIONS_SYSTEM_PROMPT },
      { role: 'user', content: `请根据以下问题主题生成5道热身选择题：\n\n问题：${question.title}\n描述：${question.content}` }
    ];

    // 调用AI
    const result = await callAI(context, 0.5, 1500);

    if (!result.questions || !Array.isArray(result.questions)) {
      return { success: false, error: '生成题目格式错误' };
    }

    // 构建模板
    const templates = result.questions.map((q, i) => ({
      question: { question: q.question, options: q.options, topic: q.topic },
      position: i + 1
    }));

    // 更新问题记录，存储预生成的题目模板
    await pool.query(
      'UPDATE questions SET pre_questions_template = $1 WHERE id = $2',
      [JSON.stringify(templates), questionId]
    );

    console.log(`[SurveyService] 为问题 ${questionId} 生成了 ${templates.length} 道热身题目模板`);
    return { success: true, templates };

  } catch (error) {
    console.error('[SurveyService] 生成热身题目模板失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 生成热身题目
 * @param {number} pairId - 结对ID
 * @returns {Object} 生成结果 {success, questions}
 */
async function generatePreQuestions(pairId) {
  try {
    // 获取结对信息
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return { success: false, error: '结对不存在' };
    }

    let question = null;
    let questionTitle = '';
    let questionContent = '';
    let topicName = '';

    // 获取问题内容（如果question_id存在）
    if (pair.question_id) {
      question = await queries.getQuestionById(pair.question_id);
      if (question) {
        questionTitle = question.title || '';
        questionContent = question.content || '';
        // 获取topic名称
        if (question.topic_id) {
          const topicResult = await pool.query('SELECT name FROM topics WHERE id = $1', [question.topic_id]);
          if (topicResult.rows.length > 0) {
            topicName = topicResult.rows[0].name;
          }
        }
      }
    }

    // 如果没有获取到问题，使用通用的提示
    if (!questionTitle && !topicName) {
      topicName = '通用学习问题';
    }

    let templates = null;

    // 如果问题已有预生成的题目模板，直接使用
    if (question && question.pre_questions_template) {
      templates = question.pre_questions_template;
      console.log(`[SurveyService] 使用预生成的题目模板，共 ${templates.length} 道`);
    } else {
      // 否则实时生成
      console.log(`[SurveyService] 开始实时生成热身题目...`);
      const userPrompt = questionTitle && questionContent
        ? `请根据以下问题主题生成5道热身选择题：\n\n问题：${questionTitle}\n描述：${questionContent}`
        : `请根据${topicName || '通用学习主题'}生成5道启发性的热身选择题，帮助师生建立对学习内容的初步认识。`;

      const context = [
        { role: 'system', content: PRE_QUESTIONS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ];

      try {
        const result = await callAI(context, 0.5, 1500);
        console.log('[SurveyService] AI返回结果:', JSON.stringify(result, null, 2));

        if (!result.questions || !Array.isArray(result.questions)) {
          return { success: false, error: '生成题目格式错误' };
        }

        // 验证每个题目都有有效的选项
        const invalidQuestions = result.questions.filter(q => !q.options || !Array.isArray(q.options) || q.options.length < 2);
        if (invalidQuestions.length > 0) {
          console.error('[SurveyService] 部分题目缺少有效选项:', invalidQuestions);
          // 只保留有效题目
          result.questions = result.questions.filter(q => q.options && Array.isArray(q.options) && q.options.length >= 2);
          if (result.questions.length === 0) {
            return { success: false, error: '生成的题目都缺少有效选项' };
          }
          console.log('[SurveyService] 已过滤无效题目，剩余:', result.questions.length);
        }

        // 统一结构：确保每个模板都有 { question: { question, options, topic }, position }
        templates = result.questions.map((q, i) => ({
          question: { question: q.question, options: q.options, topic: q.topic },
          position: i + 1
        }));
        console.log('[SurveyService] 处理后的模板:', JSON.stringify(templates, null, 2));
      } catch (aiError) {
        console.error('[SurveyService] AI调用失败:', aiError);
        return { success: false, error: 'AI生成题目失败: ' + aiError.message };
      }
    }

    // 保存到数据库
    const savedQuestions = [];
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      // 确保题目数据是正确的嵌套结构
      const questionObj = t.question || t; // 如果是嵌套的使用t.question，否则用t本身
      const finalQuestion = {
        question: typeof questionObj === 'string' ? questionObj : (questionObj.question || JSON.stringify(questionObj)),
        options: questionObj.options || [],
        topic: questionObj.topic || topicName || ''
      };
      console.log('[SurveyService] 保存题目:', JSON.stringify(finalQuestion));
      const saved = await queries.survey.createPreQuestion({
        pair_id: pairId,
        question: finalQuestion,
        correct_index: -1, // 热身题目不提供正确答案
        position: t.position || i + 1
      });
      savedQuestions.push(saved);
    }

    console.log(`[SurveyService] 生成了 ${savedQuestions.length} 道热身题目`);
    return { success: true, questions: savedQuestions };

  } catch (error) {
    console.error('[SurveyService] 生成热身题目失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 生成对话后问卷
 * @param {number} pairId - 结对ID
 * @returns {Object} 生成结果 {success, survey}
 */
async function generatePostSurvey(pairId) {
  try {
    // 获取结对信息
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return { success: false, error: '结对不存在' };
    }

    // 获取热身题目（用于原题复用）
    const preQuestions = await queries.survey.getPreQuestionsByPairId(pairId);

    // 获取对话总结
    const summaries = await queries.conversationSummaries.getByPairId(pairId);
    const summary = summaries.find(s => s.round_id === null) || summaries[0];

    // 获取对话内容用于生成新题
    const messages = await queries.message.getByPairId(pairId);

    // 构建上下文
    let userContent = '请根据以下对话总结生成测试问卷：\n\n';

    if (summary) {
      userContent += `对话总结：${summary.summary_text}\n`;
      userContent += `关键学习点：${JSON.stringify(summary.key_learnings || [])}\n`;
    }

    userContent += '\n热身题目（从中选择2-3道作为原题）：\n';
    preQuestions.forEach((q, i) => {
      const qData = typeof q.question === 'string' ? JSON.parse(q.question) : q.question;
      userContent += `${i + 1}. ${qData.question}\n`;
    });

    userContent += '\n请生成8-10道知识题（含原题+新题）和9道固定评价题。';

    const context = [
      { role: 'system', content: POST_SURVEY_SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ];

    // 调用AI
    const result = await callAI(context, 0.5, 3000);

    if (!result.questions || !Array.isArray(result.questions)) {
      return { success: false, error: '生成问卷格式错误' };
    }

    // 构建完整问卷（知识题 + 固定组件）
    const knowledgeQuestions = result.questions.map((q, idx) => ({
      id: idx,
      ...q,
      is_fixed: false
    }));

    // 固定评价组件
    const fixedComponents = result.fixedComponents || {};
    const teacherEval = (fixedComponents.teacher_evaluation || []).map((q, idx) => ({
      id: knowledgeQuestions.length + idx,
      ...q,
      is_fixed: true,
      component_type: 'teacher_evaluation'
    }));

    const studentEval = (fixedComponents.student_evaluation || []).map((q, idx) => ({
      id: knowledgeQuestions.length + 3 + idx,
      ...q,
      is_fixed: true,
      component_type: 'student_evaluation'
    }));

    const teachingEval = (fixedComponents.teaching_evaluation || []).map((q, idx) => ({
      id: knowledgeQuestions.length + 6 + idx,
      ...q,
      is_fixed: true,
      component_type: 'teaching_evaluation'
    }));

    const allQuestions = [...knowledgeQuestions, ...teacherEval, ...studentEval, ...teachingEval];

    // 保存到数据库
    const survey = await queries.survey.createPostSurvey({
      pair_id: pairId,
      questions: allQuestions,
      fixed_components: fixedComponents,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
    });

    console.log(`[SurveyService] 生成了问卷，包含 ${knowledgeQuestions.length} 道知识题和 ${allQuestions.length - knowledgeQuestions.length} 道评价题`);

    // 向结对双方发送问卷提醒通知
    try {
      const queriesModule = require('../models/queries');
      const teacherId = pair.teacher_id;
      const studentId = pair.student_id;

      // 检查是否已经存在未处理的问卷提醒通知，避免重复发送
      const existingNotifications = await queriesModule.notification.getByUserId(teacherId, {
        type: 'survey_reminder',
        relatedId: pairId,
        status: 'pending'
      });

      // 只有在没有 existingNotifications 时才发送通知
      if (!existingNotifications || existingNotifications.length === 0) {
        // 发送问卷提醒给老师
        await queriesModule.notification.create(
          teacherId,
          'survey_reminder',
          pairId,
          '请填写课后问卷',
          `来自"${pair.question_title}"的课后问卷`
        );

        // 发送问卷提醒给学生
        await queriesModule.notification.create(
          studentId,
          'survey_reminder',
          pairId,
          '请填写课后问卷',
          `来自"${pair.question_title}"的课后问卷`
        );

        console.log(`[SurveyService] 已向结对 ${pairId} 双方发送问卷提醒通知`);
      } else {
        console.log(`[SurveyService] 结对 ${pairId} 已存在问卷提醒通知，跳过发送`);
      }
    } catch (notifError) {
      console.error('[SurveyService] 发送问卷提醒通知失败:', notifError);
    }

    return { success: true, survey };

  } catch (error) {
    console.error('[SurveyService] 生成问卷失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 批改问卷回答
 * @param {Object} survey - 问卷对象
 * @param {Array} answers - 用户回答 [{question_id, selected_index}]
 * @param {string} userRole - 用户角色 teacher/student
 * @returns {Object} 批改结果 {success, results, score, ai_review}
 */
async function gradeSurveyAnswers(survey, answers, userRole) {
  try {
    const questions = survey.questions;
    const knowledgeQuestions = questions.filter(q => !q.is_fixed);
    const fixedQuestions = questions.filter(q => q.is_fixed);

    // 构建批改上下文
    let gradingContent = '请批改以下回答：\n\n';

    // 知识题批改
    gradingContent += '【知识题】\n';
    for (const answer of answers) {
      if (answer.question_id >= knowledgeQuestions.length) continue; // 跳过评价题

      const question = knowledgeQuestions[answer.question_id];
      if (!question) continue;

      gradingContent += `题目${answer.question_id + 1}：${question.question}\n`;
      gradingContent += `用户答案：${question.options[answer.selected_index] || '无效答案'}\n`;
      gradingContent += `正确答案：${question.options[question.correct_index]}\n`;
      gradingContent += `---\n`;
    }

    // 评价题（不需要批改，直接记录）
    gradingContent += '\n【评价题】\n';
    gradingContent += '评价题为打分制，不需要AI批改，直接记录分数即可。';

    const context = [
      { role: 'system', content: GRADING_SYSTEM_PROMPT },
      { role: 'user', content: gradingContent }
    ];

    // 调用AI批改
    const result = await callAI(context, 0.3, 1500);

    // 构建完整结果
    const gradedResults = [];
    let correctCount = 0;

    for (const answer of answers) {
      if (answer.question_id >= knowledgeQuestions.length) {
        // 评价题
        gradedResults.push({
          question_id: answer.question_id,
          selected_index: answer.selected_index,
          is_correct: null, // 评价题不评判对错
          feedback: null,
          is_fixed: true
        });
      } else {
        // 知识题
        const aiResult = result.results?.find(r => r.question_id === answer.question_id);
        const isCorrect = aiResult?.is_correct || false;
        if (isCorrect) correctCount++;

        gradedResults.push({
          question_id: answer.question_id,
          selected_index: answer.selected_index,
          is_correct: isCorrect,
          feedback: aiResult?.feedback || '',
          is_fixed: false
        });
      }
    }

    // 计算得分
    const score = knowledgeQuestions.length > 0 ? correctCount / knowledgeQuestions.length : 0;

    return {
      success: true,
      results: gradedResults,
      score: score,
      ai_review: {
        results: result.results || [],
        total_score: `${correctCount}/${knowledgeQuestions.length}`,
        overall_comment: result.overall_comment || ''
      }
    };

  } catch (error) {
    console.error('[SurveyService] 批改失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 计算掌握度进度
 * @param {number} pairId - 结对ID
 * @returns {Object} 进度结果 {success, progress}
 */
async function calculateMasteryProgress(pairId) {
  try {
    // 获取热身回答和问卷回答
    const preResponses = await queries.survey.getPreResponsesByPairId(pairId);
    const postSurveys = await queries.survey.getPostSurveysByPairId(pairId);

    if (postSurveys.length === 0) {
      return { success: false, error: '暂无问卷' };
    }

    const survey = postSurveys[0];
    const postResponses = await queries.survey.getPostResponsesBySurveyId(survey.id);

    // 按主题统计
    const topicStats = new Map();

    // 热身正确率
    const preQuestions = await queries.survey.getPreQuestionsByPairId(pairId);
    for (const q of preQuestions) {
      const qData = typeof q.question === 'string' ? JSON.parse(q.question) : q.question;
      const topic = qData.topic || 'unknown';

      if (!topicStats.has(topic)) {
        topicStats.set(topic, { pre_total: 0, pre_correct: 0, post_total: 0, post_correct: 0 });
      }

      const stats = topicStats.get(topic);
      stats.pre_total++;

      // 检查是否有双方都正确的回答
      const responses = preResponses.filter(r => r.question_id === q.id);
      const correctResponses = responses.filter(r => r.is_correct);
      if (correctResponses.length >= 1) { // 至少一方正确即可（师生同题）
        stats.pre_correct += 0.5; // 各50%权重
      }
    }

    // 问卷正确率（取平均值）
    const knowledgeQuestions = survey.questions.filter(q => !q.is_fixed);
    for (const postResp of postResponses) {
      const answers = postResp.answers || [];
      for (const answer of answers) {
        if (answer.is_fixed) continue;

        const question = knowledgeQuestions[answer.question_id];
        if (!question) continue;

        const topic = question.topic || 'unknown';
        if (!topicStats.has(topic)) {
          topicStats.set(topic, { pre_total: 0, pre_correct: 0, post_total: 0, post_correct: 0 });
        }

        const stats = topicStats.get(topic);
        stats.post_total++;
        if (answer.is_correct) {
          stats.post_correct++;
        }
      }
    }

    // 计算并保存进度
    const progressList = [];
    for (const [topic, stats] of topicStats) {
      const preRate = stats.pre_total > 0 ? stats.pre_correct / stats.pre_total : 0;
      const postRate = stats.post_total > 0 ? stats.post_correct / stats.post_total : 0;
      const progress = postRate - preRate;

      await queries.survey.createOrUpdateMasteryProgress({
        pair_id: pairId,
        topic: topic,
        pre_correct_rate: preRate,
        post_correct_rate: postRate,
        pre_total: stats.pre_total,
        post_total: stats.post_total,
        progress: progress
      });

      progressList.push({
        topic,
        pre_correct_rate: preRate,
        post_correct_rate: postRate,
        progress: progress
      });
    }

    return { success: true, progress: progressList };

  } catch (error) {
    console.error('[SurveyService] 计算进度失败:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  generatePreQuestionTemplates,
  generatePreQuestions,
  generatePostSurvey,
  gradeSurveyAnswers,
  calculateMasteryProgress
};