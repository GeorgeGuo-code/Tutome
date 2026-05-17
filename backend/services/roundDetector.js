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

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isTeacher = msg.sender_role === 'ai_student'
        ? false  // AI学生不算老师
        : msg.sender_id === pair.teacher_id;

      if (!isTeacher) {
        // 学生发送消息：检查上一条消息是否来自老师
        let lastMessage = null;
        if (i > 0) {
          lastMessage = messages[i - 1];
        }

        const lastIsTeacher = lastMessage && lastMessage.sender_id === pair.teacher_id;

        if (lastIsTeacher && currentRound) {
          // 上一条是老师，结束上一轮，开始新轮次
          currentRound.complete = true;
          currentRound.hasTeacherReply = !!currentRound.teacherReply;
          rounds.push(currentRound);

          // 开始新一轮
          currentRound = {
            id: `round_${msg.id}`,
            studentQuestion: msg,
            studentMessages: [msg], // 支持多条学生追问
            studentMessageId: msg.id,
            teacherReplies: [],
            teacherReply: null,
            teacherMessageId: null,
            timestamp: msg.created_at,
            complete: false,
            hasTeacherReply: false,
            roundTriggered: false // 标记是否已触发审查
          };
        } else if (currentRound) {
          // 上一条是学生（或第一条），追加到当前轮次（追问）
          currentRound.studentMessages.push(msg);
        } else {
          // 第一条消息（学生），开始新轮次
          currentRound = {
            id: `round_${msg.id}`,
            studentQuestion: msg,
            studentMessages: [msg],
            studentMessageId: msg.id,
            teacherReplies: [],
            teacherReply: null,
            teacherMessageId: null,
            timestamp: msg.created_at,
            complete: false,
            hasTeacherReply: false,
            roundTriggered: false
          };
        }
      } else if (isTeacher && currentRound) {
        // 老师回答：追加到当前轮次
        currentRound.teacherReplies.push(msg);

        // 保留兼容性：如果没有设置过 teacherReply，则设置
        if (!currentRound.teacherReply) {
          currentRound.teacherReply = msg;
          currentRound.teacherMessageId = msg.id;
        }
      }
    }

    // 处理最后一轮（如果有）
    if (currentRound) {
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
