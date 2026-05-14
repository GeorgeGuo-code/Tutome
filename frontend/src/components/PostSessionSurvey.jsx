import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { parseLatexContent } from '../utils/renderLatex';
import './PostSessionSurvey.css';

const PostSessionSurvey = () => {
  const { pairId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const currentUserId = parseInt(localStorage.getItem('userId'));
  const [userRole, setUserRole] = useState(null); // 'teacher' or 'student'
  const [pairInfo, setPairInfo] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 获取问卷和用户角色
  const fetchSurvey = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // 获取结对信息以确定用户角色
      const pairResponse = await fetch(`/api/pairs/${pairId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (pairResponse.ok) {
        const pairData = await pairResponse.json();
        setPairInfo(pairData);
        if (pairData.teacher_id === currentUserId) {
          setUserRole('teacher');
        } else if (pairData.student_id === currentUserId) {
          setUserRole('student');
        }
      }

      const response = await fetch(`/api/survey/post/${pairId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const res = await response.json();

      if (res.success && res.data) {
        // 检查是否已过期
        if (res.data.is_expired) {
          setError('问卷已过期');
        } else if (res.data.has_answered) {
          setSubmitted(true);
          setError('你已经提交过问卷');
        } else {
          setSurvey(res.data);
        }
      } else if (res.data === null) {
        // 还没有问卷，先生成
        setIsGenerating(true);
        const generateRes = await fetch(`/api/survey/post/${pairId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const generateResult = await generateRes.json();
        if (generateResult.success && generateResult.data) {
          setSurvey(generateResult.data);
        } else {
          setError('生成问卷失败');
        }
      } else {
        setError(res.error || '获取问卷失败');
      }
    } catch (err) {
      setError('获取问卷失败');
    } finally {
      setLoading(false);
    }
  }, [pairId, currentUserId]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  // 处理选项选择
  const handleSelect = (questionId, index) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: index
    }));
  };

  // 提交问卷
  const handleSubmit = async () => {
    if (submitting || submitted) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      // 构建答案列表
      const answersList = Object.entries(answers).map(([questionId, selectedIndex]) => ({
        question_id: parseInt(questionId),
        selected_index: selectedIndex
      }));

      const response = await fetch('/api/survey/post/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          surveyId: survey.id,
          answers: answersList
        })
      });

      const res = await response.json();

      if (res.success) {
        setSubmitted(true);
        setResult(res.data);
      } else {
        setError(res.error || '提交失败');
      }
    } catch (err) {
      setError('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 渲染结果
  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="result-container">
        <div className="result-header">
          <div className="score-circle">
            <span className="score-value">{Math.round(result.score * 100)}%</span>
          </div>
          <h2>测试完成</h2>
        </div>

        <div className="ai-review">
          <h3>AI 评价</h3>
          <p className="overall-comment">{result.ai_review.overall_comment}</p>
        </div>

        <div className="results-list">
          <h3>答题详情</h3>
          {result.results.map((r, idx) => {
            if (r.is_fixed) return null; // 跳过固定评价题
            const question = survey.questions.find(q => q.id === r.question_id);
            if (!question) return null;

            return (
              <div key={idx} className={`result-item ${r.is_correct ? 'correct' : 'incorrect'}`}>
                <div className="result-status">
                  {r.is_correct ? '✓' : '✗'}
                </div>
                <div className="result-content">
                  <p className="result-question">
                    {parseLatexContent(question.question).map((part, pIdx) =>
                      part.type === 'latex' ? (
                        <span
                          key={pIdx}
                          className={part.displayMode ? 'latex-display' : 'latex-inline'}
                          dangerouslySetInnerHTML={{ __html: part.content }}
                        />
                      ) : (
                        <span key={pIdx}>{part.content}</span>
                      )
                    )}
                  </p>
                  <p className="result-answer">
                    你的答案: {question.options[r.selected_index]}
                  </p>
                  {!r.is_correct && (
                    <p className="result-correct">
                      正确答案: {question.options[question.correct_index]}
                    </p>
                  )}
                  {r.feedback && (
                    <p className="result-feedback">{r.feedback}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button className="continue-btn" onClick={() => navigate('/personal')}>
          返回个人中心
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="post-survey-container">
        <div className="loading">{isGenerating ? '问卷生成中……' : '加载中...'}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="post-survey-container">
        <div className="error-message">
          <h2>{error}</h2>
          <button onClick={() => navigate('/personal')}>返回个人中心</button>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="post-survey-container">
        {renderResult()}
      </div>
    );
  }

  if (!survey || !survey.questions) {
    return (
      <div className="post-survey-container">
        <div className="error-message">
          <h2>暂无问卷</h2>
          <button onClick={() => navigate('/personal')}>返回个人中心</button>
        </div>
      </div>
    );
  }

  // 分离知识题和评价题
  const knowledgeQuestions = survey.questions.filter(q => !q.is_fixed);

  // 根据用户角色过滤评价题
  // 老师：看到"对学生"的评价题
  // 学生：看到"对老师"的评价题
  const myEvalQuestions = userRole === 'teacher'
    ? survey.questions.filter(q => q.component_type === 'student_evaluation')
    : survey.questions.filter(q => q.component_type === 'teacher_evaluation');
  const teachingEvalQuestions = survey.questions.filter(q => q.component_type === 'teaching_evaluation');

  // 计算需要回答的题目总数
  const totalQuestionsToAnswer = knowledgeQuestions.length + myEvalQuestions.length + teachingEvalQuestions.length;

  return (
    <div className="post-survey-container">
      <div className="survey-header">
        <h1>对话后测试</h1>
        <p>检验学习效果，完成后立即显示AI批改结果</p>
        {survey.expires_at && (
          <p className="expires-hint">
            有效期至: {new Date(survey.expires_at).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="survey-sections">
        {/* 知识题部分 */}
        <div className="section">
          <h2>知识题 ({knowledgeQuestions.length}题)</h2>
          <div className="questions-list">
            {knowledgeQuestions.map((q, idx) => (
              <div key={q.id} className="question-card">
                <div className="question-header">
                  <span className="question-number">题目 {idx + 1}</span>
                  <span className={`difficulty difficulty-${q.difficulty}`}>
                    {q.difficulty === 1 ? '基础' : q.difficulty === 2 ? '中等' : '进阶'}
                  </span>
                </div>
                <div className="question-text">
                  {parseLatexContent(q.question).map((part, pIdx) =>
                    part.type === 'latex' ? (
                      <span
                        key={pIdx}
                        className={part.displayMode ? 'latex-display' : 'latex-inline'}
                        dangerouslySetInnerHTML={{ __html: part.content }}
                      />
                    ) : (
                      <span key={pIdx}>{part.content}</span>
                    )
                  )}
                </div>
                <div className="options-list">
                  {q.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`option ${answers[q.id] === optIndex ? 'selected' : ''}`}
                      onClick={() => handleSelect(q.id, optIndex)}
                    >
                      <span className="option-letter">{String.fromCharCode(65 + optIndex)}</span>
                      <span className="option-text">
                        {parseLatexContent(option).map((part, pIdx) =>
                          part.type === 'latex' ? (
                            <span
                              key={pIdx}
                              className={part.displayMode ? 'latex-display' : 'latex-inline'}
                              dangerouslySetInnerHTML={{ __html: part.content }}
                            />
                          ) : (
                            <span key={pIdx}>{part.content}</span>
                          )
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 固定评价组件 - 根据用户角色显示对应的评价题 */}
        {myEvalQuestions.length > 0 && (
          <div className="section evaluation-section">
            <h2>{userRole === 'teacher' ? '对学生的评价' : '对老师的评价'}</h2>
            <div className="questions-list">
              {myEvalQuestions.map((q, idx) => (
                <div key={q.id} className="question-card evaluation-card">
                  <div className="question-text">{q.question}</div>
                  <div className="rating-options">
                    {[1, 2, 3, 4, 5].map(score => (
                      <div
                        key={score}
                        className={`rating-option ${answers[q.id] === score - 1 ? 'selected' : ''}`}
                        onClick={() => handleSelect(q.id, score - 1)}
                      >
                        <span className="rating-value">{score}</span>
                        <span className="rating-label">分</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {teachingEvalQuestions.length > 0 && (
          <div className="section evaluation-section">
            <h2>对本次教学的评价</h2>
            <div className="questions-list">
              {teachingEvalQuestions.map((q, idx) => (
                <div key={q.id} className="question-card evaluation-card">
                  <div className="question-text">{q.question}</div>
                  <div className="rating-options">
                    {[1, 2, 3, 4, 5].map(score => (
                      <div
                        key={score}
                        className={`rating-option ${answers[q.id] === score - 1 ? 'selected' : ''}`}
                        onClick={() => handleSelect(q.id, score - 1)}
                      >
                        <span className="rating-value">{score}</span>
                        <span className="rating-label">分</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="survey-footer">
        <button
          className="submit-btn"
          disabled={Object.keys(answers).length < totalQuestionsToAnswer || submitting}
          onClick={handleSubmit}
        >
          {submitting ? '提交中...' : '提交并查看结果'}
        </button>
        <button
          className="later-btn"
          onClick={() => navigate('/personal')}
        >
          稍后再回答
        </button>
        {Object.keys(answers).length < totalQuestionsToAnswer && (
          <p className="hint">
            请完成所有题目 (已回答: {Object.keys(answers).length}/{totalQuestionsToAnswer})
          </p>
        )}
      </div>
    </div>
  );
};

export default PostSessionSurvey;