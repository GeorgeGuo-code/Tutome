const OpenAI = require('openai');
const queries = require('../models/queries');
const DomainDetector = require('../services/domainDetector');
const RoundDetectorClass = require('../services/roundDetector');
const RoundDetector = new RoundDetectorClass();
const RoundReviewService = require('../services/roundReviewService');
require('dotenv').config({ path: './config/.env' });

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  baseURL: process.env.AI_BASE_URL,
  apiKey: process.env.AI_SECRET_KEY
});

// ==================== 系统提示词 ====================
const SYSTEM_PROMPT = `你是一个专业的知识审查助手，负责识别对话中的知识性错误（包括但不限于代码、科学、技术等各领域）。

## 问候语和简单对话处理
**重要**：如果对话内容是简单的问候、感谢、确认等礼貌用语，**不要报告错误**。

具体来说，以下情况**不应该**报告为错误：
- 单纯的问候语：你好、hello、hi、早上好、下午好、晚上好、晚安等
- 确认和感谢：谢谢、感谢、好的、收到、明白、ok、没问题等
- 简单的礼貌用语：辛苦了、可以、行吧等
- 只包含标点和表情符号的回复

只有当对话中包含**技术性内容**、**科学性知识**或**可验证的事实信息**时，才进行错误审查。

## 你的核心职责
1. **识别知识性错误**：发现与事实、原理、最佳实践不符的内容
2. **跨领域覆盖**：不局限于某个特定领域，支持编程、科学、技术等
3. **模块化审查**：根据内容类型调用相应的审查模块
4. **提供准确判断**：给出明确结论和详细解释

## 审查模块（根据对话内容动态调用）

### 模块 1：编程知识审查
**触发条件**：对话包含代码示例、编程概念、技术实现

**审查内容**：
- 代码语法和逻辑
- API 使用规范
- 最佳实践违反
- 安全漏洞
- 语言特定规范（JavaScript、Python、C、Java 等）

**语言覆盖**：
- JavaScript / TypeScript / Node.js
- Python
- C / C++
- Java
- Go
- Rust
- 其他编程语言

**错误类型**：
- 语法错误
- 逻辑错误
- API 使用错误
- 安全漏洞
- 性能问题
- 最佳实践违反

### 模块 2：科学知识审查
**触发条件**：对话涉及科学原理、公式、定律、数据

**审查内容**：
- 物理定律和公式
- 化学反应和原理
- 数学公式和证明
- 生物概念和规律
- 地理天文知识
- 其他科学领域知识

**错误类型**：
- 概念定义错误
- 公式使用错误
- 定律引用错误
- 数据准确性问题
- 逻辑推理错误

### 模块 3：技术知识审查
**触发条件**：对话涉及技术概念、工具使用、系统原理

**审查内容**：
- 技术概念准确性
- 工具使用方式
- 系统架构理解
- 协议和标准
- 行业最佳实践

**错误类型**：
- 概念误解
- 操作方式错误
- 架构设计问题
- 标准违反

### 模块 4：通用知识审查
**触发条件**：不属于上述模块但涉及可验证的知识

**审查内容**：
- 事实准确性
- 逻辑一致性
- 因果关系
- 常识性知识

**错误类型**：
- 事实错误
- 逻辑矛盾
- 归纳错误
- 概括不当

## 审查方法论

### 步骤 1：内容分析
1. 识别对话涉及的知识领域
2. 提取关键概念和术语
3. 检测代码或公式片段
4. 分析上下文语义

### 步骤 2：模块选择
根据内容分析结果，选择合适的审查模块：
- 如果包含代码 → 编程知识审查模块
- 如果涉及科学概念 → 科学知识审查模块
- 如果涉及技术概念 → 技术知识审查模块
- 其他 → 通用知识审查模块

### 步骤 3：执行审查
调用选定的审查模块，执行具体审查逻辑。

### 步骤 4：知识库验证
1. 提取关键查询词
2. 检索权威知识库（Wikipedia、官方文档等）
3. 对比对话内容与权威资料
4. 识别不一致之处

### 步骤 5：结果整合
1. 汇总各模块发现的问题
2. 按严重程度排序
3. 生成综合解释
4. 提供修正建议

## 输出格式（严格 JSON）
{
  "hasError": boolean,
  "errorDetails": [
    {
      "speaker": "teacher" | "student",
      "content": "有问题的内容片段（精确引用）",
      "errorType": "错误类型（如：概念错误、公式错误、语法错误、API使用错误等）",
      "correction": "正确的知识或实现",
      "explanation": "详细解释为什么这是错误的，引用权威资料或最佳实践",
      "domain": "知识领域（programming|science|technology|general）",
      "severity": "critical" | "high" | "medium" | "low",
      "confidence": number (0-1)
    }
  ],
  "overallConfidence": number (0-1),
  "summary": "整体审查总结，列出发现的问题类型、数量和涉及的领域"
}

## 严重程度定义

- **critical**：会导致严重后果（安全漏洞、核心概念错误）
- **high**：会明显影响功能或理解
- **medium**：存在错误但影响有限
- **low**：轻微问题或边缘情况

## 关键指令
1. **不预设领域**：自动识别对话内容属于哪个领域
2. **全面覆盖**：编程只是子模块之一，不要忽略其他领域
3. **精确引用**：准确指出错误出现的位置和内容
4. **提供依据**：每个错误判断都要有明确依据
5. **多语言支持**：编程模块要支持多种语言，不局限于 JavaScript/Node.js
6. **谨慎判断**：对于不确定的内容，降低置信度

## 编程模块子规范

### JavaScript / TypeScript
- 语法规范（ES6+、TypeScript 类型）
- API 使用（Browser API、Node.js API）
- 框架最佳实践（React、Vue、Express 等）
- 异步处理（Promise、async/await）
- 错误处理模式

### Python
- PEP 8 代码规范
- Pythonic 最佳实践
- 库的正确使用
- 异常处理模式

### C / C++
- 指针和内存管理
- 语法规范
- 标准库使用
- 常见陷阱

### Java
- Java 命名规范
- 集合框架使用
- 异常处理
- 设计模式应用

## 知识库使用
根据识别的领域，查询相应的权威资料：
- 编程：官方文档、最佳实践指南
- 科学：学术资料、教科书、权威网站
- 技术：官方文档、行业标准
- 通用：维基百科、权威新闻来源`;

