import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import "./dialogue.css";

const Dialogue = () => {
  const { pairId } = useParams();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastMessageId, setLastMessageId] = useState(null); // 记录最后一条消息的ID，用于去重
  const [pairStatus, setPairStatus] = useState(null); // 结对状态
  const [endRequestedBy, setEndRequestedBy] = useState(null); // 谁申请结束
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false); // 显示确认模态框
  const [showEndRequestModal, setShowEndRequestModal] = useState(false); // 显示收到申请的模态框
  const currentUserId = parseInt(localStorage.getItem("userId")) || null;
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null); // 轮询定时器引用

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

    // 清理函数：组件卸载时停止轮询
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [pairId]);

  useEffect(() => {
    scrollToBottom();
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
        alert("已同意结束教学");
        // 可以在这里跳转到其他页面
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

      <div className="messages-area">
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
              <span className="message-avatar">
                {msg.sender_id === currentUserId ? "👤" : "👥"}
              </span>
              <div className="message-wrapper">
                <span className="message-sender">
                  {msg.sender_nickname || (msg.sender_id === currentUserId ? "我" : "对方")}
                </span>
                <span className="message-content">{msg.content}</span>
              </div>
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
    </div>
  );
};

export default Dialogue;