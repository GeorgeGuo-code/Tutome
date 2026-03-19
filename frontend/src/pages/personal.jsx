import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import "./personal.css";
import FeatureTipModal from '../components/FeatureTipModal';
import { userService } from '../services/apiService';

// 自定义下拉多选组件
const MultiSelectDropdown = ({ options, value, onChange, placeholder = "请选择" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 获取选中的选项
  const selectedOptions = options.filter(opt => value.includes(opt.id));

  // 切换选中状态
  const handleToggle = (optionId) => {
    const newValue = value.includes(optionId)
      ? value.filter(id => id !== optionId)
      : [...value, optionId];
    onChange(newValue);
  };

  // 移除选中项
  const handleRemove = (optionId, event) => {
    event.stopPropagation();
    const newValue = value.filter(id => id !== optionId);
    onChange(newValue);
  };

  // 显示已选标签
  const renderSelectedTags = () => {
    if (selectedOptions.length === 0) {
      return <span className="dropdown-placeholder">{placeholder}</span>;
    }

    const displayCount = 3;
    const displayOptions = selectedOptions.slice(0, displayCount);
    const remainingCount = selectedOptions.length - displayCount;

    return (
      <>
        {displayOptions.map(opt => (
          <span key={opt.id} className="selected-tag">
            {opt.name}
            <button
              type="button"
              className="selected-tag-remove"
              onClick={(e) => handleRemove(opt.id, e)}
              disabled={isOpen}
            >
              ×
            </button>
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="selected-tag-more">+{remainingCount}</span>
        )}
      </>
    );
  };

  return (
    <div className="multi-select-dropdown" ref={dropdownRef}>
      <div
        className={`dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="dropdown-selected-tags">
          {renderSelectedTags()}
        </div>
        <span className="dropdown-arrow">▼</span>
      </div>

      {isOpen && (
        <div className="dropdown-options">
          {options.length === 0 ? (
            <div className="dropdown-option dropdown-option-empty">
              暂无选项
            </div>
          ) : (
            options.map(option => (
              <div
                key={option.id}
                className={`dropdown-option ${value.includes(option.id) ? 'selected' : ''}`}
                onClick={() => handleToggle(option.id)}
              >
                <span className="option-name">{option.name}</span>
                {value.includes(option.id) && (
                  <span className="option-checkmark">✓</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// 用户资料编辑弹窗组件
const ProfileEditModal = ({ visible, onClose, onSave, currentProfile }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [topics, setTopics] = useState([]);
  const [difficulties, setDifficulties] = useState([]);

  // 表单数据
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [selectedInterestedTopics, setSelectedInterestedTopics] = useState([]);
  const [selectedProficientTopics, setSelectedProficientTopics] = useState([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);

  // 加载选项数据
  useEffect(() => {
    if (visible) {
      loadOptions();
      // 初始化表单数据
      setNickname(currentProfile?.nickname || '');
      setBio(currentProfile?.bio || '');
      setSelectedInterestedTopics(currentProfile?.interested_topics?.map(t => t.id) || []);
      setSelectedProficientTopics(currentProfile?.proficient_topics?.map(t => t.id) || []);
      setSelectedDifficulties(currentProfile?.difficulty_preferences?.map(d => d.id) || []);
    }
  }, [visible, currentProfile]);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const [topicsResult, difficultiesResult] = await Promise.all([
        userService.getTopics(),
        userService.getDifficultyTags()
      ]);

      if (topicsResult.success && topicsResult.data) {
        // 去重：使用 Map 按名称去重，保留第一个出现的
        const uniqueTopics = Array.from(
          new Map(topicsResult.data.topics.map(t => [t.name, t])).values()
        );
        setTopics(uniqueTopics);
      }
      if (difficultiesResult.success && difficultiesResult.data) {
        setDifficulties(difficultiesResult.data.tags || []);
      }
    } catch (error) {
      console.error('加载选项失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicChange = (type, value) => {
    if (type === 'interested') {
      setSelectedInterestedTopics(value);
    } else {
      setSelectedProficientTopics(value);
    }
  };

  const handleDifficultyToggle = (difficultyId) => {
    setSelectedDifficulties(prev => {
      if (prev.includes(difficultyId)) {
        return prev.filter(id => id !== difficultyId);
      } else {
        return [...prev, difficultyId];
      }
    });
  };

  const handleSubmit = async () => {
    // 表单验证
    if (nickname.length > 50) {
      alert('昵称不能超过50个字符');
      return;
    }
    if (bio.length > 500) {
      alert('简介不能超过500个字符');
      return;
    }

    setSaving(true);
    try {
      const data = {
        nickname: nickname.trim() || null,
        bio: bio.trim() || null,
        interested_topic_ids: selectedInterestedTopics,
        proficient_topic_ids: selectedProficientTopics,
        difficulty_tag_ids: selectedDifficulties,
      };

      const result = await userService.updateMyProfile(data);

      if (result.success) {
        alert('资料更新成功！');
        onSave();
        onClose();
      } else {
        alert(result.data?.message || '更新失败，请稍后重试');
      }
    } catch (error) {
      console.error('更新资料错误:', error);
      alert('更新失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="profile-edit-modal-mask" onClick={onClose}>
      <div className="profile-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-edit-modal-header">
          <h3 className="profile-edit-modal-title">编辑资料</h3>
          <button className="profile-edit-modal-close" onClick={onClose} disabled={saving}>×</button>
        </div>

        <div className="profile-edit-modal-body">
          {loading ? (
            <div className="modal-loading">加载中...</div>
          ) : (
            <>
              {/* 基本信息 */}
              <div className="profile-form-section">
                <h4 className="profile-form-section-title">基本信息</h4>
                <div className="profile-form-item">
                  <label className="profile-form-label">昵称</label>
                  <input
                    type="text"
                    className="profile-form-input"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="请输入昵称（选填）"
                    maxLength={50}
                    disabled={saving}
                  />
                </div>
                <div className="profile-form-item">
                  <label className="profile-form-label">简介</label>
                  <textarea
                    className="profile-form-textarea"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="请输入个人简介（选填）"
                    maxLength={500}
                    disabled={saving}
                    rows={4}
                  />
                </div>
              </div>

              {/* 学科偏好 */}
              <div className="profile-form-section">
                <h4 className="profile-form-section-title">学科偏好</h4>
                <div className="profile-form-item">
                  <label className="profile-form-label">感兴趣学科</label>
                  <MultiSelectDropdown
                    options={topics}
                    value={selectedInterestedTopics}
                    onChange={setSelectedInterestedTopics}
                    placeholder="选择感兴趣的学科"
                  />
                </div>
                <div className="profile-form-item">
                  <label className="profile-form-label">擅长学科</label>
                  <MultiSelectDropdown
                    options={topics}
                    value={selectedProficientTopics}
                    onChange={setSelectedProficientTopics}
                    placeholder="选择擅长的学科"
                  />
                </div>
              </div>

              {/* 难度偏好 */}
              <div className="profile-form-section">
                <h4 className="profile-form-section-title">难度偏好</h4>
                <div className="profile-form-checkbox-group">
                  {difficulties.map(difficulty => (
                    <label key={difficulty.id} className="profile-form-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedDifficulties.includes(difficulty.id)}
                        onChange={() => handleDifficultyToggle(difficulty.id)}
                        disabled={saving}
                      />
                      <span>{difficulty.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="profile-edit-modal-footer">
          <button
            className="profile-modal-btn profile-modal-btn-cancel"
            onClick={onClose}
            disabled={saving}
          >
            取消
          </button>
          <button
            className="profile-modal-btn profile-modal-btn-save"
            onClick={handleSubmit}
            disabled={saving || loading}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 个人主页子组件
const ProfileSection = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const result = await userService.getMyProfile();
      if (result.success && result.data) {
        setProfile(result.data.profile);
      } else {
        setError(result.data?.message || '获取用户信息失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = () => {
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  const handleSaveProfile = () => {
    fetchProfile();
  };

  if (loading) {
    return (
      <div className="profile-section">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-section">
        <div className="profile-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-section">
        <div className="profile-empty">
          <p>暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-section">
      {/* 个人主页头部 */}
      <div className="profile-section-header">
        <h2 className="profile-section-title">个人主页</h2>
        <button className="profile-section-edit-btn" onClick={handleOpenEditModal}>
          修改
        </button>
      </div>

      {/* 用户信息卡片 */}
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="头像" className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-placeholder">
              <span className="avatar-emoji">{profile.nickname ? profile.nickname.charAt(0) : profile.username.charAt(0)}</span>
            </div>
          )}
        </div>
        <div className="profile-info">
          <h2 className="profile-nickname">
            {profile.nickname || profile.username}
          </h2>
          <p className="profile-username">@{profile.username}</p>
          <p className="profile-bio">
            {profile.bio || '暂无简介'}
          </p>
        </div>
      </div>

      {/* 学科偏好 */}
      <div className="preferences-section">
        <h3 className="preference-title">学科偏好</h3>
        <div className="preferences-grid">
          <div className="preference-column">
            <h4 className="preference-subtitle">感兴趣学科</h4>
            {profile.interested_topics && profile.interested_topics.length > 0 ? (
              <ul className="topic-list">
                {profile.interested_topics.map((topic) => (
                  <li key={topic.id} className="topic-item">
                    <span className="topic-icon">📚</span>
                    {topic.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="topic-empty">暂未设置</p>
            )}
          </div>

          <div className="preference-column">
            <h4 className="preference-subtitle">擅长学科</h4>
            {profile.proficient_topics && profile.proficient_topics.length > 0 ? (
              <ul className="topic-list">
                {profile.proficient_topics.map((topic) => (
                  <li key={topic.id} className="topic-item">
                    <span className="topic-icon">⭐</span>
                    {topic.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="topic-empty">暂未设置</p>
            )}
          </div>
        </div>
      </div>

      {/* 难度偏好 */}
      <div className="preferences-section">
        <h3 className="preference-title">难度偏好</h3>
        {profile.difficulty_preferences && profile.difficulty_preferences.length > 0 ? (
          <div className="difficulty-tags">
            {profile.difficulty_preferences.map((difficulty) => (
              <span key={difficulty.id} className="difficulty-tag">
                {difficulty.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="topic-empty">暂未设置</p>
        )}
      </div>

      {/* 编辑弹窗 */}
      <ProfileEditModal
        visible={showEditModal}
        onClose={handleCloseEditModal}
        onSave={handleSaveProfile}
        currentProfile={profile}
      />
    </div>
  );
};

// 我的足迹子组件
const HistorySection = ({ location }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [prevTotalPages, setPrevTotalPages] = useState(1);
  const [visiblePages, setVisiblePages] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [currentPage]);

  // 监听 location.state，实现滚动到指定部分
  useEffect(() => {
    if (location.state?.scrollTo === 'in-progress') {
      setTimeout(() => {
        const sectionTitles = document.querySelectorAll('.history-section-title');
        sectionTitles.forEach(title => {
          if (title.textContent === '进行中') {
            title.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }, 300);
    }
  }, [location.state]);

  // 更新可见页码
  useEffect(() => {
    const maxPagesToShow = 5;

    console.log('Page update - currentPage:', currentPage, 'totalPages:', totalPages, 'prevTotalPages:', prevTotalPages, 'visiblePages:', visiblePages, 'isInitialized:', isInitialized);

    const totalPagesChanged = totalPages !== prevTotalPages;
    if (totalPagesChanged) {
      console.log('Total pages changed from', prevTotalPages, 'to', totalPages, '- recalculating');
      setPrevTotalPages(totalPages);
    }

    if (totalPages < maxPagesToShow) {
      const allPages = [];
      for (let i = 1; i <= totalPages; i++) {
        allPages.push(i);
      }
      console.log('Setting visible pages (total < 5):', allPages);
      setVisiblePages(allPages);
      setIsInitialized(true);
    } else {
      let startPage, endPage;

      const shouldRecalculate = visiblePages.length === 0 || !isInitialized || !visiblePages.includes(currentPage) || totalPagesChanged || visiblePages.length !== maxPagesToShow;

      if (shouldRecalculate) {
        startPage = Math.max(1, currentPage - 2);
        endPage = startPage + maxPagesToShow - 1;
        if (endPage > totalPages) {
          endPage = totalPages;
          startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        console.log('Recalculating visible pages (shouldRecalculate=true):', startPage, 'to', endPage);
      } else {
        const lastVisiblePage = visiblePages[visiblePages.length - 1];
        const firstVisiblePage = visiblePages[0];

        if (currentPage === lastVisiblePage && currentPage < totalPages) {
          endPage = Math.min(totalPages, currentPage + 2);
          startPage = Math.max(1, endPage - maxPagesToShow + 1);
          console.log('Moving window right:', startPage, 'to', endPage);
        }
        else if (currentPage === firstVisiblePage && currentPage > 1) {
          startPage = Math.max(1, currentPage - 2);
          endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
          console.log('Moving window left:', startPage, 'to', endPage);
        } else {
          startPage = firstVisiblePage;
          endPage = lastVisiblePage;
          console.log('Keeping window unchanged:', startPage, 'to', endPage);
        }
      }

      const newVisiblePages = [];
      for (let i = startPage; i <= endPage; i++) {
        newVisiblePages.push(i);
      }
      console.log('Final visible pages:', newVisiblePages);
      setVisiblePages(newVisiblePages);
      setIsInitialized(true);
    }
  }, [currentPage, totalPages]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/questions/my-history?page=${currentPage}&limit=4`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      console.log('My questions data:', data);
      setHistory(data.questions || []);
      setTotalPages(Math.ceil(data.total / 4) || 1);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPageNumbers = () => {
    return visiblePages;
  };

  const handleDeleteQuestion = async (questionId) => {
    const confirmed = window.confirm('确定要删除这个问题吗？此操作不可恢复。');

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/questions/${questionId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchHistory();
      } else {
        const errorData = await response.json();
        alert(`删除失败：${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('删除问题错误:', error);
      alert('删除失败，请稍后重试');
    }
  };

  // 根据结对状态分类问题
  const inProgressQuestions = history.filter(item =>
    item.pair_status === 'active' || item.pair_status === 'end_requested'
  );
  const unpairedQuestions = history.filter(item =>
    item.pair_status === null
  );
  const completedQuestions = history.filter(item =>
    item.pair_status === 'completed'
  );

  return (
    <div className="history-section">
      <div className="history-list">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : history.length === 0 ? (
          <div className="empty">暂无足迹</div>
        ) : (
          <>
            {/* 进行中 */}
            {inProgressQuestions.length > 0 && (
              <>
                <div className="history-section-title">进行中</div>
                {inProgressQuestions.map((item) => (
                  <div key={item.id} className="history-item history-card">
                    <div className="history-header">
                      <h3 className="history-title">{item.title}</h3>
                      {item.tags && item.tags.length > 0 && (
                        <div className="history-tags-inline">
                          {item.tags.map((tag) => (
                            <span key={tag.id} className="tag-small">{tag.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="history-summary">
                      {item.content.substring(0, 100)}...
                    </p>
                    <div className="history-meta">
                      <span className="meta-item">
                        {item.username || '未知用户'}
                      </span>
                      <span className="meta-item">
                        {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '未知时间'}
                      </span>
                    </div>
                    <div className="history-actions">
                      <Link to={`/question/${item.id}`} state={{ question: item, from: '/personal' }} className="view-details">
                        查看详情
                      </Link>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* 未结对 */}
            {unpairedQuestions.length > 0 && (
              <>
                <div className="history-section-title">未结对</div>
                {unpairedQuestions.map((item) => (
                  <div key={item.id} className="history-item history-card">
                    <div className="history-header">
                      <h3 className="history-title">{item.title}</h3>
                      {item.tags && item.tags.length > 0 && (
                        <div className="history-tags-inline">
                          {item.tags.map((tag) => (
                            <span key={tag.id} className="tag-small">{tag.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="history-summary">
                      {item.content.substring(0, 100)}...
                    </p>
                    <div className="history-meta">
                      <span className="meta-item">
                        {item.username || '未知用户'}
                      </span>
                      <span className="meta-item">
                        {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '未知时间'}
                      </span>
                    </div>
                    <div className="history-actions">
                      <button
                        className="delete-question-btn"
                        onClick={() => handleDeleteQuestion(item.id)}
                      >
                        删除问题
                      </button>
                      <Link to={`/question/${item.id}`} state={{ question: item, from: '/personal' }} className="view-details">
                        查看详情
                      </Link>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* 已结束 */}
            {completedQuestions.length > 0 && (
              <>
                <div className="history-section-title">已结束</div>
                {completedQuestions.map((item) => (
                  <div key={item.id} className="history-item history-card">
                    <div className="history-header">
                      <h3 className="history-title">{item.title}</h3>
                      {item.tags && item.tags.length > 0 && (
                        <div className="history-tags-inline">
                          {item.tags.map((tag) => (
                            <span key={tag.id} className="tag-small">{tag.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="history-summary">
                      {item.content.substring(0, 100)}...
                    </p>
                    <div className="history-meta">
                      <span className="meta-item">
                        {item.username || '未知用户'}
                      </span>
                      <span className="meta-item">
                        {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '未知时间'}
                      </span>
                    </div>
                    <div className="history-actions">
                      <Link to={`/question/${item.id}`} state={{ question: item, from: '/personal' }} className="view-details">
                        查看详情
                      </Link>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div className="pagination">
        <button
          className="page-btn"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          &lt;
        </button>
        {getPageNumbers().map((page) => (
          <button
            key={page}
            className={`page-btn ${currentPage === page ? "active" : ""}`}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}
        <button
          className="page-btn"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

// 我的通知子组件
const NotificationsSection = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setNotifications([]);
        return;
      }

      const response = await fetch(
        "http://localhost:3000/api/notifications?status=pending&limit=50",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotifications([]);
        return;
      }

      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("[ERROR] Network error:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setUnreadCount(0);
        return;
      }

      const response = await fetch(
        "http://localhost:3000/api/notifications/unread-count",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error("[ERROR] Fetch unread count error:", error);
    }
  };

  const handleAcceptPairApplication = async (notificationId, pairId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:3000/api/pairs/accept",
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ pairId }),
        }
      );

      if (response.ok) {
        alert('已接受结对申请');
        // 标记通知为已处理
        await markNotificationAsRead(notificationId);
        fetchNotifications();
        fetchUnreadCount();
      } else {
        const errorData = await response.json();
        alert(`操作失败：${errorData.message || errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('接受结对申请错误:', error);
      alert('操作失败，请稍后重试');
    }
  };

  const handleRejectPairApplication = async (notificationId, pairId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/pairs/${pairId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert('已拒绝结对申请');
        await markNotificationAsRead(notificationId);
        fetchNotifications();
        fetchUnreadCount();
      } else {
        const errorData = await response.json();
        alert(`操作失败：${errorData.message || errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('拒绝结对申请错误:', error);
      alert('操作失败，请稍后重试');
    }
  };

  const handleAcceptEndRequest = async (notificationId, pairId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/chats/${pairId}/accept-end`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert('已同意结束教学');
        await markNotificationAsRead(notificationId);
        fetchNotifications();
        fetchUnreadCount();
      } else {
        const errorData = await response.json();
        alert(`操作失败：${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('同意结束申请错误:', error);
      alert('操作失败，请稍后重试');
    }
  };

  const handleRejectEndRequest = async (notificationId, pairId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/chats/${pairId}/reject-end`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert('已拒绝结束申请');
        await markNotificationAsRead(notificationId);
        fetchNotifications();
        fetchUnreadCount();
      } else {
        const errorData = await response.json();
        alert(`操作失败：${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('拒绝结束申请错误:', error);
      alert('操作失败，请稍后重试');
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(
        `http://localhost:3000/api/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error('标记通知已读错误:', error);
    }
  };

  const renderNotificationItem = (notification) => {
    switch (notification.type) {
      case 'pair_application':
        return (
          <div key={notification.id} className="notification-item">
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.content}</div>
              {notification.question_title && (
                <div className="notification-question-info">
                  <div className="notification-question-title">
                    问题：{notification.question_title}
                  </div>
                </div>
              )}
            </div>
            <div className="notification-actions">
              <button
                className="notification-btn notification-btn-reject"
                onClick={() => handleRejectPairApplication(notification.id, notification.related_id)}
              >
                拒绝
              </button>
              <button
                className="notification-btn notification-btn-accept"
                onClick={() => handleAcceptPairApplication(notification.id, notification.related_id)}
              >
                同意
              </button>
            </div>
          </div>
        );

      case 'pair_accepted':
        return (
          <div key={notification.id} className="notification-item notification-processed">
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.content}</div>
            </div>
            <div className="notification-actions">
              <button
                className="notification-btn notification-btn-primary"
                onClick={() => window.location.href = `/dialogue/${notification.related_id}`}
              >
                进入对话
              </button>
            </div>
          </div>
        );

      case 'pair_rejected':
        return (
          <div key={notification.id} className="notification-item notification-processed">
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.content}</div>
            </div>
          </div>
        );

      case 'end_request':
        return (
          <div key={notification.id} className="notification-item">
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-question-info">
                {notification.question_title && (
                  <div className="notification-question-title">
                    问题：{notification.question_title}
                  </div>
                )}
                {notification.question_content && (
                  <div className="notification-question-content">
                    {notification.question_content.length > 50
                      ? notification.question_content.substring(0, 50) + '...'
                      : notification.question_content}
                  </div>
                )}
              </div>
            </div>
            <div className="notification-actions">
              <button
                className="notification-btn notification-btn-reject"
                onClick={() => handleRejectEndRequest(notification.id, notification.related_id)}
              >
                拒绝
              </button>
              <button
                className="notification-btn notification-btn-accept"
                onClick={() => handleAcceptEndRequest(notification.id, notification.related_id)}
              >
                同意
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div key={notification.id} className="notification-item">
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.content || '暂无内容'}</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="notifications-section">
      <div className="notification-section">
        <div className="notification-header">
          <div className="notification-icon-wrapper">
            <span className="notification-bell">🔔</span>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </div>
          <button
            className="notification-refresh-btn"
            onClick={fetchNotifications}
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>

        <div className="notification-list">
          {loading ? (
            <div className="notification-loading">加载中...</div>
          ) : notifications.length > 0 ? (
            notifications.map(notification => renderNotificationItem(notification))
          ) : (
            <div className="notification-empty">暂无待处理消息</div>
          )}
        </div>
      </div>
    </div>
  );
};

// 主组件
const Personal = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [showTipModal, setShowTipModal] = useState(false);

  useEffect(() => {
    const hasSeenPersonalTip = localStorage.getItem('hasSeenPersonalTip');
    if (!hasSeenPersonalTip) {
      setShowTipModal(true);
    }
  }, []);

  const handleCloseModal = () => {
    setShowTipModal(false);
    localStorage.setItem('hasSeenPersonalTip', 'true');
  };

  const personalFeatures = [
    '查看个人基本信息（用户名、头像、注册时间）',
    '管理自己发布的提问、回答、收藏内容',
    '修改个人资料和密码',
    '查看消息通知（回答提醒、对话提醒）'
  ];
  const personalNotes = [
    '仅可修改自己的个人信息，无法查看他人隐私',
    '删除提问/回答后无法恢复，请谨慎操作',
    '密码修改后需重新登录，请牢记新密码'
  ];

  return (
    <div className="personal-container">
      <div className="personal-header">
        <span className="breadcrumb-text">个人中心</span>
      </div>

      <div className="personal-content-wrapper">
        {/* 左侧导航栏 */}
        <div className="personal-sidebar">
          <nav className="sidebar-nav">
            <button
              className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="sidebar-icon">🏠</span>
              <span className="sidebar-text">个人主页</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <span className="sidebar-icon">👣</span>
              <span className="sidebar-text">我的足迹</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <span className="sidebar-icon">🔔</span>
              <span className="sidebar-text">我的通知</span>
            </button>
          </nav>
        </div>

        {/* 右侧内容区 */}
        <div className="personal-content">
          {activeTab === 'profile' && <ProfileSection />}
          {activeTab === 'history' && <HistorySection location={location} />}
          {activeTab === 'notifications' && <NotificationsSection />}
        </div>
      </div>

      <FeatureTipModal
        visible={showTipModal}
        title="个人中心使用说明"
        features={personalFeatures}
        notes={personalNotes}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Personal;