// ==================== 权威知识检索（组合方案） ====================

/**
 * 从对话中提取关键词用于搜索
 * @param {Array} messages - 聊天记录
 * @returns {string} 提取的关键词
 */
function extractKeywords(messages) {
  // 简单提取：取最后几条消息的关键内容
  const recentMessages = messages.slice(-5);
  const text = recentMessages.map(m => m.content).join(' ');
  
  // 移除常见无意义词，提取关键词
  const stopWords = ['的', '是', '在', '了', '和', '有', '我', '你', '他', '她', '它', '这', '那', '什么', '怎么', '为什么', '如何'];
  let keywords = text;
  stopWords.forEach(word => {
    keywords = keywords.replace(new RegExp(word, 'g'), ' ');
  });
  
  // 限制长度
  return keywords.trim().slice(0, 200);
}

/**
 * 调用 Wikipedia API 搜索（免费）
 * @param {string} query - 搜索关键词
 * @returns {Object} { found: boolean, content: string }
 */
async function searchWikipedia(query) {
  try {
    // 1. 搜索相关页面
    const searchUrl = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&origin=*`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.query?.search?.length) {
      return { found: false, content: '' };
    }
    
    // 2. 获取前两个页面的内容
    const pageTitles = searchData.query.search.slice(0, 2).map(item => item.title);
    const results = [];
    
    for (const title of pageTitles) {
      const contentUrl = `https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(title)}&format=json&origin=*`;
      const contentResponse = await fetch(contentUrl);
      const contentData = await contentResponse.json();
      
      const pages = contentData.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        const extract = pages[pageId]?.extract;
        if (extract && extract !== '...') {
          results.push({
            title: title,
            content: extract.slice(0, 800), // 限制长度
            source: `https://zh.wikipedia.org/wiki/${encodeURIComponent(title)}`
          });
        }
      }
    }
    
    if (results.length === 0) {
      return { found: false, content: '' };
    }
    
    // 3. 格式化输出
    const content = results.map((r, i) => 
      `[维基百科 - ${r.title}]\n${r.content}\n来源: ${r.source}`
    ).join('\n\n');
    
    return { found: true, content };
  } catch (error) {
    console.error('Wikipedia 搜索失败:', error);
    return { found: false, content: '', error: error.message };
  }
}

