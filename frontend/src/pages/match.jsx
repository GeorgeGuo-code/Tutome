import React, { useState, useEffect } from "react";
import "./match.css";
import FeatureTipModal from '../components/FeatureTipModal';
import socketService from '../services/socketService';

/** 开发时通过 Vite 代理访问 /api；与 apiService 一致可用环境变量覆盖 */
const apiUrl = (path) => {
  const base = import.meta.env.VITE_API_ORIGIN || '';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

const Match = () => {
  const [role, setRole] = useState("student");
  const [message, setMessage] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  /** @type {Array<object>} */
  const [matchPartners, setMatchPartners] = useState([]);
  const [seekingLabel, setSeekingLabel] = useState("");
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [questionsMine, setQuestionsMine] = useState([]);
  const [questionsTheirs, setQuestionsTheirs] = useState([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [targetPage, setTargetPage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [requireMatchingQuestions, setRequireMatchingQuestions] = useState(true);

  useEffect(() => {
    const hasSeenMatchTip = localStorage.getItem('hasSeenMatchTip');
    if (!hasSeenMatchTip) {
      setShowTipModal(true);
    }
  }, []);

  const handleCloseModal = () => {
    setShowTipModal(false);
    localStorage.setItem('hasSeenMatchTip', 'true');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    socketService.connect(token);

    socketService.on('user-online', (data) => {
      setOnlineUserIds(prev => new Set([...prev, data.userId]));
    });

    socketService.on('user-offline', (data) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    socketService.on('online-users', (data) => {
      setOnlineUserIds(new Set(data.users));
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const matchFeatures = [
    '根据双方学习偏好（感兴趣/擅长学科、难度偏好）与在线状态筛选',
    '学生找老师：我的求助题 或 对方的带学帖；老师找学生：我的带学帖 或 对方的求助题',
    '题目区分「我发布的 / 对方发布的」，并标注求助向、带学向',
    '任选一条合适题目即可发起结对申请',
  ];
  const matchNotes = [
    '匹配功能需登录后才能使用',
    '请在个人资料中完善感兴趣/擅长学科与难度偏好以提升匹配质量',
    '发起申请前可留意对方是否在线',
  ];

  // 学科到 topicId（结对申请用，需与后端 topics 表一致）
  const subjectToTopicId = {
    math: 1,
    physics: 4,
    chemistry: 5,
    biology: 6,
    programming: 3,
    economics: 7,
    engineering: 8,
    english: 2,
    research: 9,
    other: 10,
  };

  const subjectNameToKey = {
    数学: 'math',
    英语: 'english',
    编程与计算机: 'programming',
    编程语言: 'programming',
    物理: 'physics',
    化学: 'chemistry',
    生物: 'biology',
    经管/社科: 'economics',
    电子与工程: 'engineering',
    英语与学术写作: 'english',
    科研: 'research',
    其他: 'other',
  };

  const handleSearchUsers = async (e) => {
    e.preventDefault();
    setMessage("正在匹配...");

    try {
      const token = localStorage.getItem("token");
      // role=学生 → 找老师教我 → seeking=teacher；role=老师 → 找学生教 → seeking=student
      const seeking = role === "student" ? "teacher" : "student";
      const params = new URLSearchParams({
        seeking,
        onlineOnly: onlineOnly ? "true" : "false",
        requireMatchingQuestions: requireMatchingQuestions ? "true" : "false",
      });

      const response = await fetch(apiUrl(`/api/users/matching?${params.toString()}`), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSeekingLabel(data.seeking_label || "");
        const partners = data.partners || [];
        if (partners.length === 0) {
          setMessage(
            onlineOnly
              ? "当前没有符合条件的在线用户，可取消「仅在线」后重试"
              : "暂无匹配用户，可完善个人资料中的学科偏好后重试"
          );
          setMatchPartners([]);
        } else {
          setMatchPartners(partners);
          setShowUsers(true);
          setMessage("");
        }
      } else {
        setMessage(data.message || "搜索失败，请稍后重试");
      }
    } catch (error) {
      setMessage("服务器错误，请稍后重试");
      console.error("Error:", error);
    }
  };

  const handleViewPartnerQuestions = (partner) => {
    setSelectedPartner(partner);
    setQuestionsMine(partner.matching_questions_mine || partner.matching_questions || []);
    setQuestionsTheirs(partner.matching_questions_theirs || []);
    setShowQuestions(true);
    setMessage("");
  };

  const roleQuestionLabel = (r) => (r === 'teacher' ? '带学向' : '求助向');

  const resolveTopicIdFromQuestion = (question) => {
    let topicId = 10;
    if (question.tags && question.tags.length > 0) {
      const subjectTag = question.tags.find(
        (tag) => tag.category === "subject"
      );
      if (subjectTag) {
        const key = subjectNameToKey[subjectTag.name];
        if (key && subjectToTopicId[key] != null) {
          topicId = subjectToTopicId[key];
        }
      }
    }
    return topicId;
  };

  const handleSelectQuestion = async (question) => {
    if (isSubmitting || !selectedPartner) return;

    setIsSubmitting(true);
    const partnerUser = selectedPartner.user;
    setMessage(`正在向 ${partnerUser.username} 发送结对申请...`);

    try {
      const token = localStorage.getItem("token");
      const topicId = resolveTopicIdFromQuestion(question);

      const response = await fetch(apiUrl("/api/pairs/apply"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: partnerUser.id,
          topicId,
          role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (question.id) {
          await fetch(apiUrl(`/api/pairs/${data.id}/associate`), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ questionId: question.id }),
          });
        }

        setMessage("");
        setSuccessMessage(
          `✅ 已向 ${partnerUser.username} 发起结对申请\n\n请前往「个人中心」的「我的通知」查看对方是否同意`
        );
        setTargetPage('personal');
      } else {
        setMessage(data.message || data.error || "申请失败");
      }
    } catch (error) {
      setMessage("服务器错误,请稍后重试");
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setShowUsers(false);
    setMatchPartners([]);
    setSeekingLabel("");
    setMessage("");
  };

  const displayOnline = (partner) => {
    const uid = partner.user?.id;
    if (uid == null) return false;
    return Boolean(partner.is_online) || onlineUserIds.has(uid);
  };

  if (showUsers) {
    return (
      <div className="match-container">
        <div className="match-content">
          {showQuestions ? (
            <>
              <h1 className="match-title">
                选择题目 · 与 {selectedPartner?.user?.username} 结对
              </h1>
              <button
                className="back-btn"
                onClick={() => {
                  setShowQuestions(false);
                  setSelectedPartner(null);
                  setQuestionsMine([]);
                  setQuestionsTheirs([]);
                }}
              >
                ←
              </button>
              <p className="match-subtitle">
                下方分为两类：我发布的题（我出题找对路人）、对方发布的题（对方出题我找适合的人）。题目均标注求助向 / 带学向。
              </p>

              <div className="questions-list">
                {questionsMine.length === 0 && questionsTheirs.length === 0 ? (
                  <div className="empty">
                    暂无适合结对的题目。请发布对应角色与学科的问题，或让对方补充带学帖/求助帖与个人偏好。
                  </div>
                ) : (
                  <>
                    {questionsMine.length > 0 && (
                      <>
                        <h2 className="match-section-title">我发布的题目</h2>
                        <p className="match-section-desc">我出题，与对方学科偏好对接</p>
                        {questionsMine.map((question) => (
                          <div key={`mine-${question.id}`} className="question-card">
                            <div className="question-card-badges">
                              <span className="owner-badge owner-badge--self">我的题</span>
                              <span className="role-badge">{roleQuestionLabel(question.role)}</span>
                            </div>
                            <div className="question-content">
                              <h3 className="question-title">{question.title}</h3>
                              <p className="question-content-text">{question.content}</p>
                              {question.tags?.length > 0 && (
                                <div className="question-tags-inline">
                                  {question.tags.map((t) => (
                                    <span key={t.id} className="tag-chip">
                                      {t.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="question-actions">
                              <button
                                className="select-btn"
                                onClick={() => handleSelectQuestion(question)}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? "申请中..." : "选择并申请"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {questionsTheirs.length > 0 && (
                      <>
                        <h2 className="match-section-title">对方发布的题目</h2>
                        <p className="match-section-desc">
                          对方出题，与我的学科 / 难度偏好对接
                        </p>
                        {questionsTheirs.map((question) => (
                          <div key={`theirs-${question.id}`} className="question-card">
                            <div className="question-card-badges">
                              <span className="owner-badge owner-badge--partner">
                                @{question.author_username || selectedPartner?.user?.username} 的题
                              </span>
                              <span className="role-badge">{roleQuestionLabel(question.role)}</span>
                            </div>
                            <div className="question-content">
                              <h3 className="question-title">{question.title}</h3>
                              <p className="question-content-text">{question.content}</p>
                              {question.tags?.length > 0 && (
                                <div className="question-tags-inline">
                                  {question.tags.map((t) => (
                                    <span key={t.id} className="tag-chip">
                                      {t.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="question-actions">
                              <button
                                className="select-btn"
                                onClick={() => handleSelectQuestion(question)}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? "申请中..." : "选择并申请"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <h1 className="match-title">匹配结果</h1>
              {seekingLabel && (
                <p className="match-subtitle">{seekingLabel}</p>
              )}

              <button className="back-btn" onClick={handleBack}>
                ←
              </button>
              <div className="online-legend">
                <span className="legend-item">
                  <span className="legend-dot online"></span>
                  <span className="legend-text">在线</span>
                </span>
                <span className="legend-item">
                  <span className="legend-dot offline"></span>
                  <span className="legend-text">离线</span>
                </span>
              </div>

              <div className="users-list">
                {matchPartners.map((partner) => {
                  const u = partner.user;
                  const isOnline = displayOnline(partner);
                  const hints = partner.match_hints || [];
                  const nMine = (partner.matching_questions_mine || partner.matching_questions || []).length;
                  const nTheirs = (partner.matching_questions_theirs || []).length;
                  const nMatch = nMine + nTheirs;

                  return (
                    <div key={u.id} className="user-card user-card--match">
                      <div className="user-info">
                        <h3 className="user-name">
                          {u.nickname || u.username}
                          <span
                            className={`online-dot ${isOnline ? "online" : "offline"}`}
                            title={isOnline ? "在线" : "离线"}
                          />
                        </h3>
                        <p className="user-meta">
                          @{u.username} · 偏好匹配分 {partner.preference_score ?? 0}
                          {nMatch > 0
                            ? ` · 我的题 ${nMine} · 对方题 ${nTheirs}`
                            : ""}
                        </p>
                        {hints.length > 0 && (
                          <ul className="match-hints">
                            {hints.slice(0, 4).map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <button
                        className="select-btn"
                        onClick={() => handleViewPartnerQuestions(partner)}
                        disabled={nMatch === 0}
                        title={nMatch === 0 ? "无适合题目，无法发起" : "选择我的问题并申请"}
                      >
                        {nMatch === 0 ? "无适合题目" : "选择问题"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {message && <p className="message">{message}</p>}
        </div>

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
                      window.location.href = '/' + targetPage;
                      setTargetPage(null);
                    }
                  }}
                >
                  前往个人中心
                </button>
                <button
                  className="success-modal-btn success-modal-btn-secondary"
                  onClick={() => {
                    setSuccessMessage(null);
                    setTargetPage(null);
                    window.location.href = '/browse';
                  }}
                >
                  返回浏览界面
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="match-container">
      <div className="match-content">
        <h1 className="match-title">匹配</h1>

        <form className="match-form" onSubmit={handleSearchUsers}>
          <div className="form-row">
            <label className="form-label">我的身份</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="student">学生（寻找老师）</option>
              <option value="teacher">老师（寻找学生）</option>
            </select>
          </div>

          <div className="form-row form-row--checkbox">
            <label className="form-label checkbox-label">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
              />
              仅显示当前在线用户
            </label>
          </div>

          <div className="form-row form-row--checkbox">
            <label className="form-label checkbox-label">
              <input
                type="checkbox"
                checked={requireMatchingQuestions}
                onChange={(e) => setRequireMatchingQuestions(e.target.checked)}
              />
              仅显示至少有一条适合题目（我的或对方的均可）的用户
            </label>
          </div>

          <p className="form-hint">
            匹配由后端根据资料中的感兴趣/擅长学科、难度偏好与题目标签计算；请先完善个人资料。
          </p>

          {message && <p className="message">{message}</p>}

          <button type="submit" className="submit-btn">
            搜索匹配用户
          </button>
        </form>
      </div>
      <FeatureTipModal
        visible={showTipModal}
        title="匹配板块使用说明"
        features={matchFeatures}
        notes={matchNotes}
        onClose={handleCloseModal}
      />

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
                    window.location.href = '/' + targetPage;
                    setTargetPage(null);
                  }
                }}
              >
                前往个人中心
              </button>
              <button
                className="success-modal-btn success-modal-btn-secondary"
                onClick={() => {
                  setSuccessMessage(null);
                  setTargetPage(null);
                  window.location.href = '/browse';
                }}
              >
                返回浏览界面
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Match;
