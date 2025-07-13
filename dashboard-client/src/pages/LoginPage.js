import React, { useState } from "react";
import axios from "../services/api";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css"; // Link to the new CSS file
import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setLanguage } = useContext(LanguageContext);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
  
    try {
      const role = username === "admin" ? "admin" : "owner";
      const res = await axios.post("/auth/login", { username, password, role });
      const { token, user } = res.data;
  
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("lang", res.data.lang);
      localStorage.setItem("justLoggedIn", "true"); // ✅ Set this correctly
      setLanguage(res.data.lang);
  
      if (user.role === "admin") {
        navigate("/admin/Dashboard");
      } else {
        navigate("/owner/Dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="overlay"></div>
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}

        
      </div>
    </div>
  );
}

export default LoginPage;