/**
 * 调用 Perplexity API 搜索（作为补充）
 * @param {string} query - 搜索关键词
 * @returns {Object} { found: boolean, content: string }
 */
async function searchPerplexity(query) {
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!perplexityApiKey) {
    return { found: false, content: '', error: 'Perplexity API Key 未配置' };
  }
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: '请提供准确、权威的科学知识。如果信息有来源，请标注来源。'
          },
          {
            role: 'user',
            content: `请解释以下科学概念或问题，提供准确的信息：${query}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.2
      })
    });
    
    if (!response.ok) {
      throw new Error(`Perplexity API 请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      return { 
        found: true, 
        content: `[Perplexity AI 搜索]\n${content}` 
      };
    }
    
    return { found: false, content: '' };
  } catch (error) {
    console.error('Perplexity 搜索失败:', error);
    return { found: false, content: '', error: error.message };
  }
}

/**
 * 组合检索：Wikipedia（免费）+ Perplexity（补充）
 * @param {Array} messages - 聊天记录
 * @returns {string} 检索结果
 */
async function queryKnowledgeBase(messages) {
  // 提取关键词
  const keywords = extractKeywords(messages);
  
  if (!keywords) {
    return '【知识检索】对话内容较短，无法提取有效关键词。';
  }
  
  const results = [];
  
  // 1. 首先尝试 Wikipedia（免费）
  console.log('[知识检索] 正在搜索 Wikipedia...');
  const wikiResult = await searchWikipedia(keywords);
  
  if (wikiResult.found) {
    results.push(wikiResult.content);
    console.log('[知识检索] Wikipedia 找到相关内容');
  } else {
    console.log('[知识检索] Wikipedia 未找到相关内容');
  }
  
  // 2. 如果 Wikipedia 结果不够充分，调用 Perplexity 补充
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
  if (perplexityApiKey && (!wikiResult.found || wikiResult.content.length < 500)) {
    console.log('[知识检索] 正在调用 Perplexity 补充搜索...');
    const perplexityResult = await searchPerplexity(keywords);
    
    if (perplexityResult.found) {
      results.push(perplexityResult.content);
      console.log('[知识检索] Perplexity 搜索成功');
    }
  }
  
  // 3. 返回结果
  if (results.length === 0) {
    return '【权威知识检索】未找到相关参考资料，请基于通用科学知识进行判断。';
  }
  
  return `【权威知识参考资料】\n${results.join('\n\n---\n\n')}`;
}

// ==================== 调用 AI 进行判断 ====================
/**
 * 调用 AI 模型进行科学性错误判断
 * @param {Array} context - 完整的对话上下文
 * @returns {Object} AI 判断结果
 */
async function callAIForJudgment(context) {
  const model = process.env.AI_MODEL || 'deepseek-chat';
  
  const response = await openai.chat.completions.create({
    model: model,
    messages: context,
    temperature: 0.3, // 较低的温度以获得更稳定的判断
    max_tokens: 2000
  });
  
  const content = response.choices[0].message.content;
  
  // 尝试解析 JSON 响应
  try {
    // 移除可能的 markdown 代码块标记
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
    // 如果解析失败，返回原始内容
    return {
      hasError: false,
      errorDetails: [],
      confidence: 0,
      summary: 'AI 响应解析失败',
      rawResponse: content
    };
  }
}

// ==================== 主函数：判断对话中的科学性错误 ====================
/**
 * POST /api/ai/judge
 * 请求体: { pairId: number }
 * 响应: { hasError, errorDetails, confidence, summary }
 */
