/**
 * 轮次审查服务
 * 负责对单个轮次进行 AI 审查
 */

const queries = require('../models/queries');
const { verifyJWT } = require('../middlewares/usersMiddleware');
const RoundDetectorClass = require('./roundDetector');
const roundDetector = new RoundDetectorClass();
require('dotenv').config({ path: './config/.env' });

const OpenAI = require('openai');
const openai = new OpenAI({
  baseURL: process.env.AI_BASE_URL,
  apiKey: process.env.AI_SECRET_KEY
});

// 基础系统提示词
const BASE_SYSTEM_PROMPT = `你是一个专业的代码审查助手，专门审查教学对话中的代码示例是否存在技术性错误或不符合最佳实践的地方。

## 你的核心职责
1. **识别知识性错误**：发现与事实、原理、最佳实践不符的内容
2. **跨领域覆盖**：不局限于某个特定领域，支持编程、科学、技术等
3. **提供准确判断**：给出明确结论和详细解释

## 问候语和简单对话处理
**重要**：如果对话内容是简单的问候、感谢、确认等礼貌用语（如"你好"、"谢谢"、"好的"、"ok"、"早上好"等），**不要报告错误**。

具体来说，以下情况**不应该**报告为错误：
- 单纯的问候语：你好、hello、hi、早上好、下午好、晚上好、晚安等
- 确认和感谢：谢谢、感谢、好的、收到、明白、ok、没问题等
- 简单的礼貌用语：辛苦了、可以、行吧等
- 只包含标点和表情符号的回复

只有当学生提出**技术性问题**、或者老师回复包含**技术内容**时，才进行错误审查。

## 输出格式（严格 JSON）
{
  "hasError": boolean,
  "errorDetails": [
    {
      "speaker": "teacher" | "student",
      "content": "有问题的内容片段（精确引用）",
      "errorType": "错误类型（如：Header处理错误、Token验证缺失、参数化缺失等）",
      "correction": "正确的代码实现",
      "explanation": "详细解释为什么这是错误的，引用权威资料或最佳实践",
      "severity": "critical" | "high" | "medium" | "low",
      "confidence": number (0-1)
    }
  ],
  "overallConfidence": number (0-1),
  "summary": "整体审查总结，列出发现的问题类型和数量",
  "keyPoints": ["本轮涉及的核心知识点1", "知识点2", ...]
}

## 严重程度定义
- **critical**：会导致严重后果（安全漏洞、核心概念错误）
- **high**：会明显影响功能或理解
- **medium**：存在错误但影响有限
- **low**：轻微问题或边缘情况

## 关键指令
- **只审查本轮对话**：关注学生提问和老师回答
- **不要遗漏任何潜在问题**：宁可误判也不要漏判
（但不要对问候语和礼貌用语进行误判！）
- **明确指出错误行**：引用具体的代码行或片段
- **提供可执行的修复代码**：不仅是描述，要给出能直接使用的正确代码
- **置信度反映你的确定程度**：如果不确定，降低confidence值

## 重点审查领域
- **认证与授权**：JWT token获取方式、Header处理、Token验证流程
- **HTTP协议**：状态码使用、Header格式、请求/响应结构
- **框架特定**：Express、Koa等框架的正确使用方式
- **数据库操作**：SQL注入防护、连接管理、查询优化
- **错误处理**：try-catch使用、错误传播、用户友好错误消息
- **安全性**：输入验证、敏感信息保护、常见安全面洞

## 重要职责
- **不要概括内容**：你的核心任务是"检测错误"和"提取知识点"，而不是总结对话内容
- **提取关键知识点**：在 keyPoints 字段中列出本轮涉及的核心技术概念、知识点（2-5个）
- **保持简洁**：keyPoints 应该是简短的知识点关键词或短语
`;

