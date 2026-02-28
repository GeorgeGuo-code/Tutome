import React, { useState, useEffect, useRef } from "react";
import "./dialogue.css";

const Dialogue = ({ pairId }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
  }, [pairId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/pairs/${pairId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/pairs/${pairId}/messages`,
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

      if (response.ok) {
        setInputText("");
        fetchMessages();
      }
    } catch (error) {
      console.error("Error sending message:", error);
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
                msg.isMine ? "right" : "left"
              }`}
            >
              <span className="message-avatar">
                {msg.isMine ? "👤" : "🤖"}
              </span>
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
            placeholder="请输入"
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
            ✉️
          </button>
        </div>
        <div className="input-actions">
          <span className="action-icon">□•</span>
          <span className="action-icon">💬</span>
        </div>
      </div>
    </div>
  );
};

export default Dialogue;