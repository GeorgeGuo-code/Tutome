import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./personal.css";

const Personal = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchHistory();
  }, [currentPage]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/questions/my-questions?page=${currentPage}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      console.log('My questions data:', data); // 调试信息
      setHistory(data.questions || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="personal-container">
      <div className="personal-header">
        <span className="breadcrumb-text">足迹</span>
      </div>

      <div className="history-list">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : history.length === 0 ? (
          <div className="empty">暂无足迹</div>
        ) : (
          history.map((item) => (
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
        {[1, 2, 3, 4, 5].map((page) => (
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
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default Personal;