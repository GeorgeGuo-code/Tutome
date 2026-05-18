import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { checkAuth } from "../services/auth";
import "./home.css";
import { GuidePromptModal } from '../components/InteractiveGuide';

const Home = ({ guideActive, onGuideActiveChange }) => {
  const navigate = useNavigate();
  const isLoggedIn = checkAuth();
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGuidePrompt, setShowGuidePrompt] = useState(false);

  const handleAuthAction = (navigatePath, navigateState) => {
    if (!checkAuth()) {
      setShowLoginModal(true);
      return;
    }
    navigate(navigatePath, navigateState || {});
  };

  const handleEnter = () => {
    // 清空引导状态，避免之前的引导状态干扰
    sessionStorage.removeItem('guideActive');
    sessionStorage.removeItem('guideStep');
    onGuideActiveChange(false);

    // 标记已点击Enter
    localStorage.setItem('hasClickedEnter', 'true');

    // 未登录用户先登录
    if (!checkAuth()) {
      // 设置标记，登录后返回时显示引导提示
      sessionStorage.setItem('showGuideOnReturn', 'true');
      setShowLoginModal(true);
      return;
    }

    // 已登录用户直接显示引导提示弹窗（标亮Enter按钮）
    setShowGuidePrompt(true);
  };

  // 检查是否从登录页返回，显示引导提示
  useEffect(() => {
    const showGuideOnReturn = sessionStorage.getItem('showGuideOnReturn');
    if (showGuideOnReturn === 'true' && checkAuth() && !localStorage.getItem('guideDeclined')) {
      sessionStorage.removeItem('showGuideOnReturn');
      // 延迟一点显示，避免渲染冲突
      setTimeout(() => setShowGuidePrompt(true), 100);
    }
  }, []);

  const handleStartGuide = () => {
    setShowGuidePrompt(false);
    sessionStorage.setItem('guideActive', 'true');
    sessionStorage.setItem('guideStep', '0');
    // 开始引导时清除 personalTabChanged，确保正确刷新
    sessionStorage.removeItem('personalTabChanged');
    onGuideActiveChange(true);
  };

  const handleDeclineGuide = () => {
    setShowGuidePrompt(false);
    localStorage.setItem('guideDeclined', 'true');
    // 拒绝引导后留在主页，不需要跳转
  };

  const handleGuideComplete = () => {
    onGuideActiveChange(false);
    sessionStorage.removeItem('guideActive');
    // 在导航到 /personal 之前重置 personalTabChanged
    sessionStorage.setItem('personalTabChanged', 'false');
    // 直接刷新页面，而不是通过 navigate 切换路由
    window.location.href = '/personal';
  };

  const handleGuideNavigate = (path) => {
    navigate(path);
  };

  const handleAskClick = () => handleAuthAction("/ask");

  const handleDialogueClick = () => handleAuthAction("/ask", { state: { mode: "ai_teaching" } });

  const handleBrowseClick = () => handleAuthAction("/browse");

  const handleMatchClick = () => handleAuthAction("/match");

  const handlePersonalClick = () => {
    // 如果处于引导状态，不执行直接导航，让引导系统处理
    if (sessionStorage.getItem('guideActive') === 'true') {
      return;
    }
    handleAuthAction("/personal");
  };

  const handleFeynmanClick = () => {
    setShowAboutModal(true);
  };

  const closeAboutModal = () => {
    setShowAboutModal(false);
  };

  // 登录提示模态框
  const LoginPromptModal = () => {
    if (!showLoginModal) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
          <div className="modal-body" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a2e', marginBottom: 16 }}>请先登录</h2>
            <p style={{ color: '#666', marginBottom: 24 }}>登录后即可使用完整功能</p>
            <button
              style={{
                padding: '10px 40px',
                background: '#A69298',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer'
              }}
              onClick={() => {
                setShowLoginModal(false);
                navigate('/login');
              }}
            >
              去登录
            </button>
          </div>
        </div>
      </div>
    );
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
        但是我们注意到，目前使用此方法的人不多，尤其对比较内向的人而言，因为他们缺乏教导对象。本网站试图改善这一情况，为更多人提供结对学习的机会。
      </p>
      <p style="line-height: 1.8; color: #333; margin-bottom: 16px;">
        同时，本网站引入AI系统，帮助用户进行对话总结、测试生成等，希望提高学习效率，并有效评估学习成果。
      </p>
      <p style="line-height: 1.8; color: #333; margin-bottom: 20px;">
        我们将评估教学的效果，并继续改善网站体验，希望能让更多人掌握这种方法，提高学习效率。
      </p>
      <p style="line-height: 1.8; color: #333; margin-bottom: 20px;">
        如果您遇到任何问题或有任何建议，请随时联系我们。（向“管理员”发送私信）
      </p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
      <p style="font-size: 14px; color: #999; text-align: center;">（目前版本：Ver 2.0.0）</p>
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
        <button className={`hero-btn${isLoggedIn ? ' hero-btn-logged-in' : ''}`} onClick={handleEnter}>ENTER</button>
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
            <h3>真人提问</h3>
            <p>惟学无际，以问促知</p>
          </div>

          <div className="card" onClick={handleDialogueClick}>
            <h3>AI提问</h3>
            <p>与AI学生对话练习</p>
          </div>

          <div className="card" onClick={handleBrowseClick}>
            <h3>自由浏览</h3>
            <p>博观约取，触类旁通</p>
          </div>

          <div className="card" onClick={handleMatchClick}>
            <h3>匹配</h3>
            <p>以教验知，求是求真</p>
          </div>

          <div className="card" onClick={handlePersonalClick} data-guide="personal-card">
            <h3>我的主页</h3>
            <p>学迹成章，知至知终</p>
          </div>
        </div>
      </section>

      {/* 关于模态框 */}
      <AboutModal />
      {/* 登录提示模态框 */}
      <LoginPromptModal />
      {/* 引导提示弹窗 */}
      <GuidePromptModal
        visible={showGuidePrompt}
        onStart={handleStartGuide}
        onDecline={handleDeclineGuide}
      />
    </div>
  );
};

export default Home;
