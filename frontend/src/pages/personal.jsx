import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./personal.css";
import FeatureTipModal from '../components/FeatureTipModal';

const Personal = () => {
  const location = useLocation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [prevTotalPages, setPrevTotalPages] = useState(1);
  const [visiblePages, setVisiblePages] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);

  useEffect(() => {
    const hasSeenHomeTip = localStorage.getItem('hasSeenHomeTip');
    if (!hasSeenHomeTip) {
      setShowTipModal(true);
    }
  }, []);

  const handleCloseModal = () => {
    setShowTipModal(false);
    localStorage.setItem('hasSeenHomeTip', 'true');
  };

  const homeFeatures = [
    '展示平台核心功能入口和推荐内容',
    '轮播图展示热门问题或平台公告',
    '可快速跳转到提问、浏览、匹配等核心板块',
    '无需登录即可查看首页内容'
  ];
  const homeNotes = [
    '首页内容会根据平台更新动态调整',
    '部分功能按钮需登录后才能使用',
    '轮播图点击可查看对应详情内容'
  ];

  useEffect(() => {
    fetchHistory();
    fetchNotifications();
  }, [currentPage]);

  // 监听 location.state，实现滚动到指定部分
  useEffect(() => {
    if (location.state?.scrollTo === 'in-progress') {
      // 等待页面加载完成后滚动
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

    // 检测totalPages是否发生了变化
    const totalPagesChanged = totalPages !== prevTotalPages;
    if (totalPagesChanged) {
      console.log('Total pages changed from', prevTotalPages, 'to', totalPages, '- recalculating');
      setPrevTotalPages(totalPages);
    }

    // 如果总页数小于5，显示所有页
    if (totalPages < maxPagesToShow) {
      const allPages = [];
      for (let i = 1; i <= totalPages; i++) {
        allPages.push(i);
      }
      console.log('Setting visible pages (total < 5):', allPages);
      setVisiblePages(allPages);
      setIsInitialized(true);
    } else {
      // 总页数大于等于5，最多显示5页
      let startPage, endPage;

      // 如果是初始加载（visiblePages为空或未初始化）或当前页不在可见页码中或totalPages发生了变化，重新计算
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
        // 当前页在可见页码中
        const lastVisiblePage = visiblePages[visiblePages.length - 1];
        const firstVisiblePage = visiblePages[0];

        // 向右翻页，只在当前页是最后一个可见页码时才调整
        if (currentPage === lastVisiblePage && currentPage < totalPages) {
          endPage = Math.min(totalPages, currentPage + 2);
          startPage = Math.max(1, endPage - maxPagesToShow + 1);
          console.log('Moving window right:', startPage, 'to', endPage);
        }
        // 向左翻页，只在当前页是第一个可见页码时才调整
        else if (currentPage === firstVisiblePage && currentPage > 1) {
          startPage = Math.max(1, currentPage - 2);
          endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
          console.log('Moving window left:', startPage, 'to', endPage);
        } else {
          // 不在边界，保持不变
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
      console.log('My questions data:', data); // 调试信息
      setHistory(data.questions || []);
      setTotalPages(Math.ceil(data.total / 4) || 1);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  // 获取待处理的结束申请
  const fetchNotifications = async () => {
    setNotificationLoading(true);
    try {
      const token = localStorage.getItem("token");
      console.log('[DEBUG] Fetching notifications with token:', token ? 'exists' : 'missing');

      if (!token) {
        console.error('[ERROR] No authentication token found');
        setNotifications([]);
        return;
      }

      const response = await fetch(
        "http://localhost:3000/api/chats/pending-requests",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('[DEBUG] Response status:', response.status);
      const data = await response.json();
      console.log('[DEBUG] Response data:', data);

      if (!response.ok) {
        console.error('[ERROR] API request failed:', data);
        if (response.status === 401) {
          console.error('[ERROR] Authentication failed - token may be expired');
        }
        setNotifications([]);
        return;
      }

      if (!data.success) {
        console.error('[ERROR] API returned unsuccessful:', data);
        setNotifications([]);
        return;
      }

      console.log('[SUCCESS] Notifications received:', data.requests?.length || 0);
      setNotifications(data.requests || []);
    } catch (error) {
      console.error("[ERROR] Network error:", error);
      setNotifications([]);
    } finally {
      setNotificationLoading(false);
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
        // 删除成功，刷新列表
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

  // 处理同意结束申请
  const handleAcceptEndRequest = async (pairId) => {
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
        fetchNotifications();
        fetchHistory();
      } else {
        const errorData = await response.json();
        alert(`操作失败：${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('同意结束申请错误:', error);
      alert('操作失败，请稍后重试');
    }
  };

  // 处理拒绝结束申请
  const handleRejectEndRequest = async (pairId) => {
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
        fetchNotifications();
        fetchHistory();
      } else {
        const errorData = await response.json();
        alert(`操作失败：${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('拒绝结束申请错误:', error);
      alert('操作失败，请稍后重试');
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
    <div className="personal-container">
      <div className="personal-header">
        <span className="breadcrumb-text">足迹</span>
      </div>

      {/* 消息通知区域 */}
      <div className="notification-section">
        <div className="notification-header">
          <div className="notification-icon-wrapper">
            <span className="notification-bell">🔔</span>
            {notifications.length > 0 && (
              <span className="notification-badge">{notifications.length}</span>
            )}
          </div>
          <button
            className="notification-toggle-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            {showNotifications ? '收起' : '展开'}
          </button>
        </div>

        {showNotifications && (
          <div className="notification-list">
            {notificationLoading ? (
              <div className="notification-loading">加载中...</div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div key={notification.pair_id} className="notification-item">
                  <div className="notification-content">
                    <div className="notification-title">对话结束申请</div>
                    <div className="notification-question-info">
                      <div className="notification-question-title">
                        问题：{notification.question_title}
                      </div>
                      <div className="notification-question-content">
                        {notification.question_content && notification.question_content.length > 50
                          ? notification.question_content.substring(0, 50) + '...'
                          : notification.question_content || '无内容'}
                      </div>
                    </div>
                  </div>
                  <div className="notification-actions">
                    <button
                      className="notification-btn notification-btn-reject"
                      onClick={() => handleRejectEndRequest(notification.pair_id)}
                    >
                      拒绝
                    </button>
                    <button
                      className="notification-btn notification-btn-accept"
                      onClick={() => handleAcceptEndRequest(notification.pair_id)}
                    >
                      同意
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="notification-empty">暂无待处理消息</div>
            )}
          </div>
        )}
      </div>

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
      <FeatureTipModal
        visible={showTipModal}
        title="首页使用说明"
        features={homeFeatures}
        notes={homeNotes}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Personal;
