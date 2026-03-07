import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./browse.css";

const Browse = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [prevTotalPages, setPrevTotalPages] = useState(1);
  const [visiblePages, setVisiblePages] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 角色转换函数
  const getRoleText = (role) => {
    if (!role) return '未知';
    return role === 'student' ? '学生' : '老师';
  };

  useEffect(() => {
    fetchQuestions();
  }, [currentPage, mode]);

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

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/questions?page=${currentPage}&limit=4`
      );
      const data = await response.json();
      setQuestions(data.questions || []);
      setTotalPages(Math.ceil(data.total / 4) || 1);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPageNumbers = () => {
    return visiblePages;
  };

  return (
    <div className="browse-container">
      <div className="browse-header">
        <span className="filter-label">请选择浏览模式</span>
        <select
          className="filter-select"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="all">全部</option>
          <option value="latest">最新</option>
          <option value="popular">热门</option>
        </select>
      </div>

      <div className="questions-list">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : questions.length === 0 ? (
          <div className="empty">暂无问题</div>
        ) : (
          questions.map((question) => (
            <div key={question.id} className="question-card">
              <div className="question-header">
                <h3 className="question-title">{question.title}</h3>
                {question.tags && question.tags.length > 0 && (
                  <div className="question-tags-inline">
                    {question.tags.map((tag) => (
                      <span key={tag.id} className="tag-small">{tag.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <p className="question-summary">
                {question.content.substring(0, 100)}...
              </p>
              <div className="question-meta">
                <span className="meta-item">
                  发起者: {question.username || '未知用户'}
                </span>
                <span className="meta-item">
                  发起者身份: {getRoleText(question.role)}
                </span>
                <span className="meta-item">
                  {question.created_at ? new Date(question.created_at).toLocaleString('zh-CN') : '未知时间'}
                </span>
              </div>
              <div className="question-actions">
                <Link to={`/question/${question.id}`} state={{ question, from: '/browse' }} className="view-details">
                  查看详情
                </Link>
              </div>
            </div>
          ))
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

export default Browse;