import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requireAuth } from "../services/auth";
import "./home.css";

const Home = () => {
  const navigate = useNavigate();
  const [showAboutModal, setShowAboutModal] = useState(false);

  const handleEnter = () => {
    if (requireAuth()) {
      navigate("/personal");
    }
  };

  const handleAskClick = () => {
    if (requireAuth()) {
      navigate("/ask");
    }
  };

  const handleDialogueClick = () => {
    if (requireAuth()) {
      navigate("/personal", { state: { scrollTo: 'in-progress' } });
    }
  };

  const handleBrowseClick = () => {
    if (requireAuth()) {
      navigate("/browse");
    }
  };

  const handleMatchClick = () => {
    if (requireAuth()) {
      navigate("/match");
    }
  };

  const handlePersonalClick = () => {
    if (requireAuth()) {
      navigate("/personal");
    }
  };

  const handleFeynmanClick = () => {
    setShowAboutModal(true);
  };

  const closeAboutModal = () => {
    setShowAboutModal(false);
  };

  // 关于模态框
  const AboutModal = () => {
    if (!showAboutModal) return null;

    const aboutContent = `
      <h2 style="font-size: 24px; font-weight: 600; color: #1a1a2e; margin-bottom: 20px;">关于此网站</h2>
      <p style="line-height: 1.8; color: #333; margin-bottom: 16px;">
        "费曼学习法"是由诺奖得主理查德·费曼提出的一种高效学习方法，可以总结为"以教促学"，这是"老师"与"学生"都能获益的学习方式，而且效果很好。
      </p>
      <p style="line-height: 1.8; color: #333; margin-bottom: 16px;">
        但是我们注意到，目前使用此方法的人不多，尤其对比较内向的人而言，因为他们缺乏教导对象。本网站试图改善这一情况，让更多人能实践费曼学习法。
      </p>
      <p style="line-height: 1.8; color: #333; margin-bottom: 20px;">
        我们将评估教学的效果，并继续改善网站体验，希望能让更多人掌握这种方法，提高学习效率。
      </p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
      <p style="font-size: 14px; color: #999; text-align: center;">（目前版本：Ver 1.0.0）</p>
    `;

    return (
      <div className="modal-overlay" onClick={closeAboutModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={closeAboutModal}>×</button>
          <div 
            className="modal-body" 
            dangerouslySetInnerHTML={{ __html: aboutContent }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="home">
      {/* Hero 区 */}
      <section className="hero">
        <h1 className="hero-title">TUTOME</h1>
        <button className="hero-btn" onClick={handleEnter}>ENTER</button>
      </section>

      {/* About us */}
      <section className="about">
        <h2 className="about-title">About us</h2>

        <div className="card-grid">
          <div className="card" onClick={handleFeynmanClick}>
            <h3>费曼学习法</h3>
            <p>学习 · 分享 · 成长</p>
          </div>

          <div className="card" onClick={handleAskClick}>
            <h3>提问</h3>
            <p>惟学无际，以问促知</p>
          </div>

          <div className="card" onClick={handleDialogueClick}>
            <h3>交流对话</h3>
            <p>海纳江河，辩理明真</p>
          </div>

          <div className="card" onClick={handleBrowseClick}>
            <h3>自由浏览</h3>
            <p>博观约取，触类旁通</p>
          </div>

          <div className="card" onClick={handleMatchClick}>
            <h3>匹配</h3>
            <p>以教验知，求是求真</p>
          </div>

          <div className="card" onClick={handlePersonalClick}>
            <h3>我的主页</h3>
            <p>学迹成章，知至知终</p>
          </div>
        </div>
      </section>

      {/* 关于模态框 */}
      <AboutModal />
    </div>
  );
};

export default Home;
