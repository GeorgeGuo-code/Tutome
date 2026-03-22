import React, { useState, useEffect } from "react";
import "./match.css";
import FeatureTipModal from '../components/FeatureTipModal';
import socketService from '../services/socketService';

const Match = () => {
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [progress, setProgress] = useState("");
  const [role, setRole] = useState("student");
  const [message, setMessage] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]); // 在线用户 ID 集合
  const [selectedUser, setSelectedUser] = useState(null);
  const [userQuestions, setUserQuestions] = useState([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [targetPage, setTargetPage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Socket.IO 连接和事件监听
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // 连接到 Socket.IO 服务器
    socketService.connect(token);

    // 监听用户上线事件
    socketService.on('user-online', (data) => {
      console.log('用户上线:', data.userId);
      setOnlineUserIds(prev => new Set([...prev, data.userId]));
    });

    // 监听用户下线事件
    socketService.on('user-offline', (data) => {
      console.log('用户下线:', data.userId);
      setOnlineUserIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    // 监听在线用户列表更新
    socketService.on('online-users', (data) => {
      console.log('在线用户列表:', data.users);
      setOnlineUserIds(new Set(data.users));
    });

    // 组件卸载时断开连接
    return () => {
      socketService.disconnect();
    };
  }, []);

  const matchFeatures = [
    '根据你发布的问题/擅长的技术标签匹配解答者',
    '展示匹配度高的用户列表，可直接发起对话',
    '支持查看匹配用户的个人简介和历史回答',
    '匹配结果会根据双方标签实时更新'
  ];
  const matchNotes = [
    '匹配功能需登录后才能使用',
    '匹配度仅为参考，可手动选择对话对象',
    '发起对话前请确认对方是否在线'
  ];

  // 学科到 topicId 的映射
  const subjectToTopicId = {
    'math': 1,           // 数学
    'physics': 4,        // 物理
    'chemistry': 5,      // 化学
    'biology': 6,        // 生物
    'programming': 3,    // 编程与计算机
    'economics': 7,      // 经管/社科
    'engineering': 8,    // 电子与工程
    'english': 2,        // 英语与学术写作
    'research': 9,       // 科研
    'other': 10          // 其他
  };

  // 学科名称到学科键名的映射（用于匹配问题的标签）
  const subjectNameToKey = {
    '数学': 'math',
    '英语': 'english',
    '编程与计算机': 'programming',
    '编程语言': 'programming',
    '物理': 'physics',
    '化学': 'chemistry',
    '生物': 'biology',
    '经管/社科': 'economics',
    '电子与工程': 'engineering',
    '科研': 'research',
    '其他': 'other'
  };

  const handleSearchUsers = async (e) => {
    e.preventDefault();
    setMessage("正在搜索可用用户...");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:3000/api/users/available", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.users.length === 0) {
          setMessage("没有可用的用户");
        } else {
          // 过滤掉没有可结对问题的用户
          const usersWithAvailableQuestions = [];
          for (const user of data.users) {
            try {
              const questionsResponse = await fetch(`http://localhost:3000/api/questions/user/${user.id}`);
              const questionsData = await questionsResponse.json();

              if (questionsResponse.ok && questionsData.questions && questionsData.questions.length > 0) {
                // 检查是否有符合角色和学科匹配的问题
                const hasMatchingQuestion = questionsData.questions.some(q => {
                  // 1. 角色匹配检查
                  if (!q.role || q.role === role) return false;

                  // 2. 学科匹配检查
                  if (!subject) return false; // 如果没有选择学科，不显示

                  // 检查问题的标签中是否有匹配的学科
                  const hasMatchingSubject = q.tags && q.tags.some(tag => {
                    const subjectKey = subjectNameToKey[tag.name];
                    return subjectKey === subject;
                  });

                  if (!hasMatchingSubject) return false;

                  return true;
                });

                if (hasMatchingQuestion) {
                  usersWithAvailableQuestions.push(user);
                }
              }
            } catch (error) {
              console.error(`Error fetching questions for user ${user.id}:`, error);
            }
          }

          if (usersWithAvailableQuestions.length === 0) {
            setMessage("没有可用的用户");
          } else {
            setAvailableUsers(usersWithAvailableQuestions);
            setShowUsers(true);
            setMessage("");
          }
        }
      } else {
        setMessage(data.message || "搜索失败，请稍后重试");
      }
    } catch (error) {
      setMessage("服务器错误，请稍后重试");
      console.error("Error:", error);
    }
  };

  const fetchUserQuestions = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/questions/user/${userId}`);
      const data = await response.json();
      if (response.ok) {
        setUserQuestions(data.questions || []);
      } else {
        setMessage("获取用户问题失败");
      }
    } catch (error) {
      setMessage("服务器错误，请稍后重试");
      console.error("Error:", error);
    }
  };

  const handleViewUserDetails = async (user) => {
    setSelectedUser(user);
    setMessage("正在加载用户问题...");
    await fetchUserQuestions(user.id);
    setShowQuestions(true);
    setMessage("");
  };

  const handleSelectQuestion = async (question) => {
    if (isSubmitting) return; // 防止重复提交
    
    setIsSubmitting(true);
    setMessage(`正在向 ${selectedUser.username} 发送结对申请...`);
  
    try {
      const token = localStorage.getItem("token");
  
      // 根据问题的标签获取对应的 topicId
      let topicId = 10; // 默认为"其他"
      if (question.tags && question.tags.length > 0) {
        const subjectTag = question.tags.find(tag =>
          ['数学', '英语', '编程', '物理', '化学', '生物', '经管/社科', '电子与工程', '科研'].includes(tag.name)
        );
        if (subjectTag) {
          const subjectNameToKey = {
            '数学': 'math',
            '英语': 'english',
            '编程': 'programming',
            '物理': 'physics',
            '化学': 'chemistry',
            '生物': 'biology',
            '经管/社科': 'economics',
            '电子与工程': 'engineering',
            '科研': 'research'
          };
          const key = subjectNameToKey[subjectTag.name];
          if (key) {
            topicId = subjectToTopicId[key];
          }
        }
      }
  
      const response = await fetch("http://localhost:3000/api/pairs/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          topicId: topicId,
          role,
        }),
      });
  
      const data = await response.json();
      console.log('Response:', data);
  
      if (response.ok) {
        // 关联问题到结对
        if (question.id) {
          await fetch(`http://localhost:3000/api/pairs/${data.id}/associate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              questionId: question.id
            }),
          });
        }
  
        // 清空message，显示成功弹窗
        setMessage("");
        setSuccessMessage(`✅ 已向 ${selectedUser.username} 发起结对申请\n\n请前往"个人中心"的"我的通知"查看对方是否同意`);
        setTargetPage('personal'); // 用于"前往个人中心"按钮
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
    setMessage("");
  };

  if (showUsers) {
    return (
      <div className="match-container">
        <div className="match-content">
          {showQuestions ? (
            <>
              <h1 className="match-title">{selectedUser?.username} 的问题</h1>
              <button className="back-btn" onClick={() => setShowQuestions(false)}>
                ←
              </button>

              <div className="questions-list">
                {userQuestions.length === 0 ? (
                  <div className="empty">该用户暂无问题</div>
                ) : (
                  (() => {
                    // 过滤出符合角色和学科匹配的问题
                    const filteredQuestions = userQuestions.filter(question => {
                      // 1. 角色匹配检查
                      if (!question.role || question.role === role) return false;

                      // 2. 学科匹配检查
                      if (!subject) return false; // 如果没有选择学科，不显示

                      // 检查问题的标签中是否有匹配的学科
                      const hasMatchingSubject = question.tags && question.tags.some(tag => {
                        const subjectKey = subjectNameToKey[tag.name];
                        return subjectKey === subject;
                      });

                      if (!hasMatchingSubject) return false;

                      return true;
                    });

                    if (filteredQuestions.length === 0) {
                      return <div className="empty">该用户暂无可结对的问题</div>;
                    }

                    return filteredQuestions.map((question) => (
                      <div key={question.id} className="question-card">
                        <div className="question-content">
                          <h3 className="question-title">{question.title}</h3>
                          <p className="question-content-text">{question.content}</p>
                        </div>
                        <div className="question-actions">
                          <button
                            className="select-btn"
                            onClick={() => handleSelectQuestion(question)}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? '申请中...' : '选择'}
                          </button>
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </>
          ) : (
            <>
              <h1 className="match-title">可用用户</h1>

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
                {availableUsers.map((user) => {
                  // 判断用户是否在线（使用 Socket.IO 实时状态）
                  const isOnline = onlineUserIds.has(user.id);
                  console.log(`用户 ${user.username} (${user.id}) 在线状态:`, isOnline);

                  return (
                    <div key={user.id} className="user-card">
                      <div className="user-info">
                        <h3 className="user-name">
                          {user.username}
                          <span className={`online-dot ${isOnline ? 'online' : 'offline'}`}></span>
                        </h3>
                      </div>
                      <button
                        className="select-btn"
                        onClick={() => handleViewUserDetails(user)}
                      >
                        详情
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {message && <p className="message">{message}</p>}
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
              <option value="student">学生</option>
              <option value="teacher">老师</option>
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">学科</label>
            <select
              className="form-select"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            >
              <option value="">请选择学科</option>
              <option value="math">数学</option>
              <option value="physics">物理</option>
              <option value="chemistry">化学</option>
              <option value="biology">生物</option>
              <option value="programming">编程与计算机</option>
              <option value="economics">经管/社科</option>
              <option value="engineering">电子与工程</option>
              <option value="english">英语与学术写作</option>
              <option value="research">科研</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">难度</label>
            <select
              className="form-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              required
            >
              <option value="">请选择难度</option>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">偏难</option>
              <option value="expert">极难</option>
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">进度</label>
            <select
              className="form-select"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              required
            >
              <option value="">请选择进度</option>
              <option value="start">开始</option>
              <option value="middle">中程</option>
              <option value="end">末尾</option>
            </select>
          </div>

          {message && <p className="message">{message}</p>}

          <button type="submit" className="submit-btn">
            搜索用户
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
