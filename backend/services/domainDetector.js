/**
 * 领域识别器
 * 负责分析对话内容，识别涉及的知识领域
 */

class DomainDetector {
  /**
   * 分析对话，识别各个领域
   * @param {Array} messages - 聊天记录
   * @returns {Object} 领域分析结果
   */
  analyze(messages) {
    const text = messages.map(m => m.content).join('\n');

    return {
      programming: this.detectProgramming(text),
      science: this.detectScience(text),
      technology: this.detectTechnology(text)
    };
  }

  /**
   * 检测编程相关内容
   * @param {string} text - 文本内容
   * @returns {Object} 检测结果
   */
  detectProgramming(text) {
    const languages = {
      python: {
        pattern: /import\s+\w+|from\s+\w+\s+import|def\s+\w+\(|python|pip\s+install/gi,
        name: 'Python'
      },
      javascript: {
        pattern: /const\s+\w+\s*=\s*require\(|\.then\(|\.catch\(|async\s+\w+\(|await\s+\w+|npm\s+install|\.jsx?|\.vue/gi,
        name: 'JavaScript/Node.js'
      },
      c: {
        pattern: /#include\s*<\w+\.h>|printf\(|malloc\(|free\(|struct\s+\w+\{|;$/gi,
        name: 'C/C++'
      },
      java: {
        pattern: /public\s+class\s+\w+|System\.out\.println|import\s+java\.util|@Override|@Component/gi,
        name: 'Java'
      },
      go: {
        pattern: /package\s+main|func\s+\w+\(|go\s+run|fmt\.Print|import\s+"golang\.org/gi,
        name: 'Go'
      },
      rust: {
        pattern: /fn\s+\w+\(|println!\(|let\s+mut\s+\w+|use\s+std::|Cargo\.toml/gi,
        name: 'Rust'
      }
    };

    const detectedLanguages = [];
    const detectedPatterns = [];

    for (const [langKey, langInfo] of Object.entries(languages)) {
      if (langInfo.pattern.test(text)) {
        detectedLanguages.push(langInfo.name);
        detectedPatterns.push({
          language: langInfo.name,
          key: langKey,
          confidence: this.calculateConfidence(text, langInfo.pattern)
        });
      }
    }

    return {
      detected: detectedLanguages.length > 0,
      languages: detectedLanguages,
      patterns: detectedPatterns,
      confidence: detectedLanguages.length > 0 ? 0.8 : 0
    };
  }

  /**
   * 检测科学相关内容
   * @param {string} text - 文本内容
   * @returns {Object} 检测结果
   */
  detectScience(text) {
    const fields = {
      physics: {
        pattern: /牛顿定律|爱因斯坦|相对论|f\s*=\s*ma|光速|c\s*=\s*3e8|波长|频率|量子|电子|质子|中子|万有引力/gi,
        name: '物理学'
      },
      chemistry: {
        pattern: /化学方程|分子式|原子量|摩尔|化学反应|元素周期表|离子|共价键|氧化还原|化学键/gi,
        name: '化学'
      },
      math: {
        pattern: /微积分|导数|积分|极限|微分|泰勒级数|拉格朗日|傅里叶变换|线性代数|矩阵|特征值|三角函数/gi,
        name: '数学'
      },
      biology: {
        pattern: /DNA|RNA|蛋白质|基因|细胞|遗传|进化|生态|光合作用|呼吸作用|酶|细胞分裂|线粒体/gi,
        name: '生物学'
      },
      geography: {
        pattern: /板块构造|地震|火山|气候类型|大气环流|洋流|水文循环|岩石圈|地壳|地质年代/gi,
        name: '地理学'
      },
      astronomy: {
        pattern: /黑洞|恒星|星系|宇宙膨胀|光年|视界|引力波|暗物质|暗能量|红移|行星|卫星/gi,
        name: '天文学'
      }
    };

    const detectedFields = [];
    const concepts = [];

    for (const [fieldKey, fieldInfo] of Object.entries(fields)) {
      if (fieldInfo.pattern.test(text)) {
        detectedFields.push(fieldInfo.name);
        concepts.push({
          field: fieldInfo.name,
          key: fieldKey,
          confidence: this.calculateConfidence(text, fieldInfo.pattern)
        });
      }
    }

    return {
      detected: detectedFields.length > 0,
      fields: detectedFields,
      concepts: concepts,
      confidence: detectedFields.length > 0 ? 0.75 : 0
    };
  }

  /**
   * 检测技术相关内容
   * @param {string} text - 文本内容
   * @returns {Object} 检测结果
   */
  detectTechnology(text) {
    const areas = {
      network: {
        pattern: /TCP|UDP|IP|DNS|HTTP|HTTPS|WebSocket|RESTful|API\s+endpoint|端口号|协议栈/gi,
        name: '网络协议'
      },
      security: {
        pattern: /加密|解密|哈希|数字签名|SSL|TLS|HTTPS|OAuth|JWT|认证|授权|越权|XSS|CSRF|SQL注入/gi,
        name: '信息安全'
      },
      architecture: {
        pattern: /微服务|分布式|单体架构|容器|Kubernetes|Docker|负载均衡|高可用|缓存|消息队列/gi,
        name: '系统架构'
      },
      devops: {
        pattern: /CI|CD|持续集成|持续部署|版本控制|Git|自动化|流水线|单元测试|集成测试/gi,
        name: 'DevOps'
      }
    };

    const detectedAreas = [];
    const concepts = [];

    for (const [areaKey, areaInfo] of Object.entries(areas)) {
      if (areaInfo.pattern.test(text)) {
        detectedAreas.push(areaInfo.name);
        concepts.push({
          area: areaInfo.name,
          key: areaKey,
          confidence: this.calculateConfidence(text, areaInfo.pattern)
        });
      }
    }

    return {
      detected: detectedAreas.length > 0,
      areas: detectedAreas,
      concepts: concepts,
      confidence: detectedAreas.length > 0 ? 0.7 : 0
    };
  }

  /**
   * 计算检测置信度
   * @param {string} text - 文本内容
   * @param {RegExp} pattern - 匹配模式
   * @returns {number} 置信度 (0-1)
   */
  calculateConfidence(text, pattern) {
    const matches = text.match(pattern);
    if (!matches) return 0;

    // 匹配次数越多，置信度越高
    const matchCount = matches.length;

    // 文本长度权重
    const textLength = text.length;
    const avgMatchLength = matches.reduce((sum, m) => sum + m.length, 0) / matchCount;

    // 基础置信度：匹配占比
    const baseConfidence = Math.min(matchCount * 0.3, 0.9);

    // 上限为 1
    return Math.min(baseConfidence, 1);
  }

  /**
   * 构建用于 AI 的领域信息摘要
   * @param {Object} analysis - 领域分析结果
   * @returns {string} 摘要文本
   */
  buildDomainSummary(analysis) {
    const parts = [];

    if (analysis.programming.detected) {
      parts.push(`检测到编程内容：${analysis.programming.languages.join(', ')}`);
    }

    if (analysis.science.detected) {
      parts.push(`检测到科学内容：${analysis.science.fields.join(', ')}`);
    }

    if (analysis.technology.detected) {
      parts.push(`检测到技术内容：${analysis.technology.areas.join(', ')}`);
    }

    if (parts.length === 0) {
      parts.push('未检测到特定领域，将进行通用知识审查');
    }

    return parts.join('\n');
  }
}

module.exports = DomainDetector;
