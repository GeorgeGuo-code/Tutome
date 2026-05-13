import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './PreSessionQuiz.css';

const PreSessionQuiz = () => {
  const { pairId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(() => {
    // 从 sessionStorage 恢复剩余时间
    const saved = sessionStorage.getItem(`preQuiz_timeLeft_${pairId}`);
    return saved ? parseInt(saved) : 120;
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // 获取题目
  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/survey/pre/${pairId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // 检查响应类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API 返回的不是 JSON:', text.slice(0, 200));
        setError('服务器响应格式错误');
        return;
      }

      const result = await response.json();

      console.log('[PreSessionQuiz] API 返回数据:', JSON.stringify(result, null, 2));

      if (result.success) {
        setQuestions(result.data.questions || []);

        // 如果题目已生成且用户已回答完所有题目，才标记已提交
        // 只有当有题目（questions.length > 0）且用户回答数等于题目数时，才算已完成
        if (result.data.questions && result.data.questions.length > 0 && result.data.completed) {
          setSubmitted(true);
        }
      } else {
        setError(result.error || '获取题目失败');
      }
    } catch (err) {
      console.error('获取题目失败:', err);
      setError('获取题目失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // 题目未生成时，自动刷新直到获取到题目
  useEffect(() => {
    // 当正在加载、或已有题目、或已有错误时，不需要自动刷新
    if (loading || questions.length > 0 || error) {
      return;
    }

    // 题目尚未生成，设置定时器自动刷新
    const refreshTimer = setInterval(() => {
      console.log('[PreSessionQuiz] 题目尚未生成，自动刷新...');
      fetchQuestions();
    }, 3000); // 每3秒检查一次

    return () => clearInterval(refreshTimer);
  }, [loading, questions.length, error, fetchQuestions]);

  // 计时器
  useEffect(() => {
    if (submitted || timeLeft <= 0) return;

    // 保存剩余时间到 sessionStorage
    sessionStorage.setItem(`preQuiz_timeLeft_${pairId}`, timeLeft.toString());

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        const newTime = prev - 1;
        sessionStorage.setItem(`preQuiz_timeLeft_${pairId}`, newTime.toString());
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted, timeLeft, pairId]);

  // 处理选项选择
  const handleSelect = (questionId, index) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: index
    }));
  };

  // 提交回答
  const handleSubmit = async (isTimeout = false) => {
    if (submitting || submitted) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      // 提交每个答案
      for (const [questionId, selectedIndex] of Object.entries(answers)) {
        const response = await fetch('/api/survey/pre/respond', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            pairId: parseInt(pairId),
            questionId: parseInt(questionId),
            selectedIndex: selectedIndex
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `提交失败 (${response.status})`);
        }
      }

      setSubmitted(true);
      // 清除 sessionStorage
      sessionStorage.removeItem(`preQuiz_timeLeft_${pairId}`);

      if (!isTimeout) {
        // 正常提交后跳转
        setTimeout(() => {
          navigate(`/dialogue/${pairId}`);
        }, 1500);
      }
    } catch (err) {
      console.error('提交失败:', err);
      setError(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 检查是否全部作答
  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] !== undefined);

  console.log('[PreSessionQuiz] 当前状态:', { questionsLength: questions.length, questions, answers });

  // 解析题目数据
  const parseQuestionData = (q) => {
    console.log('[PreSessionQuiz] parseQuestionData 输入, q.question:', q.question, '类型:', typeof q.question);
    try {
      // q.question 可能是对象（数据库JSONB返回）或字符串（JSON字符串）或缺失
      if (!q.question) {
        console.log('[PreSessionQuiz] question 为空');
        return { question: '题目内容为空', options: [] };
      }

      let parsed;
      if (typeof q.question === 'object') {
        console.log('[PreSessionQuiz] question 是对象, 直接返回');
        parsed = q.question;
      } else if (typeof q.question === 'string') {
        console.log('[PreSessionQuiz] question 是字符串, 尝试解析');
        if (!q.question.trim()) {
          return { question: '题目内容为空', options: [] };
        }
        parsed = JSON.parse(q.question);
        console.log('[PreSessionQuiz] 解析后结果:', parsed);
      } else {
        console.log('[PreSessionQuiz] question 类型未知:', typeof q.question);
        return { question: '题目格式错误', options: [] };
      }

      // 确保返回的结构正确
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.options)) {
        return parsed;
      } else {
        console.log('[PreSessionQuiz] 解析后结构不对, parsed:', parsed);
        // 如果结构不对，尝试从q直接获取
        return {
          question: parsed.question || parsed.q || String(parsed),
          options: parsed.options || parsed.choices || []
        };
      }
    } catch (e) {
      console.error('解析题目失败:', q.question, e);
      return { question: '题目加载失败', options: [] };
    }
  };

  if (loading) {
    return (
      <div className="pre-quiz-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  // 如果没有题目（热身问卷尚未生成），显示等待提示
  if (!loading && questions.length === 0 && !error) {
    return (
      <div className="pre-quiz-container">
        <div className="quiz-header">
          <h1>热身测试</h1>
        </div>
        <div className="empty-questions">
          <p>热身题目正在生成中，请稍候...</p>
          <p className="hint">系统将在题目生成完毕后自动显示</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pre-quiz-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="pre-quiz-container">
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h2>已提交</h2>
          <p>你的回答已记录，对话即将开始...</p>
          <p className="hint">（不显示答案，保持学习好奇心）</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pre-quiz-container">
      <div className="quiz-header">
        <h1>热身测试</h1>
        <div className="timer">
          <span className={timeLeft <= 30 ? 'warning' : ''}>
            剩余时间: {formatTime(timeLeft)}
          </span>
        </div>
        <p className="quiz-info">
          共 {questions.length} 题，选择后自动保存，提交后不显示答案
        </p>
      </div>

      <div className="questions-list">
        {questions.map((q, index) => {
          const qData = parseQuestionData(q);
          console.log('[PreSessionQuiz] 渲染题目:', index, 'qData:', JSON.stringify(qData));
          return (
            <div key={q.id} className="question-card">
              <div className="question-number">题目 {index + 1}</div>
              <div className="question-text">{qData.question}</div>
              <div className="options-list">
                {qData.options && qData.options.length > 0 ? (
                  qData.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`option ${answers[q.id] === optIndex ? 'selected' : ''}`}
                      onClick={() => handleSelect(q.id, optIndex)}
                    >
                      <span className="option-letter">
                        {String.fromCharCode(65 + optIndex)}
                      </span>
                      <span className="option-text">{option}</span>
                    </div>
                  ))
                ) : (
                  <div className="no-options">
                    该题目的选项未生成，请尝试刷新或跳过
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="quiz-footer">
        <button
          className="submit-btn"
          disabled={!allAnswered || submitting}
          onClick={() => handleSubmit(false)}
        >
          {submitting ? '提交中...' : '提交并开始对话'}
        </button>
        {!allAnswered && (
          <p className="hint">请完成所有题目后再提交</p>
        )}
      </div>
    </div>
  );
};

export default PreSessionQuiz;