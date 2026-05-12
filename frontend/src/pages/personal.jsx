import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./personal.css";
import FeatureTipModal from '../components/FeatureTipModal';
import { userService, rewardService } from '../services/apiService';
import { HistoryIcon, NotificationIcon, HomeIcon, GiftIcon } from '../components/icons';

// 自定义下拉多选组件
function MultiSelectDropdown({ options, value, onChange, placeholder = "请选择" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const optionsRef = useRef(null);

  // 计算下拉菜单位置
  const updateDropdownPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  };

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        optionsRef.current && !optionsRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      updateDropdownPosition();
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

      {isOpen && ReactDOM.createPortal(
        <div
          ref={optionsRef}
          className="dropdown-options dropdown-options-portal"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 9999
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
}

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
        // 按照指定顺序排序：简单，中等，偏难，极难
        const difficultyOrder = ['简单', '中等', '偏难', '极难'];
        const sortedDifficulties = (difficultiesResult.data.tags || []).sort((a, b) => {
          return difficultyOrder.indexOf(a.name) - difficultyOrder.indexOf(b.name);
        });
        setDifficulties(sortedDifficulties);
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
        nickname: nickname.trim() === '' ? null : nickname.trim(),
        bio: bio.trim() === '' ? null : bio.trim(),
        interested_topic_ids: selectedInterestedTopics,
        proficient_topic_ids: selectedProficientTopics,
        difficulty_tag_ids: selectedDifficulties,
      };

      console.log('提交的更新数据:', data);

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
    // 组件挂载时先重置状态
    setProfile(null);
    setLoading(true);
    setError(null);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      console.log('正在获取用户资料...');
      const result = await userService.getMyProfile();
      console.log('获取到的用户资料:', result);
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
            {profile.difficulty_preferences
              .sort((a, b) => {
                const difficultyOrder = ['简单', '中等', '偏难', '极难'];
                return difficultyOrder.indexOf(a.name) - difficultyOrder.indexOf(b.name);
              })
              .map((difficulty) => (
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
  }, []);

  // 更新可见页码
  useEffect(() => {
    const maxPagesToShow = 5;

    // 计算实际显示的总页数（基于过滤后的数量）
    const inProgressQuestions = history
      .filter(item => item.pair_status === 'active' || item.pair_status === 'end_requested');
    const unpairedQuestions = history
      .filter(item => item.pair_status === null);
    const completedQuestions = history
      .filter(item => item.pair_status === 'completed');
    const allQuestionsOrdered = [
      ...inProgressQuestions,
      ...unpairedQuestions,
      ...completedQuestions
    ];
    const actualTotalPages = Math.ceil(allQuestionsOrdered.length / 4) || 1;

    console.log('Page update - currentPage:', currentPage, 'actualTotalPages:', actualTotalPages, 'prevTotalPages:', prevTotalPages, 'visiblePages:', visiblePages, 'isInitialized:', isInitialized, 'history.length:', history.length, 'allQuestionsOrdered.length:', allQuestionsOrdered.length);

    const totalPagesChanged = actualTotalPages !== prevTotalPages;
    if (totalPagesChanged) {
      console.log('Total pages changed from', prevTotalPages, 'to', actualTotalPages, '- recalculating');
      setPrevTotalPages(actualTotalPages);
    }

    if (actualTotalPages < maxPagesToShow) {
      const allPages = [];
      for (let i = 1; i <= actualTotalPages; i++) {
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
        if (endPage > actualTotalPages) {
          endPage = actualTotalPages;
          startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        console.log('Recalculating visible pages (shouldRecalculate=true):', startPage, 'to', endPage);
      } else {
        const lastVisiblePage = visiblePages[visiblePages.length - 1];
        const firstVisiblePage = visiblePages[0];

        if (currentPage === lastVisiblePage && currentPage < actualTotalPages) {
          endPage = Math.min(actualTotalPages, currentPage + 2);
          startPage = Math.max(1, endPage - maxPagesToShow + 1);
          console.log('Moving window right:', startPage, 'to', endPage);
        }
        else if (currentPage === firstVisiblePage && currentPage > 1) {
          startPage = Math.max(1, currentPage - 2);
          endPage = Math.min(actualTotalPages, startPage + maxPagesToShow - 1);
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
  }, [currentPage, history]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/questions/my-history?page=1&limit=1000`,
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

  // 根据结对状态分类问题（先分类，再排序）
  const inProgressQuestions = history
    .filter(item => item.pair_status === 'active' || item.pair_status === 'end_requested')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const unpairedQuestions = history
    .filter(item => item.pair_status === null)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const completedQuestions = history
    .filter(item => item.pair_status === 'completed')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // 按顺序合并所有分类（进行中 → 未结对 → 已结束）
  const allQuestionsOrdered = [
    ...inProgressQuestions,
    ...unpairedQuestions,
    ...completedQuestions
  ];

  // 计算实际显示的总页数（基于过滤后的数量）
  const actualTotalPages = Math.ceil(allQuestionsOrdered.length / 4) || 1;

  // 前端分页：只显示当前页的数据
  const paginatedHistory = allQuestionsOrdered.slice(
    (currentPage - 1) * 4,
    currentPage * 4
  );

  return (
    <div className="history-section">
      <div className="history-list">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : history.length === 0 ? (
          <div className="empty">暂无足迹</div>
        ) : (
          paginatedHistory.map((item, index) => {
            // 计算当前问题在整个有序列表中的位置
            const itemIndex = (currentPage - 1) * 4 + index;
            const currentItem = allQuestionsOrdered[itemIndex];
            const prevItem = itemIndex > 0 ? allQuestionsOrdered[itemIndex - 1] : null;

            // 判断当前问题的分类
            const isInProgress = currentItem.pair_status === 'active' || currentItem.pair_status === 'end_requested';
            const isUnpaired = currentItem.pair_status === null;
            const isCompleted = currentItem.pair_status === 'completed';

            // 判断前一个问题的分类
            const prevIsInProgress = prevItem && (prevItem.pair_status === 'active' || prevItem.pair_status === 'end_requested');
            const prevIsUnpaired = prevItem && prevItem.pair_status === null;
            const prevIsCompleted = prevItem && prevItem.pair_status === 'completed';

            // 判断是否需要显示分类标题
            const showInProgressTitle = isInProgress && (index === 0 || !prevIsInProgress);
            const showUnpairedTitle = isUnpaired && !prevIsUnpaired;
            const showCompletedTitle = isCompleted && !prevIsCompleted;

            return (
              <React.Fragment key={item.id}>
                {showInProgressTitle && <div className="history-section-title">进行中</div>}
                {showUnpairedTitle && <div className="history-section-title">未结对</div>}
                {showCompletedTitle && <div className="history-section-title">已结束</div>}
                <div className="history-item history-card">
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
                    {isUnpaired && (
                      <button
                        className="delete-question-btn"
                        onClick={() => handleDeleteQuestion(item.id)}
                      >
                        删除问题
                      </button>
                    )}
                    <Link to={`/question/${item.id}`} state={{ question: item, from: '/personal' }} className="view-details">
                      查看详情
                    </Link>
                  </div>
                </div>
              </React.Fragment>
            );
          })
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
          onClick={() => setCurrentPage(Math.min(actualTotalPages, currentPage + 1))}
          disabled={currentPage === actualTotalPages}
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
  const [successMessage, setSuccessMessage] = useState(null);
  const [pairIdToNavigate, setPairIdToNavigate] = useState(null);

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

      console.log('获取到的通知:', data.notifications);
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

      const data = await response.json();

      if (response.ok) {
        // 标记通知为已处理
        await markNotificationAsRead(notificationId);
        fetchNotifications();
        fetchUnreadCount();
        // 显示成功弹窗
        setSuccessMessage('结对成功！');
        setPairIdToNavigate(pairId);
      } else {
        // 只有特定错误才标记通知为已读，避免重复点击问题
        if (data.error === '状态错误，只能接受待处理的结对申请') {
          // 如果是状态错误（可能已被其他操作处理），也标记为已读并显示结果
          await markNotificationAsRead(notificationId);
          fetchNotifications();
          fetchUnreadCount();
          // 检查是否是pair已被接受（成功场景）
          if (data.message && data.message.includes('已接受')) {
            setSuccessMessage('结对成功！');
            setPairIdToNavigate(pairId);
          }
        }
        alert(`操作失败：${data.message || data.error || '未知错误'}`);
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
        // 操作失败时标记通知为已读，并刷新列表
        await markNotificationAsRead(notificationId);
        fetchNotifications();
        fetchUnreadCount();
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
        // 操作失败时标记通知为已读，并刷新列表
        await markNotificationAsRead(notificationId);
        fetchNotifications();
        fetchUnreadCount();
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
        // 操作失败时标记通知为已读，并刷新列表
        await markNotificationAsRead(notificationId);
        fetchNotifications();
        fetchUnreadCount();
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

  const handleMarkAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId);
    fetchNotifications();
    fetchUnreadCount();
  };

  const renderNotificationItem = (notification) => {
    switch (notification.type) {
      case 'pair_application':
        return (
          <div key={notification.id} className="notification-item pair-application">
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
                className="notification-btn notification-btn-accept"
                onClick={() => handleAcceptPairApplication(notification.id, notification.related_id)}
              >
                同意
              </button>
              <button
                className="notification-btn notification-btn-reject"
                onClick={() => handleRejectPairApplication(notification.id, notification.related_id)}
              >
                拒绝
              </button>
            </div>
          </div>
        );

      case 'pair_accepted':
        return (
          <div key={notification.id} className="notification-item notification-pair-accepted">
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.content}</div>
            </div>
            <div className="notification-actions notification-actions-vertical">
              <button
                className="notification-btn notification-btn-primary"
                onClick={() => window.location.href = `/quiz/pre/${notification.related_id}`}
              >
                完成热身问卷
              </button>
              <button
                className="notification-btn notification-btn-know"
                onClick={() => handleMarkAsRead(notification.id)}
              >
                知道了
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
          <div key={notification.id} className="notification-item end-request">
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
                className="notification-btn notification-btn-accept"
                onClick={() => handleAcceptEndRequest(notification.id, notification.related_id)}
              >
                同意
              </button>
              <button
                className="notification-btn notification-btn-reject"
                onClick={() => handleRejectEndRequest(notification.id, notification.related_id)}
              >
                拒绝
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
                    if (pairIdToNavigate) {
                      window.location.href = `/quiz/pre/${pairIdToNavigate}`;
                      setPairIdToNavigate(null);
                    }
                  }}
                >
                  好的，去完成热身问卷
                </button>
                <button
                  className="success-modal-btn success-modal-btn-secondary"
                  onClick={() => {
                    setSuccessMessage(null);
                    setPairIdToNavigate(null);
                  }}
                >
                  返回
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 概率说明弹窗组件
const RewardInfoModal = ({ visible, onClose, stockMap }) => {
  if (!visible) return null;

  const item1Stock = stockMap[1] ?? 3;
  const item2Stock = stockMap[2] ?? 5;
  const hasStockDepleted = item1Stock <= 0 || item2Stock <= 0;
  const reducedProb = (item1Stock <= 0 ? 1 : 0) + (item2Stock <= 0 ? 4 : 0);
  const hongbaoCurrentProb = 20 + reducedProb;

  return (
    <div className="reward-info-overlay" onClick={onClose}>
      <div className="reward-info-modal" onClick={e => e.stopPropagation()}>
        <div className="reward-info-header">
          <h3 className="reward-info-title">概率及奖励说明</h3>
          <button className="reward-info-close" onClick={onClose}>×</button>
        </div>
        <div className="reward-info-body">
          <div className="reward-info-section">
            <h4 className="reward-info-section-title">奖品概率</h4>
            <div className="reward-info-list">
              <div className="reward-info-item">
                <span className="reward-info-rarity sss">SSS</span>
                <span className="reward-info-name">国誉文具礼盒（库存{item1Stock}件）</span>
                {item1Stock > 0 ? (
                  <span className="reward-info-prob">1%</span>
                ) : (
                  <span className="reward-info-prob" style={{color: '#EF4444'}}>0%（已售罄）</span>
                )}
              </div>
              <div className="reward-info-item">
                <span className="reward-info-rarity ss">SS</span>
                <span className="reward-info-name">精品笔记本（库存{item2Stock}件）</span>
                {item2Stock > 0 ? (
                  <span className="reward-info-prob">4%</span>
                ) : (
                  <span className="reward-info-prob" style={{color: '#EF4444'}}>0%（已售罄）</span>
                )}
              </div>
              <div className="reward-info-item">
                <span className="reward-info-rarity s">S</span>
                <span className="reward-info-name">一元红包</span>
                {hasStockDepleted ? (
                  <span className="reward-info-prob" style={{color: '#10B981'}}>{hongbaoCurrentProb}% ↑</span>
                ) : (
                  <span className="reward-info-prob">20%</span>
                )}
              </div>
              <div className="reward-info-item">
                <span className="reward-info-rarity a">A</span>
                <span className="reward-info-name">小零食</span>
                <span className="reward-info-prob">25%</span>
              </div>
            </div>
          </div>

          {hasStockDepleted && (
            <div className="reward-info-section">
              <h4 className="reward-info-section-title">库存说明</h4>
              <ul className="reward-info-rules">
                <li>实物奖品库存耗尽后，其概率将全部转移至一元红包</li>
              </ul>
            </div>
          )}

          <div className="reward-info-section">
            <h4 className="reward-info-section-title">抽取规则</h4>
            <ul className="reward-info-rules">
              <li>单抽消耗 1 张抽奖券，五抽消耗 5 张</li>
              <li>每次抽取相互独立，概率不受影响</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// 奖励中心子组件
const RewardSection = () => {
  const [drawMode, setDrawMode] = useState(1); // 1 或 5
  const [isDrawing, setIsDrawing] = useState(false);
  const [cards, setCards] = useState([]);
  const [hasDrawn, setHasDrawn] = useState(false); // 是否已经抽过
  const [showInfo, setShowInfo] = useState(false);
  const [tickets, setTickets] = useState(0); // 抽奖券数量
  const [totalDrawn, setTotalDrawn] = useState({}); // 已抽取统计 { rewardId: count }
  const [rewardStats, setRewardStats] = useState({}); // 可兑换统计 { rewardId: count }
  const [stockMap, setStockMap] = useState({}); // 库存数据 { rewardId: stock }

  // 奖池配置
  const rewardsPool = [
    { id: 1, name: '国誉文具礼盒', icon: '🎁', rarity: 'sss', desc: '精美文具套装', probability: 1 },
    { id: 2, name: '精品笔记本', icon: '📓', rarity: 'ss', desc: '高品质笔记本', probability: 4 },
    { id: 3, name: '一元红包', icon: '🧧', rarity: 's', desc: '微信红包奖励', probability: 20 },
    { id: 4, name: '小零食', icon: '🍪', rarity: 'a', desc: '随机零食一份', probability: 25 },
    { id: 5, name: '谢谢参与', icon: '😢', rarity: 'none', desc: '再接再厉', probability: 50 },
  ];

  // 加载用户抽奖信息
  useEffect(() => {
    loadRewardInfo();
  }, []);

  const loadRewardInfo = async () => {
    try {
      const result = await rewardService.getRewardInfo();
      console.log('loadRewardInfo result:', result);
      if (result.success && result.data) {
        setTickets(result.data.tickets);
        setTotalDrawn(result.data.totalDrawn || {});
        setRewardStats(result.data.rewardStats || {});
        setStockMap(result.data.stockMap || {});
      }
    } catch (error) {
      console.error('加载抽奖信息失败:', error);
    }
  };

  // 概率抽奖
  const drawByProbability = () => {
    const total = rewardsPool.reduce((sum, r) => sum + r.probability, 0);
    let random = Math.random() * total;
    for (const reward of rewardsPool) {
      random -= reward.probability;
      if (random <= 0) return reward;
    }
    return rewardsPool[0];
  };

  // 初始化卡牌
  const initCards = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      reward: null,
      flipped: false,
    }));
  };

  // 切换模式
  const handleModeChange = (mode) => {
    if (isDrawing || mode === drawMode) return;
    setDrawMode(mode);
    setCards([]);
    setHasDrawn(false);
  };

  // 抽奖
  const handleDraw = async () => {
    if (isDrawing) return;
    setIsDrawing(true);
    setHasDrawn(false);

    const count = drawMode;
    const newCards = initCards(count);
    setCards(newCards);

    // 调用API进行抽奖（后端处理概率和库存）
    try {
      const result = await rewardService.drawReward(count);
      console.log('drawReward result:', result);

      if (result.success && result.data) {
        const drawnRewards = result.data.rewards || [];

        // 依次翻开卡牌
        for (let i = 0; i < count; i++) {
          await new Promise(resolve => setTimeout(resolve, count === 1 ? 400 : 200));
          if (drawnRewards[i]) {
            newCards[i].reward = {
              id: drawnRewards[i].rewardId,
              name: drawnRewards[i].rewardName,
              icon: drawnRewards[i].rewardIcon,
              rarity: drawnRewards[i].rewardRarity,
              desc: rewardsPool.find(r => r.id === drawnRewards[i].rewardId)?.desc || ''
            };
            newCards[i].flipped = true;
            setCards([...newCards]);
          }
        }

        // 全部翻开后的延迟
        await new Promise(resolve => setTimeout(resolve, 600));

        // 记录抽取结果（不包含谢谢参与）
        const validRewards = drawnRewards.filter(r => r.rewardRarity !== 'none');
        if (validRewards.length > 0) {
          const recordData = validRewards.map(r => ({
            rewardId: r.rewardId,
            rewardName: r.rewardName,
            rewardIcon: r.rewardIcon,
            rewardRarity: r.rewardRarity
          }));
          await rewardService.recordReward(recordData);
        }

        // 更新抽奖券数量
        setTickets(result.data.tickets);

        // 重新加载抽奖信息
        await loadRewardInfo();
      }
    } catch (error) {
      console.error('抽奖API调用失败:', error);
    }

    setIsDrawing(false);
    setHasDrawn(true);
  };

  // 渲染单张卡牌
  const renderCard = (card, index) => {
    if (!card.reward) {
      return (
        <div key={card.id} className="reward-card">
          <div className="reward-card-back">
            <div className="reward-card-back-pattern">
              <span className="reward-card-back-star">✨</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={card.id} className={`reward-card ${card.flipped ? 'flipped' : ''}`}>
        <div className="reward-card-back">
          <div className="reward-card-back-pattern">
            <span className="reward-card-back-star">✨</span>
          </div>
        </div>
        <div className={`reward-card-front rarity-${card.reward.rarity}`}>
          <span className="reward-card-rarity">
            {card.reward.rarity === 'sss' ? 'SSS' :
             card.reward.rarity === 'ss' ? 'SS' :
             card.reward.rarity === 's' ? 'S' :
             card.reward.rarity === 'a' ? 'A' : '谢谢参与'}
          </span>
          <span className="reward-card-icon">{card.reward.icon}</span>
          <span className="reward-card-name">{card.reward.name}</span>
          <span className="reward-card-desc">{card.reward.desc}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="reward-section">
      <div className="reward-header">
        <h2 className="reward-title">奖励中心</h2>
      </div>

      {/* 抽取模式选择 - 在卡牌上方 */}
      <div className="reward-mode-selector">
        <button
          className={`reward-mode-btn ${drawMode === 1 ? 'active' : ''}`}
          onClick={() => handleModeChange(1)}
          disabled={isDrawing}
        >
          抽取一次
        </button>
        <button
          className={`reward-mode-btn ${drawMode === 5 ? 'active' : ''}`}
          onClick={() => handleModeChange(5)}
          disabled={isDrawing}
        >
          抽取五次
        </button>
      </div>

      {/* 卡牌区域 */}
      <div className="reward-cards-container">
        <div className="reward-cards-wrapper">
          {cards.length === 0 ? (
            <div style={{ color: '#9CA3AF', fontSize: '16px' }}>
              点击下方按钮开始抽取
            </div>
          ) : (
            cards.map((card, index) => renderCard(card, index))
          )}
        </div>
      </div>

      {/* 抽取按钮和消耗 - 在卡牌下方 */}
      <div className="reward-action-area">
        <div className="reward-cost-info">
          <div className="reward-cost">
            <span className="reward-cost-text">本次消耗：</span>
            <span className="reward-cost-value">
              <span className="reward-cost-icon">🎫</span>
              {drawMode === 1 ? '1' : '5'} 张抽奖券
            </span>
          </div>
          <div className="reward-balance">
            <span className="reward-balance-text">剩余抽奖券：</span>
            <span className="reward-balance-value">{tickets}</span>
          </div>
        </div>
        <button
          className="reward-draw-btn"
          onClick={handleDraw}
          disabled={isDrawing}
        >
          {isDrawing ? '抽取中...' : hasDrawn ? `再抽一次${drawMode === 1 ? '' : ' x5'}` : `开始抽取${drawMode === 1 ? '' : ' x5'}`}
        </button>
      </div>

      {/* 已抽取统计 */}
      <div className="reward-stats">
        <div className="reward-stats-header">
          <h4 className="reward-stats-title">已抽取统计</h4>
          <button
            className="reward-info-btn"
            onClick={() => setShowInfo(true)}
          >
            概率及奖励说明
          </button>
        </div>
        <div className="reward-stats-list">
          {rewardsPool.filter(r => r.rarity !== 'none').map(reward => (
            <div key={reward.id} className="reward-stats-item">
              <span className="reward-stats-icon">{reward.icon}</span>
              <span className="reward-stats-name">{reward.name}</span>
              <span className="reward-stats-count">{totalDrawn[reward.id] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 前往兑奖按钮 */}
      <div className="reward-exchange">
        <Link to="/reward-exchange" className="reward-exchange-btn">
          前往兑奖
        </Link>
      </div>

      {/* 概率说明弹窗 */}
      <RewardInfoModal
            visible={showInfo}
            onClose={() => setShowInfo(false)}
            stockMap={stockMap}
          />
    </div>
  );
};

// 主组件
const Personal = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [showTipModal, setShowTipModal] = useState(false);
  const currentToken = localStorage.getItem('token'); // 获取当前 token

  useEffect(() => {
    const hasSeenPersonalTip = localStorage.getItem('hasSeenPersonalTip');
    if (!hasSeenPersonalTip) {
      setShowTipModal(true);
    }
  }, []);

  // 监听 location.state，实现滚动到指定部分
  useEffect(() => {
    if (location.state?.scrollTo === 'in-progress') {
      setActiveTab('history');
      setTimeout(() => {
        const sectionTitles = document.querySelectorAll('.history-section-title');
        sectionTitles.forEach(title => {
          if (title.textContent === '进行中') {
            title.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }, 300);
    }
    if (location.state?.activeTab === 'reward') {
      setActiveTab('reward');
    }
  }, [location.state]);

  // 当切换到 profile tab 时，强制重新获取用户资料
  useEffect(() => {
    if (activeTab === 'profile') {
      // 触发 ProfileSection 重新挂载，通过改变 key
      // 这会确保每次切换到 profile tab 时都重新获取数据
    }
  }, [activeTab, currentToken]);

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
    <><div className="personal-container">
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
            <HomeIcon />
            <span className="sidebar-text">个人主页</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <HistoryIcon />
            <span className="sidebar-text">我的足迹</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <NotificationIcon />
            <span className="sidebar-text">我的通知</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'reward' ? 'active' : ''}`}
            onClick={() => setActiveTab('reward')}
          >
            <GiftIcon />
            <span className="sidebar-text">奖励中心</span>
          </button>
        </nav>
      </div>

      {/* 右侧内容区 */}
      <div className="personal-content">
        {activeTab === 'profile' && <ProfileSection key={currentToken} />}
        {activeTab === 'history' && <HistorySection location={location} />}
        {activeTab === 'notifications' && <NotificationsSection />}
        {activeTab === 'reward' && <RewardSection />}
      </div>
    </div><FeatureTipModal
        visible={showTipModal}
        title="个人中心使用说明"
        features={personalFeatures}
        notes={personalNotes}
        onClose={handleCloseModal} 
      />
    </div>
  </>
  );
}

export default Personal;