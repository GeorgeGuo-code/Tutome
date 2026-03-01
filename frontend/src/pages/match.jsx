import React, { useState } from "react";
import "./match.css";

const Match = () => {
  const [subject, setSubject] = useState("");
  const [progress, setProgress] = useState("入门");
  const [preference, setPreference] = useState("课堂/智云");
  const [role, setRole] = useState("student");
  const [message, setMessage] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);

  // 数据库中的真实用户
  const realUsers = [
    { id: 1, username: "lg" },
    { id: 2, username: "lh" },
  ];

  const handleSearchUsers = async (e) => {
    e.preventDefault();
    setMessage("正在搜索可用用户...");

    try {
      // 获取当前用户ID
      const currentUserId = localStorage.getItem("userId");
      
      // 过滤掉当前用户
      const filteredUsers = realUsers.filter(user => user.id !== parseInt(currentUserId));
      
      if (filteredUsers.length === 0) {
        setMessage("没有可用的用户");
      } else {
        setAvailableUsers(filteredUsers);
        setShowUsers(true);
        setMessage("");
      }
    } catch (error) {
      setMessage("搜索失败，请稍后重试");
      console.error("Error:", error);
    }
  };

  const handleSelectUser = async (targetUser) => {
    setMessage(`正在向 ${targetUser.username} 发送结对申请...`);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/pairs/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          topicId: 1, // 临时使用固定的topicId
          role,
        }),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (response.ok) {
        setMessage(
          <div>
            <div>成功向 {targetUser.username} 发送结对申请！</div>
            <div className="pair-info">结对 ID: {data.id}</div>
            <button 
              className="enter-dialogue-btn"
              onClick={() => window.location.href = `/dialogue/${data.id}`}
            >
              进入对话
            </button>
          </div>
        );
      } else {
        setMessage(data.message || data.error || "申请失败");
      }
    } catch (error) {
      setMessage("服务器错误,请稍后重试");
      console.error("Error:", error);
    }
  };

  const handleBack = () => {
    setShowUsers(false);
    setMessage("");
  };

  if (showUsers) {
    return (
      <div className="match-container">
        <div className="match-content">
          <h1 className="match-title">可用用户</h1>
          
          <button className="back-btn" onClick={handleBack}>
            ←
          </button>

          <div className="users-list">
            {availableUsers.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-info">
                  <h3 className="user-name">{user.username}</h3>
                </div>
                <button 
                  className="select-btn"
                  onClick={() => handleSelectUser(user)}
                >
                  选择
                </button>
              </div>
            ))}
          </div>

          {message && <p className="message">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="match-container">
      <div className="match-content">
        <h1 className="match-title">匹配</h1>

        <form className="match-form" onSubmit={handleSearchUsers}>
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
            <label className="form-label">角色</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="student">学生</option>
              <option value="teacher">老师</option>
            </select>
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
              <option value="网课">网课</option>
              <option value="书籍">书籍</option>
              <option value="教程">教程</option>
              <option value="练习">练习</option>
            </select>
          </div>

          {message && <p className="message">{message}</p>}

          <button type="submit" className="submit-btn">
            搜索用户
          </button>
        </form>
      </div>
    </div>
  );
};

export default Match;