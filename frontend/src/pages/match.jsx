import React, { useState } from "react";
import "./match.css";

const Match = () => {
  const [subject, setSubject] = useState("");
  const [progress, setProgress] = useState("入门");
  const [preference, setPreference] = useState("课堂/智云");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("正在匹配...");

    try {
      // 这里调用匹配API
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/pairs/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          progress,
          preference,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("匹配成功!");
      } else {
        setMessage(data.message || "匹配失败");
      }
    } catch (error) {
      setMessage("服务器错误,请稍后重试");
      console.error("Error:", error);
    }
  };

  return (
    <div className="match-container">
      <div className="match-content">
        <h1 className="match-title">匹配</h1>

        <form className="match-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-label">学科</label>
            <input
              type="text"
              className="form-input"
              placeholder="输入学科"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label">学习进度</label>
            <select
              className="form-select"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
            >
              <option value="入门">入门</option>
              <option value="进阶">进阶</option>
              <option value="精通">精通</option>
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">学习偏好</label>
            <select
              className="form-select"
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
            >
              <option value="课堂/智云">课堂/智云</option>
              <option value="一对一">一对一</option>
              <option value="小组学习">小组学习</option>
            </select>
          </div>

          {message && <p className="message">{message}</p>}

          <button type="submit" className="submit-btn">
            提交
          </button>
        </form>
      </div>
    </div>
  );
};

export default Match;