const judgeConversation = async (req, res) => {
  const { pairId } = req.body;
  const userId = req.user?.userId;
  
  // 参数验证
  if (!pairId) {
    return res.status(400).json({ error: '缺少 pairId 参数' });
  }
  
  try {
    // ========== Step 1: 获取 pair 信息 ==========
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return res.status(404).json({ error: '结对不存在' });
    }
    
    // 权限检查：只有结对的参与者才能请求判断
    if (userId && pair.teacher_id !== userId && pair.student_id !== userId) {
      return res.status(403).json({ error: '无权判断此对话' });
    }
    
    // ========== Step 2: 获取聊天记录 ==========
    const messages = await queries.message.getByPairId(pairId);
    
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: '对话记录为空，无法判断' });
    }
    
    // ========== Step 3: 领域检测与动态系统提示词构建 ==========
    const detector = new DomainDetector();
    const domainAnalysis = detector.analyze(messages);

    console.log('[领域检测] 编程:', domainAnalysis.programming.detected,
                '科学:', domainAnalysis.science.detected,
                '技术:', domainAnalysis.technology.detected);

    // 构建领域信息摘要
    const domainSummary = [];
    if (domainAnalysis.programming.detected) {
      domainSummary.push(`检测到编程语言: ${domainAnalysis.programming.languages.join(', ')}`);
    }
    if (domainAnalysis.science.detected) {
      domainSummary.push(`检测到科学领域: ${domainAnalysis.science.fields.join(', ')}`);
    }
    if (domainAnalysis.technology.detected) {
      domainSummary.push(`检测到技术领域: ${domainAnalysis.technology.areas.join(', ')}`);
    }

    // 动态构建系统提示词（基础 + 领域特定指导）
    let dynamicSystemPrompt = SYSTEM_PROMPT;

    // 根据检测到的领域添加特定审查指导
    if (domainAnalysis.programming.detected) {
      dynamicSystemPrompt += `\n\n## 编程代码审查指导\n`;
      dynamicSystemPrompt += `检测到的编程语言: ${domainAnalysis.programming.languages.join(', ')}\n\n`;

      // 添加各语言的特定检查点
      if (domainAnalysis.programming.languages.includes('JavaScript/Node.js')) {
        dynamicSystemPrompt += `### JavaScript/Node.js 重点关注\n`;
        dynamicSystemPrompt += `- JWT token 处理：检查是否正确处理 Authorization header 和 Bearer 前缀\n`;
        dynamicSystemPrompt += `- 异步操作：检查 await/async 使用是否正确\n`;
        dynamicSystemPrompt += `- Express 框架：检查路由和中间件的使用\n`;
      }

      if (domainAnalysis.programming.languages.includes('Python')) {
        dynamicSystemPrompt += `### Python 重点关注\n`;
        dynamicSystemPrompt += `- 列表推导：检查是否有副作用的函数\n`;
        dynamicSystemPrompt += `- 异常处理：检查 try-except 使用是否完整\n`;
        dynamicSystemPrompt += `- 标准库：检查是否正确使用\n`;
      }

      if (domainAnalysis.programming.languages.includes('C/C++')) {
        dynamicSystemPrompt += `### C/C++ 重点关注\n`;
        dynamicSystemPrompt += `- 内存管理：检查 malloc/free 使用是否正确\n`;
        dynamicSystemPrompt += `- 指针操作：检查是否存在内存泄漏风险\n`;
      }
    }

    if (domainAnalysis.science.detected) {
      dynamicSystemPrompt += `\n\n## 科学知识审查指导\n`;
      dynamicSystemPrompt += `检测到的科学领域: ${domainAnalysis.science.fields.join(', ')}\n\n`;
      dynamicSystemPrompt += `- 公式和定律：检查是否正确应用\n`;
      dynamicSystemPrompt += `- 概念定义：检查概念理解是否准确\n`;
      dynamicSystemPrompt += `- 因果关系：检查推理逻辑是否合理\n`;
    }

    if (domainAnalysis.technology.detected) {
      dynamicSystemPrompt += `\n\n## 技术知识审查指导\n`;
      dynamicSystemPrompt += `检测到的技术领域: ${domainAnalysis.technology.areas.join(', ')}\n\n`;
      dynamicSystemPrompt += `- 标准规范：检查是否符合行业标准\n`;
      dynamicSystemPrompt += `- 安全性：检查是否存在安全风险\n`;
    }

    // ========== Step 4: 构建角色上下文 ==========
    const chatContext = [];

    // 添加动态系统提示词
    chatContext.push({ role: 'system', content: dynamicSystemPrompt });

    // 添加领域分析结果
    if (domainSummary.length > 0) {
      chatContext.push({
        role: 'system',
        content: `## 领域分析结果\n${domainSummary.join('\n')}\n\n根据检测到的领域，重点审查相关内容。`
      });
    }

    // 遍历消息，根据 sender_id 区分角色
    for (const msg of messages) {
      const role = msg.sender_id === pair.teacher_id ? 'teacher' : 'student';
      chatContext.push({
        role: 'user',
        content: `[${role}]: ${msg.content}`
      });
    }
    
    // ========== Step 5: 调用知识库检索 ==========
    const knowledgeBaseResult = await queryKnowledgeBase(messages);

    // ========== Step 6: 构建完整请求上下文 ==========
    // chatContext 已经包含了动态系统提示词和对话历史
    const fullContext = [
      chatContext[0], // 动态系统提示词（包含领域分析）
      { role: 'system', content: knowledgeBaseResult }, // 知识库结果
      ...chatContext.slice(1) // 对话历史（排除了第一个系统提示词，重新添加）
    ];
    
    // ========== Step 6: 调用 AI 进行判断 ==========
    const judgmentResult = await callAIForJudgment(fullContext);
    
    // ========== Step 7: 返回结果 ==========
    res.json({
      success: true,
      data: judgmentResult,
      meta: {
        pairId,
        messageCount: messages.length,
        model: process.env.AI_MODEL || 'deepseek-chat',
        knowledgeSources: {
          wikipedia: true,
          perplexity: !!process.env.PERPLEXITY_API_KEY
        }
      }
    });
    
  } catch (err) {
    console.error('AI 判断失败:', err);
    res.status(500).json({ 
      error: 'AI 判断失败',
      message: err.message 
    });
  }
};

