import katex from 'katex';

/**
 * 将 LaTeX 公式渲染为 HTML 字符串
 */
const renderLatexToString = (latex, displayMode) => {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      trust: true,
      strict: false,
    });
  } catch (e) {
    return null;
  }
};

/**
 * 解析消息内容，将 LaTeX 公式替换为渲染后的 HTML
 * 支持两种格式：
 * 1. 标准分隔符公式：$$...$$, \[...\], $...$, \(...\)
 * 2. 纯 LaTeX 命令：无分隔符，如 \frac{1}{3}, \int_{0}^{1}, x^{2}
 */
export const parseLatexContent = (content) => {
  if (!content) return [];

  const parts = [];

  // 匹配标准分隔符公式
  const standardPattern = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$\n]+?\$|\\\([\s\S]*?\\\))/g;

  // 匹配纯 LaTeX 命令（无分隔符）
  // 注意：数据库中 LaTeX 存储为 JSON 格式，所以 \int 存储为 \\int
  // [\\\\]{1,2} 表示匹配1到2个反斜杠，能同时覆盖 \int 和 \\int 两种情况
  //
  // 注意：由于 JSON 转义，数据库中的字符串是双反斜杠格式
  // 如：数据库存储 "\\int_{a}^{b}"，JavaScript 读取时是 "\\\\int_{a}^{b}"
  // 正则中的 [\\\\]{1,2} 在 JavaScript 字符串中是 [\\\\]{1,2}，匹配字面的 \ 或 \\
  // 实际使用时，content 中的 \\\\ 代表一个字面的 \\
  // 而 [\\\\]{1,2} 会匹配1到2个反斜杠
  //
  // 对于 \int_{a}^{b} f(x) \, dx：
  // - content 是双反斜杠格式："定积分 \\\\int_{a}^{b} f(x) \\\\, dx 的几何意义是？"
  // - 我们要匹配 "\\\\int_{a}^{b}" 或 "\\int_{a}^{b}"
  // - 但现在 content 中的 \\\\ 实际是两个字符：\ 和 \

  // 更简单明确的纯命令匹配器
  // 每个命令独立匹配，避免复杂的可选组导致死循环
  const pureCommands = [
    // \\frac 或 \frac 后跟 {}{} 格式
    '[\\\\]{1,2}frac\\{[^{}]*\\}\\{[^{}]*\\}',
    // \\sqrt 或 \sqrt 后跟可选 {}
    '[\\\\]{1,2}sqrt(?:\\{[^{}]*\\})?',
    // \\int 或 \int - 支持 \int_{a}^{b}, \int_a^b, \int_{a}, \int^{b} 等完整格式
    // 匹配 \int 后跟可选的下标和上标，格式为 _xxx 或 ^{xxx} 或 _xxx^{yyy}
    '[\\\\]{1,2}int(?:_[a-zA-Z0-9]+|_(?:\\{[^{}]*\\}|[^{}]*?))?(?:\\^(?:\\{[^{}]*\\}|[^{}]*?))?',
    // \\sum 或 \sum
    '[\\\\]{1,2}sum(?:_[a-zA-Z0-9]+|_(?:\\{[^{}]*\\}|[^{}]*?))?(?:\\^(?:\\{[^{}]*\\}|[^{}]*?))?',
    // \\lim 或 \lim
    '[\\\\]{1,2}lim(?:_[a-zA-Z0-9]+|_(?:\\{[^{}]*\\}|[^{}]*?))?(?:\\^(?:\\{[^{}]*\\}|[^{}]*?))?',
    // LaTeX 空格命令：\, \; \: \! \quad \qquad（不需要词边界，因为后面可能是空格）
    '[\\\\]{1,2}(?:,|;|:|!|quad|qquad)(?![a-zA-Z])',
    // \\alpha 等希腊字母
    '[\\\\]{1,2}(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\\b',
    // \\geq 等运算符号
    '[\\\\]{1,2}(?:geq|leq|gt|lt|neq|approx|pm|times|div|cdot)\\b',
    // \\sin 等函数名
    '[\\\\]{1,2}(?:sin|cos|tan|cot|sec|csc|log|ln|exp|partial|nabla|infty)\\b',
    // \\bar{} 等装饰
    '[\\\\]{1,2}(?:bar|hat|vec|dot)\\{[^{}]*\\}',
    // x^2 或 y^3 等变量指数（不带反斜杠）
    '[xyzabcf]\\^[^{}\\s]+',
    // x_0 或 y_1 等变量下标
    '[xyzabcf]_[^{}\\s]+',
    // 通用：反斜杠+字母+上标
    '[\\\\]{1,2}[a-zA-Z]+\\^[^{}\\s]+',
    // 通用：反斜杠+字母+下标
    '[\\\\]{1,2}[a-zA-Z]+_[^{}\\s]+',
  ];

  // 构建纯命令匹配器
  const purePattern = new RegExp('(' + pureCommands.join('|') + ')', 'g');

  // 收集所有匹配
  const standardMatches = [];
  let match;
  while ((match = standardPattern.exec(content)) !== null) {
    standardMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      isStandard: true
    });
  }

  purePattern.lastIndex = 0;
  const pureMatches = [];
  while ((match = purePattern.exec(content)) !== null) {
    pureMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      isStandard: false
    });
  }

  if (standardMatches.length === 0 && pureMatches.length === 0) {
    return [{ type: 'text', content }];
  }

  // 合并所有匹配并按位置排序
  const allMatches = [...standardMatches, ...pureMatches].sort((a, b) => a.start - b.start);

  // 去除重叠的匹配（标准公式优先）
  const filteredMatches = [];
  for (const m of allMatches) {
    const overlaps = filteredMatches.some(existing =>
      (m.start >= existing.start && m.start < existing.end) ||
      (m.end > existing.start && m.end <= existing.end)
    );
    if (!overlaps) {
      filteredMatches.push(m);
    }
  }

  // 按位置构建结果
  let lastIndex = 0;
  for (const m of filteredMatches) {
    if (m.start > lastIndex) {
      const text = content.slice(lastIndex, m.start);
      if (text) parts.push({ type: 'text', content: text });
    }

    let latex = m.text;
    let displayMode = false;

    // 标准分隔符公式，去除界定符
    if (m.text.startsWith('$$')) {
      latex = m.text.slice(2, -2).trim();
      displayMode = true;
    } else if (m.text.startsWith('\\[')) {
      latex = m.text.slice(2, -2).trim();
      displayMode = true;
    } else if (m.text.startsWith('$')) {
      latex = m.text.slice(1, -1).trim();
      displayMode = false;
    } else if (m.text.startsWith('\\(')) {
      latex = m.text.slice(2, -2).trim();
      displayMode = false;
    } else {
      // 纯 LaTeX 命令（可能是 \\int 或 \int 格式）
      // 统一转为单反斜杠格式给 katex
      latex = latex.replace(/\\\\/g, '\\');
    }

    const html = renderLatexToString(latex, displayMode);

    if (html) {
      parts.push({
        type: 'latex',
        content: html,
        displayMode
      });
    } else {
      parts.push({ type: 'text', content: m.text });
    }

    lastIndex = m.end;
  }

  // 添加剩余文本
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text) parts.push({ type: 'text', content: text });
  }

  return parts;
};