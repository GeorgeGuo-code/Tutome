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
        `http://localhost:3000/api/questions/my?page=${currentPage}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
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
            <div key={item.id} className="history-card">
              <h3 className="history-title">标题</h3>
              <p className="history-summary">
                {item.content.substring(0, 100)}...
              </p>
              <div className="history-actions">
                <Link to={`/question/${item.id}`} className="view-details">
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