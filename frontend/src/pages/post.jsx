import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./post.css";

const Post = () => {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 尝试从 location.state 获取问题数据
    if (location.state && location.state.question) {
      setQuestion(location.state.question);
      setLoading(false);
      return;
    }

    // 如果没有传递数据，则尝试从后端获取
    const pathParts = window.location.pathname.split("/");
    const id = pathParts[pathParts.length - 1];
    fetchQuestion(id);
  }, [location]);

  const fetchQuestion = async (id) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json"
      };

      // 如果有 token，添加到请求头
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`http://localhost:3000/api/questions/${id}`, {
        headers
      });

      const data = await response.json();
      console.log('Question data:', data);

      if (data.success === false) {
        // 如果接口需要认证但用户未登录，跳转到登录页
        if (data.message === 'No token provided' || data.message === 'Invalid or expired token') {
          alert('请先登录查看详情');
          navigate('/login');
          return;
        }
      }

      setQuestion(data);
    } catch (error) {
      console.error("Error fetching question:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/browse");
  };

  if (loading) {
    return <div className="post-container">加载中...</div>;
  }

  if (!question) {
    return <div className="post-container">问题不存在</div>;
  }

  return (
    <div className="post-container">
      <div className="post-header">
        <button className="back-btn" onClick={handleBack}>← 返回</button>
      </div>

      <div className="post-content">
        <div className="post-card">
          <h1 className="post-title">{question.title}</h1>

          {question.tags && question.tags.length > 0 && (
            <div className="post-tags">
              {question.tags.map((tag) => (
                <span key={tag.id} className="tag">{tag.name}</span>
              ))}
            </div>
          )}

          <div className="post-meta">
            <span className="post-author">发布者: {question.username || question.user_name || '未知用户'}</span>
            <span className="post-time">
              {question.created_at || question.createdat || question.create_time ?
                new Date(question.created_at || question.createdat || question.create_time).toLocaleString('zh-CN') :
                '未知时间'}
            </span>
          </div>

          <div className="post-body">
            <p className="post-text">{question.content}</p>
          </div>
        </div>

        <div className="post-actions">
          <Link to="/dialogue/new" className="dialogue-btn">发起对话</Link>
        </div>
      </div>
    </div>
  );
};

export default Post;