// ==================== 预留：对话总结功能 ====================
const summarizeConversation = async (req, res) => {
  // TODO: 实现对话总结功能
  res.status(501).json({ error: '功能暂未实现' });
};

// ==================== 轮次即时审查功能 ====================

/**
 * 审查指定轮次（单轮审查）
 * POST /api/ai/round/:roundId
 * 请求体: {}（roundId 从路径参数获取）
 */
const reviewRound = async (req, res) => {
  const { roundId } = req.params;
  const userId = req.user?.userId;

  try {
    // 1. 从 roundId 提取消息 ID
    const studentMessageId = roundId.replace('round_', '');
    const teacherMessageId = parseInt(studentMessageId) + 1;

    // 2. 获取两条消息
    const [studentMsg, teacherMsg] = await Promise.all([
      queries.message.getById(studentMessageId),
      queries.message.getById(teacherMessageId)
    ]);

    if (!studentMsg) {
      return res.status(404).json({ error: '学生消息不存在' });
    }

    // 3. 获取结对信息
    const pair = await queries.pair.getById(studentMsg.pair_id);
    if (!pair) {
      return res.status(404).json({ error: '结对不存在' });
    }

    // 4. 权限检查
    if (userId && pair.teacher_id !== userId && pair.student_id !== userId) {
      return res.status(403).json({ error: '无权审查此轮次' });
    }

    // 5. 构建轮次对象
    const round = {
      id: roundId,
      studentQuestion: studentMsg,
      teacherReply: teacherMsg
    };

    // 6. 调用审查服务
    const result = await RoundReviewService.reviewRound(round, pair);

    // 7. 返回结果
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[轮次审查] 失败:', error);
    res.status(500).json({
      error: '审查失败',
      message: error.message
    });
  }
};

/**
 * 获取结对的所有轮次审查结果
 * GET /api/ai/rounds/:pairId
 */
const getRoundReviews = async (req, res) => {
  const { pairId } = req.params;
  const userId = req.user?.userId;

  try {
    // 获取结对信息
    const pair = await queries.pair.getById(pairId);
    if (!pair) {
      return res.status(404).json({ error: '结对不存在' });
    }

    // 权限检查
    if (userId && pair.teacher_id !== userId && pair.student_id !== userId) {
      return res.status(403).json({ error: '无权查看此结对的审查结果' });
    }

    // 获取所有消息
    const messages = await queries.message.getByPairId(pairId);
    if (!messages || messages.length === 0) {
      return res.status(200).json({ success: true, rounds: [] });
    }

    // 检测轮次
    const rounds = RoundDetector.detectRounds(messages, pair);

    // TODO: 这里可以添加从缓存读取已审查结果
    // 暂时返回空结果列表（实际应该从缓存获取）
    res.json({
      success: true,
      rounds: rounds.map(r => ({
        id: r.id,
        studentMessageId: r.studentMessageId,
        teacherMessageId: r.teacherMessageId,
        complete: r.complete
      })),
      cached: false
    });

  } catch (error) {
    console.error('[获取轮次审查] 失败:', error);
    res.status(500).json({
      error: '获取失败',
      message: error.message
    });
  }
};

module.exports = {
  judgeConversation,
  summarizeConversation,
  reviewRound,
  getRoundReviews
};
