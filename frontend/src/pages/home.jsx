import React from "react";
import "./home.css";

const Home = () => {
  return (
    <div className="home">
      {/* Hero 区 */}
      <section className="hero">
        <h1 className="hero-title">TUTOME</h1>
        <button className="hero-btn">ENTER</button>
      </section>

      {/* About us */}
      <section className="about">
        <h2 className="about-title">About us</h2>

        <div className="card-grid">
          <div className="card">
            <h3>费曼学习法</h3>
            <p>学习 · 分享 · 成长</p>
          </div>

          <div className="card">
            <h3>提问</h3>
            <p>惟学无际，以问促知</p>
          </div>

          <div className="card">
            <h3>交流对话</h3>
            <p>海纳江河，辩理明真</p>
          </div>

          <div className="card">
            <h3>自由浏览</h3>
            <p>博观约取，触类旁通</p>
          </div>

          <div className="card">
            <h3>匹配</h3>
            <p>以教验知，求是求真</p>
          </div>

          <div className="card">
            <h3>我的主页</h3>
            <p>学迹成章，知至知终</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
