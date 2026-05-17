import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./post.css";

const Post = () => {
  const [question, setQuestion] = useState(null);
  const [questionId, setQuestionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validPairId, setValidPairId] = useState(null);
  const [pairStatus, setPairStatus] = useState(null); // 结对状态
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState(null);
  const [targetPage, setTargetPage] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [surveyFeedback, setSurveyFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);

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

      const response = await fetch(`/api/questions/${id}`, {
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
        const response = await fetch(`/api/pairs/question/${questionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const pair = await response.json();
          console.log('问题结对:', pair);
          if (pair) {
            setValidPairId(pair.id);
            setPairStatus(pair.status); // 设置结对状态
            console.log('找到问题结对:', pair.id, '状态:', pair.status);
          } else {
            setValidPairId(null);
            setPairStatus(null); // 没有结对
          }
        } else {
          setValidPairId(null);
          setPairStatus(null);
        }
      }
    } catch (error) {
      console.error("Error fetching pair by question:", error);
    }
  };

  // 获取对话总结
  const fetchSummary = async (pairId) => {
    setSummaryLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert('请先登录');
        return;
      }

      const response = await fetch(
        `/api/ai/summary/${pairId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || '获取总结失败');
      }

      const data = await response.json();
      console.log('总结数据:', data);

      if (data.success) {
        if (data.data) {
          setSummaryData(data.data);
          setShowSummaryModal(true);
        } else {
          alert('暂无总结内容');
        }
      } else {
        alert(data.message || '获取总结失败');
      }
    } catch (error) {
      console.error('获取总结失败:', error);
      alert(error.message || '获取总结失败');
    } finally {
      setSummaryLoading(false);
    }
  };

  // 获取问卷反馈
  const fetchSurveyFeedback = async (pairId) => {
    setFeedbackLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `/api/survey/post/${pairId}/feedback`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSurveyFeedback(data.data);
        }
      }
    } catch (error) {
      console.error('获取问卷反馈失败:', error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleDialogueClick = async (e) => {
    e.preventDefault();

    // 如果已经有结对
    if (validPairId) {
      // 如果结对申请尚未被接受，提示用户
      if (pairStatus === 'pending') {
        alert('结对申请尚未被接受，请等待对方确认');
        return;
      }
      // 如果结对已结束，提示用户
      if (pairStatus === 'completed') {
        alert('该问题已结束教学，无法重新结对');
        return;
      }
      // 否则跳转到对话页面
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

      const response = await fetch('/api/pairs/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: publisherId,
          topicId: topicId,
          role: userRole,
          questionId: parseInt(questionId)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`✅ 已向 ${question.username || question.user_name} 发起结对申请\n\n请前往"个人中心"的"我的通知"查看对方是否同意`);
        setTargetPage('/browse');
      } else {
        setSuccessMessage(data.error || data.message || '创建结对失败，请重试');
        setTargetPage(null);
      }
    } catch (error) {
      console.error('创建结对失败:', error);
      setSuccessMessage('服务器错误，请稍后重试');
      setTargetPage(null);
    }
  };

  const handleBack = () => {
    // 从 location.state 获取来源页面
    const fromPage = location.state?.from || '/browse';
    const activeTab = location.state?.activeTab;
    if (activeTab) {
      navigate(fromPage, { state: { activeTab } });
    } else {
      navigate(fromPage);
    }
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
          {pairStatus === 'completed' && validPairId ? (
            <>
              <Link
                to={`/dialogue/${validPairId}`}
                className="dialogue-btn view-dialogue-link"
              >
                查看对话
              </Link>
              <button
                onClick={() => {
                  fetchSummary(validPairId);
                  fetchSurveyFeedback(validPairId);
                }}
                className="dialogue-btn"
                disabled={summaryLoading}
                style={{ marginLeft: '10px' }}
              >
                {summaryLoading ? '加载中...' : '查看总结'}
              </button>
            </>
          ) : (
            <button
              onClick={handleDialogueClick}
              className="dialogue-btn"
              disabled={pairStatus === 'completed'}
              style={{
                backgroundColor: pairStatus === 'completed' ? '#9CA3AF' : undefined,
                cursor: pairStatus === 'completed' ? 'not-allowed' : undefined
              }}
            >
              {validPairId ? '继续对话' : '创建结对'}
            </button>
          )}
        </div>
      </div>

      {/* 成功提示弹窗 */}
      {successMessage && (
        <div className="success-modal-mask" onClick={() => {}}>
          <div className="success-modal">
            <div className="success-modal-icon">✓</div>
            <div className="success-modal-message">{successMessage}</div>
            <div className="success-modal-actions">
              <button
                className="success-modal-btn"
                onClick={() => {
                  setSuccessMessage(null);
                  if (targetPage) {
                    navigate(targetPage);
                    setTargetPage(null);
                  }
                }}
              >
                好的
              </button>
              <button
                className="success-modal-btn success-modal-btn-secondary"
                onClick={() => {
                  setSuccessMessage(null);
                  setTargetPage(null);
                }}
              >
                返回
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 总结弹窗 */}
      {showSummaryModal && summaryData && (
        <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
          <div className="modal-content summary-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">教学对话总结</h3>

            {/* 整体评价 */}
            {summaryData.summary_text && (
              <div className="summary-section">
                <h4 className="summary-section-title">📝 整体评价</h4>
                <p className="summary-text">{summaryData.summary_text}</p>
              </div>
            )}

            {/* 核心知识点 */}
            {summaryData.key_learnings && summaryData.key_learnings.length > 0 && (
              <div className="summary-section">
                <h4 className="summary-section-title">📚 核心知识点</h4>
                <ul className="summary-list">
                  {summaryData.key_learnings.map((learning, index) => (
                    <li key={index} className="summary-item learning-item">
                      {learning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 问题汇总 */}
            {summaryData.problem_summary && summaryData.problem_summary.length > 0 && (
              <div className="summary-section">
                <h4 className="summary-section-title">⚠️ 问题汇总</h4>
                <ul className="summary-list">
                  {summaryData.problem_summary.map((problem, index) => (
                    <li key={index} className="summary-item problem-item">
                      {problem}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 相关链接 */}
            {summaryData.related_links && summaryData.related_links.length > 0 && (
              <div className="summary-section">
                <h4 className="summary-section-title">🔗 相关学习资源</h4>
                <ul className="summary-list">
                  {summaryData.related_links.map((link, index) => (
                    <li key={index} className="summary-item link-item">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.title}
                      </a>
                      {link.description && <span className="link-description"> - {link.description}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 问卷反馈区域 - 无论是否填写都显示 */}
            <div className="feedback-section">
              <div
                className="feedback-toggle"
                onClick={() => {
                  if (!surveyFeedback || surveyFeedback.score === undefined) {
                    // 未填写，跳转到问卷页面
                    navigate(`/quiz/post/${validPairId}`);
                  } else {
                    setFeedbackExpanded(!feedbackExpanded);
                  }
                }}
              >
                <span className="feedback-toggle-text">📋 问卷反馈</span>
                {surveyFeedback && surveyFeedback.score !== undefined ? (
                  <>
                    <span className="feedback-toggle-icon">
                      正确率：{(surveyFeedback.score * 100).toFixed(0)}%
                    </span>
                    <span className="feedback-toggle-arrow">{feedbackExpanded ? '∧' : '›'}</span>
                  </>
                ) : (
                  <span className="feedback-toggle-arrow">点击填写 ›</span>
                )}
              </div>

              {feedbackExpanded && surveyFeedback && surveyFeedback.wrongQuestions && (
                <div className="feedback-content">
                  {surveyFeedback.wrongQuestions.length > 0 ? (
                    <>
                      <div className="feedback-title">错误题目分析</div>
                      {surveyFeedback.wrongQuestions.map((item, index) => (
                        <div key={index} className="feedback-wrong-item">
                          <div className="feedback-wrong-question">
                            <span className="feedback-wrong-label">题目：</span>
                            {item.question}
                          </div>
                          <div className="feedback-wrong-answer">
                            <span className="feedback-wrong-label">我的答案：</span>
                            {item.myAnswer}
                          </div>
                          <div className="feedback-wrong-explanation">
                            <span className="feedback-wrong-label">解析：</span>
                            {item.explanation}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="feedback-empty">恭喜！全部答对</div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-buttons">
              <button
                className="btn-confirm"
                onClick={() => setShowSummaryModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Post;