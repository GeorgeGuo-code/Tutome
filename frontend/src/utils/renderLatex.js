import katex from 'katex';

/**
 * 将 LaTeX 公式渲染为 HTML 字符串
 * @param {string} latex - LaTeX 公式内容（不含界定符）
 * @param {boolean} displayMode - 是否为块级公式
 * @returns {string} HTML 字符串
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
 * @param {string} content - 原始消息内容
 * @returns {Array} 由 { type: 'text'|'latex', content: string, displayMode?: boolean } 组成的数组
 */
export const parseLatexContent = (content) => {
  if (!content) return [];

  // 正则匹配所有 LaTeX 公式
  // 块级公式: $$...$$ 或 \[...\]
  // 行内公式: $...$ 或 \(...\)
  const latexPattern = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$\n]+?\$|\\\([\s\S]*?\\\))/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = latexPattern.exec(content)) !== null) {
    // 添加匹配前的普通文本
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text) parts.push({ type: 'text', content: text });
    }

    const fullMatch = match[1];
    let latex = match[1];
    let displayMode = false;

    // 判断是块级还是行内公式，并去除界定符
    if (fullMatch.startsWith('$$')) {
      latex = fullMatch.slice(2, -2).trim();
      displayMode = true;
    } else if (fullMatch.startsWith('\\[')) {
      latex = fullMatch.slice(2, -2).trim();
      displayMode = true;
    } else if (fullMatch.startsWith('$')) {
      latex = fullMatch.slice(1, -1).trim();
      displayMode = false;
    } else if (fullMatch.startsWith('\\(')) {
      latex = fullMatch.slice(2, -2).trim();
      displayMode = false;
    }

    // 渲染 LaTeX
    const html = renderLatexToString(latex, displayMode);

    if (html) {
      parts.push({
        type: 'latex',
        content: html,
        displayMode
      });
    } else {
      // 渲染失败，显示原文
      parts.push({ type: 'text', content: fullMatch });
    }

    lastIndex = match.index + fullMatch.length;
  }

  // 添加剩余的普通文本
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text) parts.push({ type: 'text', content: text });
  }

  return parts;
};