class RoundReviewService {
  /**
   * 审查单个轮次
   * @param {Object} round - 轮次对象
   * @param {Object} pair - 结对信息
   * @param {number} userId - 触发审查的用户ID
   * @returns {Object} 审查结果
   */
  async reviewRound(round, pair, userId) {
    try {
      console.log(`[轮次审查] ==================================================`);
      console.log(`[轮次审查] 开始审查轮次 ${round.id}`);
      console.log(`[轮次审查] 结对 ID: ${pair.id}`);
      console.log(`[轮次审查] 学生消息 ID: ${round.studentMessageId}`);
      console.log(`[轮次审查] 老师消息 ID: ${round.teacherMessageId}`);

      // 构建简化的上下文（只包含当前轮）
      const context = this.buildRoundContext(round, pair);

      // 调用 AI 审查
      console.log(`[轮次审查] 开始调用 AI...`);
      const judgment = await this.callAIForReview(context);

      console.log(`[轮次审查] 轮次 ${round.id} 审查完成`);
      console.log(`[轮次审查] ─────────────────────────────────`);
      console.log(`[轮次审查] 是否发现错误: ${judgment.hasError ? '是' : '否'}`);
      console.log(`[轮次审查] 整体置信度: ${judgment.overallConfidence?.toFixed(2) || 'N/A'}`);
      console.log(`[轮次审查] 审查总结: ${judgment.summary || '无'}`);
      console.log(`[轮次审查] 关键知识点: ${(judgment.keyPoints || []).join(', ') || '无'}`);

      // 详细输出错误信息
      if (judgment.hasError && judgment.errorDetails && judgment.errorDetails.length > 0) {
        console.log(`[轮次审查] 发现 ${judgment.errorDetails.length} 个错误：`);
        judgment.errorDetails.forEach((error, index) => {
          console.log(`[轮次审查]   错误 ${index + 1}:`);
          console.log(`[轮次审查]     发言者: ${error.speaker === 'teacher' ? '老师' : (error.speaker === 'student' ? '学生' : error.speaker)}`);
          const errorType = error.errorType || error.error_type || '未知';
          const errorContent = error.content || error.issue || '';
          const errorCorrection = error.correction || error.correct_implementation || '';
          const errorExplanation = error.explanation || '';

          console.log(`[轮次审查]     错误类型: ${errorType}`);
          console.log(`[轮次审查]     问题内容: ${errorContent.substring(0, 100) || '无'}${errorContent.length > 100 ? '...' : ''}`);
          console.log(`[轮次审查]     修正建议: ${errorCorrection.substring(0, 100) || '无'}${errorCorrection.length > 100 ? '...' : ''}`);
          if (errorExplanation) {
            console.log(`[轮次审查]     详细说明: ${errorExplanation.substring(0, 150) || '无'}${errorExplanation.length > 150 ? '...' : ''}`);
          }
          console.log(`[轮次审查]     严重程度: ${error.severity || '未定义'}`);
          console.log(`[轮次审查]     置信度: ${error.confidence?.toFixed(2) || 'N/A'}`);
          console.log(`[轮次审查]     ────`);
        });
      } else if (!judgment.hasError) {
        console.log(`[轮次审查] ✅ 本轮次未发现明显错误`);
      }

      // 存储审查结果到数据库
      console.log(`[轮次审查] 正在保存到数据库...`);
      await queries.roundReviews.createOrUpdate(
        pair.id,
        round.id,
        round.studentMessageId || null,
        round.teacherMessageId || null,
        judgment,
        userId
      );
      console.log(`[轮次审查] ✅ 保存成功`);
      console.log(`[轮次审查] ==================================================`);

      return {
        roundId: round.id,
        success: true,
        judgment: judgment,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[轮次审查] 轮次 ${round.id} 审查失败:`, error);
      console.error(`[轮次审查] 错误堆栈:`, error.stack);
      return {
        roundId: round.id,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 构建轮次审查的简化上下文
   * 包含当前轮次的所有学生消息和老师回复（支持连续追问和连续回答）
   */
  buildRoundContext(round, pair) {
    const context = [];

    // 添加系统提示词
    context.push({ role: 'system', content: BASE_SYSTEM_PROMPT });

    // 构建学生消息内容（含图片占位符）
    const studentMessages = round.studentMessages && round.studentMessages.length > 0
      ? round.studentMessages
      : (round.studentQuestion ? [round.studentQuestion] : []);

    const studentContent = studentMessages.map(m => {
      const text = m.content || '';
      return m.image_url ? `${text}\n【图片，${m.image_url}】` : text;
    }).join('\n');

    // 构建老师回复内容（含图片占位符）
    const teacherMessages = round.teacherReplies && round.teacherReplies.length > 0
      ? round.teacherReplies
      : (round.teacherReply ? [round.teacherReply] : []);

    const teacherContent = teacherMessages.map(m => {
      const text = m.content || '';
      return m.image_url ? `${text}\n【图片，${m.image_url}】` : text;
    }).join('\n');

    // 添加学生提问
    if (studentContent) {
      context.push({
        role: 'user',
        content: `[student]: ${studentContent}`
      });
    }

    // 如果有老师回答，添加到上下文
    if (teacherContent) {
      context.push({
        role: 'assistant',
        content: `[teacher]: ${teacherContent}`
      });
    } else {
      // 老师未回答，添加提示
      context.push({
        role: 'system',
        content: '注意：老师尚未回答这个问题，请重点审查学生提问内容中可能存在的问题。'
      });
    }

    return context;
  }

  /**
   * 构建带滑动窗口上下文的轮次审查
   * 包含当前轮次以及前 N 轮作为上下文
   * @param {Object} round - 当前轮次对象
   * @param {Object} pair - 结对信息
   * @param {Array} allRounds - 所有轮次数组
   * @returns {Array} 审查上下文数组
   */
  buildRoundContextWithWindow(round, pair, allRounds) {
    const context = [];
    context.push({ role: 'system', content: BASE_SYSTEM_PROMPT });

    // 获取当前轮次的索引
    const currentIndex = allRounds.findIndex(r => r.id === round.id);

    // 获取前 5 轮作为上下文
    const windowSize = 5;
    const startIndex = Math.max(0, currentIndex - windowSize);
    const previousRounds = allRounds.slice(startIndex, currentIndex);

    // 添加前几轮的简要上下文
    if (previousRounds.length > 0) {
      const contextSummary = previousRounds.map((r, i) => {
        const studentMsgs = r.studentMessages || (r.studentQuestion ? [r.studentQuestion] : []);
        const teacherMsgs = r.teacherReplies || (r.teacherReply ? [r.teacherReply] : []);

        const studentText = studentMsgs.map(m => {
          const text = m.content || '';
          return m.image_url ? `${text}\n【图片，${m.image_url}】` : text;
        }).join('\n');

        const teacherText = teacherMsgs.map(m => {
          const text = m.content || '';
          return m.image_url ? `${text}\n【图片，${m.image_url}】` : text;
        }).join('\n');

        return `[前几轮-${i+1}]\n学生: ${studentText}\n老师: ${teacherText}`;
      }).join('\n\n');

      context.push({
        role: 'system',
        content: `## 最近的 ${previousRounds.length} 轮对话（上下文参考）\n${contextSummary}`
      });
    }

