import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./dialogue.css";
import FeatureTipModal from '../components/FeatureTipModal';
import socketService from '../services/socketService';

const Dialogue = () => {
  const { pairId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastMessageId, setLastMessageId] = useState(null); // 记录最后一条消息的ID，用于去重
  const [pairStatus, setPairStatus] = useState(null); // 结对状态
  const [endRequestedBy, setEndRequestedBy] = useState(null); // 谁申请结束
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false); // 显示确认模态框
  const [showEndRequestModal, setShowEndRequestModal] = useState(false); // 显示收到申请的模态框
  const [showTipModal, setShowTipModal] = useState(false); // 显示功能说明弹窗
  const [isReviewing, setIsReviewing] = useState(false); // 是否正在进行轮次审查
  const [isSummarizing, setIsSummarizing] = useState(false); // 是否正在生成总结
  const [summary, setSummary] = useState(null); // 总结的容
  const [showSummaryModal, setShowSummaryModal] = useState(false); // 显示总结弹窗
  const currentUserId = parseInt(localStorage.getItem("userId")) || null;
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const pollingIntervalRef = useRef(null); // 轮询定时器引用
  const previousMessagesLengthRef = useRef(0); // 跟踪之前的消息数量
  // 新增：首次进入对话页面触发弹窗
  useEffect(() => {
    // 专属 localStorage key，避免和其他板块冲突
    const hasSeenDialogueTip = localStorage.getItem('hasSeenDialogueTip');
    if (!hasSeenDialogueTip) {
      setShowTipModal(true);
    }

    // 原有对话逻辑（保留不动，比如加载聊天记录、接收消息等）
    const loadDialogueHistory = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/dialogue/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // 你原有处理聊天记录的逻辑...
    };
    loadDialogueHistory();
  }, []);

  // 新增：关闭弹窗并标记已查看
  const handleCloseModal = () => {
    setShowTipModal(false);
    localStorage.setItem('hasSeenDialogueTip', 'true');
  };

  // 新增：对话板块功能说明和注意事项（适配你的场景）
  const dialogueFeatures = [
    '与匹配的解答者/提问者实时文字交流',
    '支持发送代码片段、问题相关截图（如有）',
    '聊天记录自动保存，可在个人中心（Personal）查看',
    '可标记消息已读/未读，支持限时撤回消息'
  ];
  const dialogueNotes = [
    '仅可与匹配用户或问题相关方对话，无法随意发起聊天',
    '请勿发送广告、辱骂等违规内容，否则限制对话功能',
    '未登录状态下无法进入对话页面，会自动跳转登录页',
    '网络异常时聊天记录可能延迟加载，可刷新页面'
  ];

  // 验证 Pair ID 并启动轮询
  useEffect(() => {
    if (!pairId || isNaN(parseInt(pairId))) {
      setError("无效的结对 ID");
      setLoading(false);
      return;
    }

    // 首次加载消息和结对状态
    fetchMessages(true);
    fetchPairStatus();

    // 启动轮询：每3秒检查一次新消息和结对状态
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages(false); // 轮询时不更新 loading 状态
      fetchPairStatus(); // 检查结对状态
    }, 3000);

    // 监听 Socket.IO 通知
    const handleNotification = (notification) => {
      if (notification.type === 'end_rejected' && notification.relatedId === pairId) {
        alert('对方拒绝结束教学');
        setPairStatus('active');
        setEndRequestedBy(null);
      }
      if (notification.type === 'end_accepted' && notification.relatedId === pairId) {
        alert('对方已同意结束教学，正在生成总结...');
        setPairStatus('completed');
        // 执行结束后的处理流程（轮次审查 + 生成
        handleDialogueEnd();
      }
    };

    socketService.on('notification', handleNotification);

    // 清理函数：组件卸载时停止轮询和移除监听
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      socketService.off('notification', handleNotification);
    };
  }, [pairId]);

  useEffect(() => {
    // 首次加载时总是滚动到底部
    if (previousMessagesLengthRef.current === 0 && messages.length > 0) {
      scrollToBottom();
    }
    // 只有在消息数量增加时才考虑滚动
    else if (messages.length > previousMessagesLengthRef.current) {
      // 检查用户是否在底部
      if (messagesAreaRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesAreaRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

        if (isAtBottom) {
          scrollToBottom();
        }
      }
    }

    previousMessagesLengthRef.current = messages.length;
  }, [messages]);

  const fetchMessages = async (isInitialLoad = false) => {
    // 只在首次加载时显示 loading 状态
    if (isInitialLoad) {
      setLoading(true);
    }
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        if (isInitialLoad) {
          setError("请先登录");
          setLoading(false);
        }
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/chats/${pairId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `获取消息失败 (${response.status})`);
      }

      const data = await response.json();
      const newMessages = Array.isArray(data) ? data : [];

      // 消息去重：只在有新消息时更新状态
      if (newMessages.length > 0) {
        const currentLastId = lastMessageId;
        const newLastId = newMessages[newMessages.length - 1]?.id;

        // 如果有新消息，更新状态
        if (newLastId !== currentLastId) {
          setMessages(newMessages);
          setLastMessageId(newLastId);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      // 轮询失败时不显示错误，避免影响用户体验
      if (isInitialLoad) {
        setError(error.message || "获取消息失败");
      }
    } finally {
      // 只在首次加载时关闭 loading
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  // 获取结对状态
  const fetchPairStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `http://localhost:3000/api/pairs/${pairId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const pairData = await response.json();
        checkEndRequest(pairData);
      }
    } catch (error) {
      console.error("Error fetching pair status:", error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("请先登录");
        return;
      }

      console.log('Sending message to pairId:', pairId);
      console.log('Message content:', inputText);

      const response = await fetch(
        `http://localhost:3000/api/chats/${pairId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: inputText,
          }),
        }
      );

      console.log('Send response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || errorData.error || `发送消息失败 (${response.status})`);
      }

      setInputText("");
      fetchMessages(false); // 发送消息后不需要显示 loading
    } catch (error) {
      console.error("Error sending message:", error);
      setError(error.message || "发送消息失败");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 申请结束对话
  const handleRequestEnd = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("请先登录");
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/chats/${pairId}/request-end`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setShowEndConfirmModal(false);
        alert("已申请结束教学，等待对方确认");
      } else {
        alert(data.error || data.message || "申请失败");
      }
    } catch (error) {
      console.error("申请结束教学失败:", error);
      alert("服务器错误，请稍后重试");
    }
  };

  // 确认结束对话框（显示确认模态框）
  const handleConfirmEnd = () => {
    setShowEndConfirmModal(true);
  };

  // 同意结束请求
  const handleAcceptEnd = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("请先登录");
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/chats/${pairId}/accept-end`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setShowEndRequestModal(false);
        setPairStatus('completed');
        alert("对话已结束，正在生成总结...");

        // 执行结束后的处理流程（轮次审查 + 生成总结）
        await handleDialogueEnd();
      } else {
        alert(data.error || data.message || "操作失败");
      }
    } catch (error) {
      console.error("同意结束请求失败:", error);
      alert("服务器错误，请稍后重试");
    }
  };

  // 拒绝结束请求
  const handleRejectEnd = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("请先登录");
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/chats/${pairId}/reject-end`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setShowEndRequestModal(false);
        setPairStatus('active');
        setEndRequestedBy(null);
        alert("已拒绝结束申请，继续教学");
      } else {
        alert(data.error || data.message || "操作失败");
      }
    } catch (error) {
      console.error("拒绝结束请求失败:", error);
      alert("服务器错误，请稍后重试");
    }
  };

  // 检查对方的结束申请
  const checkEndRequest = (pairData) => {
    if (pairData.status === 'end_requested' &&
        pairData.end_request_status === 'pending' &&
        pairData.end_requested_by !== currentUserId) {
      setShowEndRequestModal(true);
      setPairStatus('end_requested');
      setEndRequestedBy(pairData.end_requested_by);
    } else {
      setPairStatus(pairData.status);
      setEndRequestedBy(pairData.end_requested_by);
    }
  };

  // 进行轮次审查
  const reviewRounds = async () => {
    try {
      setIsReviewing(true);
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("未找到 token");
        return;
      }

      // 获取所有轮次
      const roundsResponse = await fetch(
        `http://localhost:3000/api/ai/rounds/${pairId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!roundsResponse.ok) {
        const errorData = await roundsResponse.json().catch(() => ({}));
        console.error('获取轮次失败:', errorData);
        return;
      }

      const roundsData = await roundsResponse.json();
      const rounds = roundsData.rounds || [];

      console.log(`[轮次审查] 开始审查 ${rounds.length} 个轮次`);

      // 对每个未审查的轮次进行审查
      for (const round of rounds) {
        if (!round.reviewed && round.studentMessageId) {
          try {
            const reviewResponse = await fetch(
              `http://localhost:3000/api/ai/round/round_${round.studentMessageId}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (reviewResponse.ok) {
              const reviewResult = await reviewResponse.json();
              console.log(`[轮次审查] 轮次 ${round.id} 审查完成`, reviewResult);
            }
          } catch (error) {
            console.error(`[轮次审查] 轮次 ${round.id} 审查失败:`, error);
          }
        }
      }

      console.log('[轮次审查] 所有轮次审查完成');
      return true;
    } catch (error) {
      console.error('轮次审查失败:', error);
      return false;
    } finally {
      setIsReviewing(false);
    }
  };

  // 生成对话总结
  const generateSummary = async () => {
    try {
      setIsSummarizing(true);
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("未找到 token");
        return;
      }

      console.log('[总结] 开始生成对话总结');

      const response = await fetch(
        'http://localhost:3000/api/ai/summary',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pairId: parseInt(pairId),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('生成总结失败:', errorData);
        alert(errorData.error || errorData.message || '生成总结失败');
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('[总结] 总结生成成功', data.data);
        setSummary(data.data);
        setShowSummaryModal(true);
      } else {
        console.error('[总结] 总结生成失败', data);
        alert(data.message || '生成总结失败');
      }
    } catch (error) {
      console.error('生成总结失败:', error);
      alert('生成总结失败，请稍后重试');
    } finally {
      setIsSummarizing(false);
    }
  };

  // 处理对话结束（生成总结）
  const handleDialogueEnd = async () => {
    console.log('[对话结束] 开始处理对话结束流程');

    // 1. 生成对话总结（轮次审查已在消息发送时自动触发）
    await generateSummary();

    // 2. 跳转到个人中心
    console.log('[对话结束] 跳转到个人中心');
    navigate('/personal');
  };

  return (
    <div className="dialogue-container">
      <div className="dialogue-header">
        <h2 className="dialogue-title">对话</h2>
        {pairStatus === 'active' && (
          <button
            className="end-dialogue-btn"
            onClick={handleConfirmEnd}
          >
            结束对话
          </button>
        )}
      </div>

      <div className="messages-area" ref={messagesAreaRef}>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{error}</div>
            <div className="error-hint">
              {error.includes("结对不存在") && "请确认结对 ID 是否正确"}
              {error.includes("无权查看") && "您不是该结对的成员"}
              {error.includes("无效的结对 ID") && "请从有效结对进入对话"}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="quick-prompts">
              <div className="prompt-bubble left">如何开始?</div>
              <div className="prompt-bubble right">可以这样开始...</div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-bubble ${
                msg.sender_id === currentUserId ? "right" : "left"
              }`}
            >
              <div className="message-header">
                <span className="message-avatar">
                  {msg.sender_id === currentUserId ? "👤" : "👥"}
                </span>
                <span className="message-sender">
                  {msg.sender_nickname || (msg.sender_id === currentUserId ? "我" : "对方")}
                </span>
              </div>
              <span className="message-content">{msg.content}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <div className="input-container">
          <span className="input-icon">✏️</span>
          <textarea
            className="message-input"
            placeholder="请输入消息..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!inputText.trim()}
          >
            发送
          </button>
        </div>
      </div>

      {/* 确认结束模态框 */}
      {showEndConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowEndConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">确认结束对话</h3>
            <p className="modal-message">确定要结束当前的教学对话吗？</p>
            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => setShowEndConfirmModal(false)}
              >
                取消
              </button>
              <button
                className="btn-confirm"
                onClick={handleRequestEnd}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 收到结束申请模态框 */}
      {showEndRequestModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">对方申请结束教学</h3>
            <p className="modal-message">对方希望结束当前的教学对话</p>
            <div className="modal-buttons">
              <button
                className="btn-reject"
                onClick={handleRejectEnd}
              >
                拒绝
              </button>
              <button
                className="btn-confirm"
                onClick={handleAcceptEnd}
              >
                同意
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 总结模态框 */}
      {showSummaryModal && summary && (
        <div className="modal-overlay">
          <div className="modal-content summary-modal">
            <h3 className="modal-title">教学对话总结</h3>

            {/* 整体评价 */}
            {summary.summary_text && (
              <div className="summary-section">
                <h4 className="summary-section-title">整体评价</h4>
                <p className="summary-text">{summary.summary_text}</p>
              </div>
            )}

            {/* 亮点 */}
            {summary.highlights && summary.highlights.length > 0 && (
              <div className="summary-section">
                <h4 className="summary-section-title">🌟 教学亮点</h4>
                <ul className="summary-list">
                  {summary.highlights.map((highlight, index) => (
                    <li key={index} className="summary-item">
                      <span className="highlight-category">{highlight.category}:</span>
                      <span className="highlight-description">{highlight.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 改进建议 */}
            {summary.improvements && summary.improvements.length > 0 && (
              <div className="summary-section">
                <h4 className="summary-section-title">💡 改进建议</h4>
                <ul className="summary-list">
                  {summary.improvements.map((improvement, index) => (
                    <li key={index} className="summary-item">
                      <span className="improvement-type">{improvement.type}:</span>
                      <span className="improvement-suggestion">{improvement.suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 核心知识点 */}
            {summary.key_learnings && summary.key_learnings.length > 0 && (
              <div className="summary-section">
                <h4 className="summary-section-title">📚 核心知识点</h4>
                <ul className="summary-list">
                  {summary.key_learnings.map((learning, index) => (
                    <li key={index} className="summary-item learning-item">
                      {learning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 统计信息 */}
            {summary.statistics && (
              <div className="summary-section summary-stats">
                <h4 className="summary-section-title">📊 对话统计</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">总轮次数</span>
                    <span className="stat-value">{summary.statistics.totalRounds || 0}</span>
                  </div>
                  {summary.statistics.roundsWithError > 0 && (
                    <div className="stat-item">
                      <span className="stat-label">发现错误的轮次</span>
                      <span className="stat-value stat-value-warning">{summary.statistics.roundsWithError}</span>
                    </div>
                  )}
                  {summary.statistics.errorCount > 0 && (
                    <div className="stat-item">
                      <span className="stat-label">错误总数</span>
                      <span className="stat-value stat-value-error">{summary.statistics.errorCount}</span>
                    </div>
                  )}
                  {summary.statistics.averageConfidence > 0 && (
                    <div className="stat-item">
                      <span className="stat-label">平均置信度</span>
                      <span className="stat-value">
                        {(summary.statistics.averageConfidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 整体评级 */}
            {summary.overall_rating && (
              <div className="summary-rating">
                <span className="rating-label">整体评级：</span>
                <span className={`rating-badge rating-${summary.overall_rating}`}>
                  {summary.overall_rating === 'excellent' && '优秀'}
                  {summary.overall_rating === 'good' && '良好'}
                  {summary.overall_rating === 'fair' && '一般'}
                  {summary.overall_rating === 'needs_improvement' && '需要改进'}
                </span>
              </div>
            )}

            <div className="modal-buttons">
              <button
                className="btn-confirm"
                onClick={() => {
                  setShowSummaryModal(false);
                  setSummary(null);
                }}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 轮次审查中提示 */}
      {isReviewing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="loading-spinner">⏳</div>
            <h3 className="modal-title">正在进行轮次审查...</h3>
            <p className="modal-message">正在分析对话内容，请稍候</p>
          </div>
        </div>
      )}

      {/* 生成总结中提示 */}
      {isSummarizing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="loading-spinner">⏳</div>
            <h3 className="modal-title">正在生成总结...</h3>
            <p className="modal-message">正在分析对话并生成教学总结，请稍候</p>
          </div>
        </div>
      )}
      <FeatureTipModal
        visible={showTipModal}
        title="对话交流使用说明"
        features={dialogueFeatures}
        notes={dialogueNotes}
        onClose={handleCloseModal}
      />      
    </div>
  );
};

export default Dialogue;
