import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./post.css";

const Post = () => {
  const [question, setQuestion] = useState(null);
  const [questionId, setQuestionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validPairId, setValidPairId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 学科到 topicId 的映射
  const subjectToTopicId = {
    '数学': 1,
    '英语': 2,
    '编程语言': 3,
    '物理': 4,
    '化学': 5,
    '生物': 6,
    '经管/社科': 7,
    '电子与工程': 8,
    '科研': 9,
    '其他': 10
  };

  // 从 token 中获取当前用户ID
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      // 解析 JWT token（简化版，实际项目中应该使用更安全的方法）
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.id;
    } catch (error) {
      console.error('解析 token 失败:', error);
      return null;
    }
  };

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

      // 如果有 token，添加到请求头并获取当前用户ID
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        setCurrentUserId(getCurrentUserId());
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

      // 只查找问题关联的结对
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
          }
        }
      }
    } catch (error) {
      console.error("Error fetching pair by question:", error);
    }
  };

  const handleDialogueClick = async (e) => {
    e.preventDefault();

    // 如果已经有结对，直接跳转到对话页面
    if (validPairId) {
      navigate(`/dialogue/${validPairId}`);
      return;
    }

    // 检查发布者和当前用户是否相同
    if (!currentUserId || !question) {
      alert('请先登录');
      navigate('/login');
      return;
    }

    const publisherId = question.user_id;

    if (currentUserId === publisherId) {
      alert('不能与自己结对！');
      return;
    }

    // 创建结对
    try {
      const token = localStorage.getItem("token");

      // 从问题的标签中获取学科
      let subjectTag = null;
      if (question.tags && question.tags.length > 0) {
        // 查找学科类型的标签
        subjectTag = question.tags.find(tag =>
          tag.category === 'subject' && subjectToTopicId[tag.name]
        );
      }

      // 如果找不到学科标签，使用默认值（数学）
      const topicId = subjectTag ? subjectToTopicId[subjectTag.name] : 1;

      // 根据问题的 role 确定当前用户的角色
      // 如果提问者是 student，当前用户就是 teacher，反之亦然
      const questionRole = question.role || 'student';
      const userRole = questionRole === 'student' ? 'teacher' : 'student';

      const response = await fetch('http://localhost:3000/api/pairs/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: publisherId,
          topicId: topicId,
          role: userRole
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 创建成功，关联问题到结对
        const pairId = data.id;

        // 关联问题到结对
        const associateResponse = await fetch(`http://localhost:3000/api/pairs/${pairId}/associate`, {
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
          setValidPairId(pairId);
          navigate(`/dialogue/${pairId}`);
        } else {
          alert('结对创建成功，但关联问题失败，请重试');
        }
      } else {
        alert(data.error || data.message || '创建结对失败，请重试');
      }
    } catch (error) {
      console.error('创建结对失败:', error);
      alert('服务器错误，请稍后重试');
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
            {validPairId ? '继续对话' : '创建结对'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Post;