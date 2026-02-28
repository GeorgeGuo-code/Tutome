import React, { useState, useEffect } from "react";
import "./post.css";

const Post = () => {
  const [questionId, setQuestionId] = useState(null);
  const [question, setQuestion] = useState(null);

  useEffect(() => {
    // 从URL获取问题ID
    const pathParts = window.location.pathname.split("/");
    const id = pathParts[pathParts.length - 1];
    setQuestionId(id);
    fetchQuestion(id);
  }, []);

  const fetchQuestion = async (id) => {
    try {
      const response = await fetch(`http://localhost:3000/api/questions/${id}`);
      const data = await response.json();
      setQuestion(data);
    } catch (error) {
      console.error("Error fetching question:", error);
    }
  };

  if (!question) {
    return <div className="post-container">加载中...</div>;
  }

  return (
    <div className="post-container">
      <div className="post-header">
        <button className="back-btn">←</button>
        <button className="view-toggle">□</button>
      </div>

      <div className="post-content">
        <div className="post-card">
          <h1 className="post-title">标题</h1>
          <div className="post-body">
            <p className="post-text">
              正文选中你的「单行输入」组件
            </p>
            <p className="post-text">
              在右侧「属性」面板中,找到「绑定变量」或「数据绑定」选项选择你刚创建的变量:searchKeyword
            </p>
          </div>
          <div className="post-footer">
            <span className="post-end">结尾</span>
          </div>
        </div>

        <div className="post-actions">
          <button className="dialogue-btn">对话</button>
        </div>
      </div>
    </div>
  );
};

export default Post;