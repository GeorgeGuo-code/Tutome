import React, { useState } from "react";
import "./login.css";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true); // true = 登录, false = 注册
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("处理中...");

    const endpoint = isLogin ? "login" : "register";
    const apiUrl = `http://localhost:3000/api/${endpoint}`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(isLogin ? "登录成功!" : "注册成功!");
        if (isLogin && data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("username", username);
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
        }
      } else {
        setMessage(data.message || "操作失败");
      }
    } catch (error) {
      setMessage("服务器错误,请稍后重试");
      console.error("Error:", error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{isLogin ? "登录" : "注册"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="submit-btn">
            {isLogin ? "登录" : "注册"}
          </button>
        </form>
        {message && <p className="message">{message}</p>}
        <p className="toggle-text">
          {isLogin ? "还没有账号?" : "已有账号?"}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage("");
            }}
          >
            {isLogin ? "去注册" : "去登录"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;