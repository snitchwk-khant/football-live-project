import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInAdmin, signOutAdmin } from "../auth/adminAuth";
import useAdminAccess from "../auth/useAdminAccess";
import AdminMfa from "../auth/AdminMfa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);
  const inFlight = useRef(false);
  const access = useAdminAccess();
  const navigate = useNavigate();

  useEffect(() => {
    if (!access.loading && access.stage === "ready") navigate("/dashboard", { replace: true });
  }, [access.loading, access.stage, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await signInAdmin(email, password);
      await access.refresh();
    } catch {
      setError("Unable to sign in with this account. Check your credentials and admin access, then retry.");
    } finally {
      setPassword("");
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError("");
    try {
      await signOutAdmin();
      await access.refresh();
    } catch {
      setError("Unable to finish signing out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || mfaBusy || access.loading;
  const needsMfa = access.stage === "enroll" || access.stage === "challenge";

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
        {access.loading && <p role="status">Checking admin access…</p>}
        {needsMfa ? (
          <AdminMfa key={access.userId} access={{ ...access, loading: busy || access.loading }} onBusy={setMfaBusy} inputStyle={inputStyle} buttonStyle={buttonStyle} />
        ) : access.stage !== "ready" && (
          <>
            <p style={{ margin: "0 0 20px", color: "#94a3b8" }}>Sign in with your admin email and password.</p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="email" aria-label="Email" placeholder="Email" autoComplete="username" required value={email} disabled={disabled}
                onChange={(event) => { setEmail(event.target.value); setError(""); }} style={inputStyle} />
              <input type="password" aria-label="Password" placeholder="Password" autoComplete="current-password" required value={password} disabled={disabled}
                onChange={(event) => { setPassword(event.target.value); setError(""); }} style={inputStyle} />
              <button type="submit" disabled={disabled} style={{ ...buttonStyle, background: disabled ? "#475569" : "#10b981", cursor: disabled ? "wait" : "pointer" }}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </>
        )}
        {(error || access.error) && <p role="alert" style={{ color: "#fda4af" }}>{error || access.error}</p>}
        {(needsMfa || access.error) && (
          <button type="button" onClick={handleSignOut} disabled={disabled} style={{ ...buttonStyle, marginTop: "16px", background: "#334155" }}>Sign out</button>
        )}
        <p style={{ margin: "16px 0 0", color: "#94a3b8", fontSize: "14px" }}>Admin access requires authenticator verification.</p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #334155",
  background: "#020617", color: "white", boxSizing: "border-box",
};
const buttonStyle = {
  width: "100%", padding: "12px", borderRadius: "10px", background: "#10b981",
  color: "white", border: "none", fontWeight: 700, cursor: "pointer",
};
