import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminSetupMessage, getAdminUsername, isAdminAuthenticated, loginAdmin } from "../utils/auth.js";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const setupMessage = getAdminSetupMessage();

  useEffect(() => {
    if (isAdminAuthenticated()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    if (!/^\d{6}$/.test(totpCode.trim())) {
      setError("Enter the 6-digit verification code from your authenticator app.");
      return;
    }

    if (setupMessage) {
      setError(setupMessage);
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await loginAdmin(username.trim(), password, totpCode.trim());

    if (result.success) {
      navigate("/dashboard", { replace: true });
      return;
    }

    setError(result.message || "Unable to sign in.");
    setIsSubmitting(false);
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
          maxWidth: "420px",
          background: "#0f172a",
          padding: "30px",
          borderRadius: "16px",
          border: "1px solid #1e293b",
          boxShadow: "0 16px 40px rgba(2, 6, 23, 0.35)",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: "24px" }}>Admin Login</h2>
        <p style={{ margin: "0 0 20px", color: "#94a3b8" }}>
          Sign in with your username, password, and the 6-digit code from your authenticator app.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={totpCode}
            onChange={(event) => {
              setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
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
              letterSpacing: "0.2em",
              textAlign: "center",
            }}
          />

          {setupMessage ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                background: "rgba(56, 189, 248, 0.14)",
                color: "#bae6fd",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                fontSize: "14px",
              }}
              role="status"
            >
              {setupMessage}
            </div>
          ) : null}

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
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              background: isSubmitting ? "#475569" : "#10b981",
              color: "white",
              border: "none",
              fontWeight: 700,
              cursor: isSubmitting ? "wait" : "pointer",
            }}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={{ margin: "16px 0 0", color: "#94a3b8", fontSize: "14px" }}>
          Expected username: {getAdminUsername() || "(set VITE_ADMIN_USERNAME)"}
        </p>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "14px" }}>
          The login uses a pre-provisioned TOTP secret from VITE_ADMIN_TOTP_SECRET and clears session state on logout.
        </p>
      </div>
    </div>
  );
}
