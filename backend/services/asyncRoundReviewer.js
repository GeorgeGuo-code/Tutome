/**
 * 异步轮次审查器 - 滑动窗口渐进审查模式
 * 每当老师完成一轮回答时立即审查，使用最近N轮作为上下文
 */

const queries = require('../models/queries');
const RoundDetectorClass = require('../services/roundDetector');
const RoundDetector = new RoundDetectorClass();
const RoundReviewService = require('../services/roundReviewService');

console.log('[异步轮次审查器] 模块已加载（滑动窗口模式）');

// 滑动窗口大小（作为上下文的轮次数）
const WINDOW_SIZE = 5;

/**
 * 触发轮次审查任务（滑动窗口模式）
 * 每当老师完成一轮回答时立即审查
 * @param {number} pairId - 结对ID
 * @param {number} senderId - 发送者ID
 */
async function triggerRoundReview(pairId, senderId) {
  try {
    console.log('[滑动窗口审查] ============');
    console.log('[滑动窗口] 触发轮次审查任务');
    console.log('[滑动窗口] 结对ID:', pairId);
    console.log('[滑动窗口] 发送者ID:', senderId);

    // 1. 获取结对信息
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      console.log('[滑动窗口] 结对不存在，跳过审查');
      return { success: false, reason: '结对不存在' };
    }

    // 只有学生发送消息才可能触发轮次审查（老师刚回答完）
    if (senderId === pair.teacher_id) {
      console.log('[滑动窗口] 发送者是老师，不触发轮次审查');
      return { success: false, reason: '发送者是老师' };
    }

    // 2. 获取结对的所有消息
    const messages = await queries.message.getByPairId(pairId);
    if (!messages || messages.length < 2) {
      console.log('[滑动窗口] 消息不足，跳过审查');
      return { success: false, reason: '消息不足' };
    }

    console.log('[滑动窗口] 找到', messages.length, '条消息');

    // 3. 检测所有轮次
    const rounds = RoundDetector.detectRounds(messages, pair);
    console.log('[滑动窗口] 检测到', rounds.length, '个轮次');

    // 4. 获取已审查的轮次
    const existingReviews = await queries.roundReviews.getByPairId(pairId);
    const reviewedRoundIds = new Set(existingReviews.map(r => r.round_id));

    console.log('[滑动窗口] 已审查:', reviewedRoundIds.size, '个轮次');

    // 5. 从后往前找，找到最新完成且未审查的轮次
    for (let i = rounds.length - 1; i >= 0; i--) {
      const round = rounds[i];

      if (!round.complete || !round.teacherReply) {
        continue; // 跳过未完成的轮次
      }

      if (reviewedRoundIds.has(round.id)) {
        continue; // 跳过已审查的轮次
      }

      // 找到需要审查的轮次
      console.log('[滑动窗口] 找到需要审查的轮次:', round.id);

      // 使用滑动窗口上下文审查
      const context = RoundReviewService.buildRoundContextWithWindow(round, pair, rounds);

      // 调用 AI 审查
      console.log('[滑动窗口] 开始调用 AI...');
      const judgment = await RoundReviewService.callAIForReview(context);

      console.log('[滑动窗口] 轮次', round.id, '审查完成');
      console.log('[滑动窗口] 是否发现错误:', judgment.hasError ? '是' : '否');
      console.log('[滑动窗口] 置信度:', judgment.overallConfidence?.toFixed(2) || 'N/A');
      console.log('[滑动窗口] 关键知识点:', (judgment.keyPoints || []).join(', ') || '无');

      // 保存审查结果
      await queries.roundReviews.createOrUpdate(
        pair.id,
        round.id,
        round.studentMessageId || null,
        round.teacherMessageId || null,
        judgment,
        senderId
      );

      console.log('[滑动窗口] ✅ 审查结果已保存');
      console.log('[滑动窗口] ============');

      return {
        success: true,
        reviewedCount: 1,
        roundId: round.id
      };
    }

    console.log('[滑动窗口] 无可审查轮次');
    console.log('[滑动窗口] ============');

    return {
      success: false,
      reason: '无可审查轮次'
    };
  } catch (error) {
    console.error('[滑动窗口] 触发失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 总总结系统提示词（整对话总结）
const CONVERSATION_SUMMARY_PROMPT = `你是一个教学对话总结助手，负责提取和归纳对话内容。

## 你的核心职责
1. **概括对话内容**：客观描述对话主题、涉及的知识领域、讨论的主要问题
2. **汇总问题**：将轮次审查发现的错误进行概括性总结
3. **提取关键知识点**：提炼整个对话涉及的核心知识点
4. **推荐学习资源**：基于关键知识点，提供权威可靠的进一步学习链接

## 输入格式
你会收到：
1. 完整对话内容（学生和老师的所有消息）
2. 所有轮次提取的关键知识点
3. 统计信息（statistics）：
   - totalRounds: 总轮次数
   - roundsWithError: 发现错误的轮次
   - errorCount: 错误总数
   - averageConfidence: 平均置信度（0-1）
4. 有错误的轮次详情（包含错误类型和严重程度）

## 输出格式（严格 JSON）
{
  "summary_text": "100-200字的内容概括，聚焦对话主题、涉及的要点、知识领域，避免价值判断",
  "key_learnings": ["核心知识点1", "核心知识点2"],
  "problem_count": 3,
  "problem_summary": ["问题概括1", "问题概括2"],
  "related_links": [
    {"title": "MDN Web Docs", "url": "https://developer.mozilla.org/...", "description": "权威的 Web 开发文档"}
  ]
}

## 重要规则
1. **summary_text 要求**：
   - 字数控制在 100-200 字
   - 侧重内容概括，而非评价
   - 避免使用"优秀"、"糟糕"、"需要改进"等价值判断词汇
   - 应该说明对话讨论了什么主题，涉及哪些知识领域

2. **problem_count 和 problem_summary**：
   - problem_count 必须等于实际发现的错误数量（来自 statistics.errorCount）
   - problem_summary 应该是对错误的概括性描述，每条一句话即可
   - 如果没有错误，problem_count 为 0，problem_summary 为空数组

3. **related_links 要求**：
   - 根据关键知识点推荐 2-5 个权威学习链接
   - 优先推荐：官方文档、知名教程平台（MDN、W3Schools、菜鸟教程等）
   - 每个 link 包含 title（网站/文档名称）、url（完整链接）、description（简短说明）
   - 确保链接是真实存在的权威来源

4. **基于真实内容**：
   - 使用提供的完整对话内容进行概括
   - 不要编造对话中未涉及的内容
   - key_learnings 应该与轮次提取的关键点一致或相近
`;

/**
 * 异步生成对话总总结（基于完整对话和轮次关键点）
 * @param {number} pairId - 结对ID
 */
async function generateConversationSummaryAsync(pairId) {
  try {
    console.log('[总总结器] ============');
    console.log('[总总结器] 开始生成总总结（基于完整对话）...');
    console.log('[总总结器] 结对ID:', pairId);

    // 延迟1秒，确保轮次审查结果已保存
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 1. 获取结对信息
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      console.log('[总总结器] 结对不存在，跳过总结');
      return { success: false, reason: '结对不存在' };
    }

    // 2. 获取完整对话内容
    const messages = await queries.message.getByPairId(pairId);
    if (!messages || messages.length === 0) {
      console.log('[总总结器] 无对话内容，跳过总结');
      return { success: false, reason: '无对话内容' };
    }

    // 3. 获取所有轮次审查结果和关键点
    const roundReviews = await queries.roundReviews.getByPairId(pairId);
    if (!roundReviews || roundReviews.length === 0) {
      console.log('[总总结器] 无轮次审查结果，跳过总结');
      return { success: false, reason: '无轮次审查结果' };
    }

    console.log('[总总结器] 找到', roundReviews.length, '个轮次审查结果');

    // 收集所有轮次的关键知识点
    const allKeyPoints = roundReviews.flatMap(r => r.key_points || []);
    console.log('[总总结器] 关键知识点:', allKeyPoints.join(', ') || '无');

    // 4. 构建完整对话上下文
    const conversationText = messages.map(m => {
      const role = m.sender_id === pair.teacher_id ? '老师' : '学生';
      return `[${role}]: ${m.content}`;
    }).join('\n\n');

    // 5. 收集统计信息
    const stats = {
      totalRounds: roundReviews.length,
      roundsWithError: roundReviews.filter(r => r.has_error).length,
      errorCount: roundReviews.reduce((sum, r) =>
        sum + (r.error_details && Array.isArray(r.error_details) ? r.error_details.length : 0), 0),
      averageConfidence: roundReviews.length > 0
        ? roundReviews.reduce((sum, r) => sum + (parseFloat(r.overall_confidence) || 0), 0) / roundReviews.length
        : 0
    };

    console.log('[总总结器] 统计信息:');
    console.log('[总总结器]   总轮次数:', stats.totalRounds);
    console.log('[总总结器]   发现错误的轮次:', stats.roundsWithError);
    console.log('[总总结器]   错误总数:', stats.errorCount);
    console.log('[总总结器]   平均置信度:', stats.averageConfidence.toFixed(2));

    // 6. 构建有错误的轮次详情
    const roundsWithError = roundReviews
      .filter(r => r.has_error)
      .map(r => ({
        roundId: r.round_id,
        errors: (r.error_details || []).map(err => ({
          errorType: err.errorType || err.error_type || '未知',
          severity: err.severity || 'unknown'
        }))
      }));

    // 7. 构建总结上下文
    const summaryContext = buildConversationSummaryContext(
      conversationText,
      allKeyPoints,
      stats,
      roundsWithError
    );

    // 8. 调用 AI 生成总结
    console.log('[总总结器] 开始调用 AI 生成总结...');
    const summaryResult = await callAIForConversationSummary(summaryContext);

    if (!summaryResult.success) {
      console.error('[总总结器] AI 生成失败:', summaryResult.error);
      return {
        success: false,
        error: summaryResult.error
      };
    }

    console.log('[总总结器] ✅ AI 总总结生成成功');

    const summaryData = summaryResult.data;

    // 9. 保存总结结果到数据库（round_id = null 表示总总结）
    const saveData = {
      summary_text: summaryData.summary_text || '',
      key_learnings: summaryData.key_learnings || [],
      problem_count: summaryData.problem_count || 0,
      problem_summary: summaryData.problem_summary || [],
      related_links: summaryData.related_links || [],
      overall_rating: null,  // 预留，暂不生成
      statistics: stats
    };

    await queries.conversationSummaries.saveOrUpdate(pairId, saveData, null);

    console.log('[总总结器] ✅ 总总结已保存到数据库');
    console.log('[总总结器] 内容概括:', (saveData.summary_text || '无').substring(0, 80) + '...');
    console.log('[总总结器] 问题数量:', saveData.problem_count);
    console.log('[总总结器] 关键知识点数:', (saveData.key_learnings || []).length);
    console.log('[总总结器] 相关链接数:', (saveData.related_links || []).length);
    console.log('[总总结器] ============');

    return {
      success: true,
      data: saveData
    };
  } catch (error) {
    console.error('[总总结器] 生成失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 构建总总结上下文（基于完整对话和轮次关键点）
 */
function buildConversationSummaryContext(conversationText, keyPoints, stats, roundsWithError) {
  const context = [];

  // 1. 添加系统提示词
  context.push({ role: 'system', content: CONVERSATION_SUMMARY_PROMPT });

  // 2. 添加统计信息
  context.push({
    role: 'system',
    content: `对话统计：共${stats.totalRounds}轮，${stats.roundsWithError}轮发现错误，总共${stats.errorCount}个错误，平均置信度${(stats.averageConfidence * 100).toFixed(1)}%`
  });

  // 3. 添加完整对话内容
  context.push({
    role: 'system',
    content: `## 完整对话内容\n${conversationText}`
  });

  // 4. 添加关键知识点
  if (keyPoints && keyPoints.length > 0) {
    context.push({
      role: 'system',
      content: `## 各轮提取的关键知识点\n${keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')}`
    });
  }

  // 5. 如果有错误的轮次，添加错误详情
  if (roundsWithError && roundsWithError.length > 0) {
    const errorSummaryText = roundsWithError.map(r => {
      const errorDetails = r.errors || [];
      const errorTypes = errorDetails.map(e => `${e.errorType} (${e.severity})`).join(', ');
      return `[轮次 ${r.roundId}] 发现错误: ${errorTypes}`;
    }).join('\n');

    context.push({
      role: 'system',
      content: `## 有错误的轮次详情\n${errorSummaryText}`
    });
  }

  // 6. 添加任务说明
  context.push({
    role: 'user',
    content: '请基于以上完整对话内容、关键知识点和统计信息，生成教学总总结。'
  });

  return context;
}

/**
 * 调用 AI 生成总总结
 */
async function callAIForConversationSummary(context) {
  const OpenAI = require('openai');
  const openai = new OpenAI({
    baseURL: process.env.AI_BASE_URL,
    apiKey: process.env.AI_SECRET_KEY
  });

  const model = process.env.AI_MODEL || 'deepseek-chat';

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: context,
      temperature: 0.5,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;

    // 尝试解析 JSON 响应
    try {
      let jsonContent = content.trim();

      // 移除可能的 markdown 代码块标记
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.slice(7);
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.slice(3);
      }
      if (jsonContent.endsWith('```')) {
        jsonContent = jsonContent.slice(0, -3);
      }

      const parsed = JSON.parse(jsonContent.trim());
      return {
        success: true,
        data: parsed
      };
    } catch (parseError) {
      console.error('[总总结器] AI 响应解析失败:', parseError);
      return {
        success: false,
        error: 'AI 响应解析失败',
        rawResponse: content
      };
    }
  } catch (error) {
    console.error('[总总结器] AI 调用失败:', error);
    throw error;
  }
}

module.exports = {
  triggerRoundReview,
  generateConversationSummaryAsync
};
