import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./browse.css";

const Browse = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchQuestions();
  }, [currentPage, mode]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/questions?page=${currentPage}&limit=10`
      );
      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
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
              <h3 className="question-title">{question.title}</h3>
              <p className="question-summary">
                {question.content.substring(0, 100)}...
              </p>
              <div className="question-actions">
                <Link to={`/question/${question.id}`} state={{ question }} className="view-details">
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

export default Browse;