    // 添加当前轮次的完整内容（审查目标）
    const currentStudentMsgs = round.studentMessages || (round.studentQuestion ? [round.studentQuestion] : []);
    const currentTeacherMsgs = round.teacherReplies || (round.teacherReply ? [round.teacherReply] : []);

    const studentContent = currentStudentMsgs.map(m => {
      const text = m.content || '';
      return m.image_url ? `${text}\n【图片，${m.image_url}】` : text;
    }).join('\n');

    const teacherContent = currentTeacherMsgs.map(m => {
      const text = m.content || '';
      return m.image_url ? `${text}\n【图片，${m.image_url}】` : text;
    }).join('\n');

    context.push({ role: 'user', content: `[student]: ${studentContent}` });
    if (teacherContent) {
      context.push({ role: 'assistant', content: `[teacher]: ${teacherContent}` });
    }

    context.push({
      role: 'system',
      content: '## 当前任务\n请重点审查上述最新一轮对话，检测错误并提取关键知识点。'
    });

    return context;
  }

  /**
   * 调用 AI 模型进行审查
   */
  async callAIForReview(context) {
    const model = process.env.AI_MODEL || 'deepseek-chat';

    try {
      const response = await openai.chat.completions.create({
        model: model,
        messages: context,
        temperature: 0.3,
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

        return JSON.parse(jsonContent.trim());
      } catch (parseError) {
        // 如果解析失败，返回原始内容
        return {
          hasError: false,
          errorDetails: [],
          overallConfidence: 0,
          summary: 'AI 响应解析失败',
          rawResponse: content
        };
      }
    } catch (error) {
      console.error('[AI 调用] 失败:', error);
      throw error;
    }
  }
}

module.exports = new RoundReviewService();
