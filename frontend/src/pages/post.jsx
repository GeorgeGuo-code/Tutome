import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./post.css";

const Post = () => {
  const [question, setQuestion] = useState(null);
  const [questionId, setQuestionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validPairId, setValidPairId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 从URL获取问题ID
    const pathParts = window.location.pathname.split("/");
    const id = pathParts[pathParts.length - 1];
    setQuestionId(id);
    fetchQuestion(id);
  }, []);

  useEffect(() => {
    if (questionId) {
      fetchValidPairs();
    }
  }, [questionId]);

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

  const fetchValidPairs = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      // 首先尝试根据问题ID查找结对
      if (questionId) {
        const response = await fetch(`http://localhost:3000/api/pairs/question/${questionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const pair = await response.json();
          console.log('问题结对:', pair);
          if (pair) {
            setValidPairId(pair.id);
            console.log('找到问题结对:', pair.id);
            return;
          }
        }

        // 如果没找到结对，尝试查找任何可用的结对并自动关联
        console.log('该问题暂无结对，尝试自动关联...');
        
        const allPairsResponse = await fetch(`http://localhost:3000/api/pairs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (allPairsResponse.ok) {
          const pairs = await allPairsResponse.json();
          const activePair = pairs.find(pair => pair.status === 'active');
          
          if (activePair) {
            console.log('找到可用结对，正在自动关联:', activePair.id);
            
            // 自动关联结对到问题
            const associateResponse = await fetch(`http://localhost:3000/api/pairs/${activePair.id}/associate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                questionId: parseInt(questionId)
              }),
            });

            if (associateResponse.ok) {
              console.log('自动关联成功');
              setValidPairId(activePair.id);
            } else {
              console.error('自动关联失败');
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching pair by question:", error);
    }
  };

  const handleDialogueClick = (e) => {
    e.preventDefault();
    if (validPairId) {
      navigate(`/dialogue/${validPairId}`);
    } else {
      alert('请先创建有效的结对');
      navigate('/match');
    }
  };

  const handleBack = () => {
    // 从 location.state 获取来源页面
    const fromPage = location.state?.from || '/browse';
    navigate(fromPage);
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
        <button className="back-btn" onClick={handleBack}>←</button>
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
          <button onClick={handleDialogueClick} className="dialogue-btn">
            {validPairId ? '发起对话' : '创建结对'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Post;