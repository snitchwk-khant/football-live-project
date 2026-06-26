import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  function handleLogin() {
    if (password === "admin123") {
      navigate("/dashboard");
    } else {
      alert("Password မှားနေပါတယ်");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020617",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white"
    }}>
      <div style={{
        width: "320px",
        background: "#0f172a",
        padding: "30px",
        borderRadius: "12px",
        border: "1px solid #1e293b"
      }}>
        <h2>Admin Login</h2>

        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "15px",
            borderRadius: "8px"
          }}
        />

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "15px",
            borderRadius: "8px",
            background: "#10b981",
            color: "white",
            border: "none",
            fontWeight: "bold"
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
}