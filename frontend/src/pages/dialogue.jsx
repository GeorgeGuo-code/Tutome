import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import "./dialogue.css";

const Dialogue = () => {
  const { pairId } = useParams();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentUserId = parseInt(localStorage.getItem("userId")) || null;
  const messagesEndRef = useRef(null);

  // 验证 Pair ID
  useEffect(() => {
    if (!pairId || isNaN(parseInt(pairId))) {
      setError("无效的结对 ID");
      setLoading(false);
    } else {
      fetchMessages();
    }
  }, [pairId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("请先登录");
        setLoading(false);
        return;
      }

      console.log('Fetching messages for pairId:', pairId);
      console.log('Token:', token.substring(0, 20) + '...');

      const response = await fetch(
        `http://localhost:3000/api/chats/${pairId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || errorData.error || `获取消息失败 (${response.status})`);
      }

      const data = await response.json();
      console.log('Messages data:', data); // 调试信息
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError(error.message || "获取消息失败");
    } finally {
      setLoading(false);
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
      fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      setError(error.message || "发送消息失败");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="dialogue-container">
      <div className="dialogue-header">
        <h2 className="dialogue-title">对话</h2>
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
    </div>
  );
};

export default Dialogue;