import React, { useState } from "react";
import "./ask.css";

const Ask = () => {
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("发布中...");

    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("请先登录");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          tagIds: [], // 可以扩展标签功能
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("发布成功!");
        setTimeout(() => {
          setTitle("");
          setContent("");
          setSubject("");
          setMessage("");
        }, 2000);
      } else {
        setMessage(data.message || "发布失败");
      }
    } catch (error) {
      setMessage("服务器错误,请稍后重试");
      console.error("Error:", error);
    }
  };

  return (
    <div className="ask-container">
      <div className="ask-content">
        <h1 className="ask-title">提问</h1>

        <form className="ask-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">学科</label>
            <select
              className="form-select"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            >
              <option value="">全部</option>
              <option value="math">数学</option>
              <option value="english">英语</option>
              <option value="programming">编程语言</option>
              <option value="physics">物理</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">标题</label>
            <input
              type="text"
              className="form-input"
              placeholder="输入标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">疑问</label>
            <textarea
              className="form-textarea"
              placeholder="请输入"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows="8"
            />
          </div>

          {message && <p className="message">{message}</p>}

          <button type="submit" className="submit-btn">
            发布
          </button>
        </form>
      </div>
    </div>
  );
};

export default Ask;