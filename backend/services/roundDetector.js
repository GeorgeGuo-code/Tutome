/**
 * 轮次检测器
 * 负责识别对话中的完整轮次（学生提问 → 老师回答）
 */
class RoundDetector {
  /**
   * 分析消息序列，识别轮次
   * @param {Array} messages - 聊天记录数组（按时间排序）
   * @param {Object} pair - 结对信息，包含 teacher_id 和 student_id
   * @returns {Array} 轮次数组
   */
  detectRounds(messages, pair) {
    const rounds = [];
    let currentRound = null;

    for (const msg of messages) {
      const isTeacher = msg.sender_id === pair.teacher_id;

      if (!isTeacher) {
        // 学生提问：如果上一轮存在，先结束上一轮
        if (currentRound) {
          // 只有当学生开始新提问时，上一轮才真正完成
          currentRound.complete = true;
          currentRound.hasTeacherReply = !!currentRound.teacherReply;
          rounds.push(currentRound);
        }

        // 开始新一轮
        currentRound = {
          id: `round_${msg.id}`,
          studentQuestion: msg,
          studentMessageId: msg.id,
          teacherReplies: [], // 支持多条老师回复
          teacherReply: null, // 保留兼容性，使用第一条回复
          teacherMessageId: null, // 保留兼容性
          timestamp: msg.created_at,
          complete: false, // 新轮次默认未完成
          hasTeacherReply: false
        };
      } else if (isTeacher && currentRound) {
        // 老师回答：追加到当前轮次（不结束轮次，支持老师连续回答）
        currentRound.teacherReplies.push(msg);

        // 保留兼容性：如果没有设置过 teacherReply，则设置
        if (!currentRound.teacherReply) {
          currentRound.teacherReply = msg;
          currentRound.teacherMessageId = msg.id;
        }

        // 注意：这里不设置 complete，只有学生开始新提问时才设置
      }
    }

    // 处理最后一轮（如果有）
    if (currentRound) {
      // 最后一轮的状态保持不变（不会在内部遍历时设置）
      // 但需要设置 teacherReply 相关标志
      currentRound.complete = !!currentRound.teacherReply;
      currentRound.hasTeacherReply = !!currentRound.teacherReply;
      rounds.push(currentRound);
    }

    return rounds;
  }

  /**
   * 检查最后一条消息是否完成一轮
   * @param {Object} lastMessage - 最后一条消息
   * @param {Object} pair - 结对信息
   * @returns {boolean} 是否完成一轮
   */
  isRoundComplete(lastMessage, pair) {
    return lastMessage && lastMessage.sender_id === pair.teacher_id;
  }

  /**
   * 获取最新的一轮
   * @param {Array} messages - 消息数组
   * @param {Object} pair - 结对信息
   * @returns {Object|null} 最新轮次或 null
   */
  getLatestRound(messages, pair) {
    if (!messages || messages.length === 0) {
      return null;
    }

    const rounds = this.detectRounds(messages, pair);
    return rounds.length > 0 ? rounds[rounds.length - 1] : null;
  }

  /**
   * 检查消息是否应该是轮次的开始（学生提问）
   * @param {Object} message - 消息对象
   * @param {Object} pair - 结对信息
   * @returns {boolean} 是否开始一轮
   */
  isRoundStart(message, pair) {
    return message && message.sender_id === pair.student_id;
  }
}

module.exports = RoundDetector;
