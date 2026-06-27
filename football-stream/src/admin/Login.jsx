import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminUsername, isAdminAuthenticated, loginAdmin } from "../utils/auth.js";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdminAuthenticated()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  function handleLogin(event) {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    const ok = loginAdmin(username.trim(), password);

    if (ok) {
      setError("");
      navigate("/dashboard", { replace: true });
    } else {
      setError("Invalid username or password.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "#0f172a",
          padding: "30px",
          borderRadius: "16px",
          border: "1px solid #1e293b",
          boxShadow: "0 16px 40px rgba(2, 6, 23, 0.35)",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: "24px" }}>Admin Login</h2>
        <p style={{ margin: "0 0 20px", color: "#94a3b8" }}>
          Sign in to manage the football-stream dashboard.
        </p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              if (error) setError("");
            }}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#020617",
              color: "white",
              boxSizing: "border-box",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#020617",
              color: "white",
              boxSizing: "border-box",
            }}
          />

          {error ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                background: "rgba(248, 113, 113, 0.14)",
                color: "#fda4af",
                border: "1px solid rgba(248, 113, 113, 0.2)",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              background: "#10b981",
              color: "white",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </form>

        <p style={{ margin: "16px 0 0", color: "#94a3b8", fontSize: "14px" }}>
          Default login: {getAdminUsername()} / admin123
        </p>
      </div>
    </div>
  );
}