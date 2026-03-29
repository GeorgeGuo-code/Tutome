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
  "summary": "整体审查总结，列出发现的问题类型和数量"
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
- **HTTP协议****：状态码使用、Header格式、请求/响应结构
- **框架特定**：Express、Koa等框架的正确使用方式
- **数据库操作**：SQL注入防护、连接管理、查询优化
- **错误处理**：try-catch使用、错误传播、用户友好错误消息
- **安全性**：输入验证、敏感信息保护、常见安全面洞
`;

class RoundReviewService {
  /**
   * 审查单个轮次
   * @param {Object} round - 轮次对象
   * @param {Object} pair - 结对信息
   * @returns {Object} 审查结果
   */
  async reviewRound(round, pair) {
    try {
      console.log(`[轮次审查] 开始审查轮次 ${round.id}`);

      // 构建简化的上下文（只包含当前轮）
      const context = this.buildRoundContext(round, pair);

      // 调用 AI 审查
      const judgment = await this.callAIForReview(context);

      console.log(`[轮次审查] 轮次 ${round.id} 审查完成，发现错误: ${judgment.hasError}`);

      return {
        roundId: round.id,
        success: true,
        judgment: judgment,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[轮次审查] 轮次 ${round.id} 审查失败:`, error);
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
   * 只包含当前轮次的学生提问和老师回答
   */
  buildRoundContext(round, pair) {
    const context = [];

    // 添加系统提示词
    context.push({ role: 'system', content: BASE_SYSTEM_PROMPT });

    // 添加学生提问
    context.push({
      role: 'user',
      content: `[student]: ${round.studentQuestion.content}`
    });

    // 如果有老师回答，添加到上下文
    if (round.teacherReply) {
      context.push({
        role: 'assistant',
        content: `[teacher]: ${round.teacherReply.content}`
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
