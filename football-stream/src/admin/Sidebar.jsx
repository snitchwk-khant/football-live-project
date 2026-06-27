import { Link, useNavigate } from "react-router-dom";
import { logoutAdmin } from "../utils/auth.js";

export default function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    logoutAdmin();
    navigate("/admin/login", { replace: true });
  }

  return (
    <aside
      style={{
        width: "100%",
        maxWidth: "240px",
        minHeight: "100vh",
        boxSizing: "border-box",
        background: "#0f172a",
        color: "white",
        padding: "20px",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <h2 style={{ color: "#10b981", textAlign: "center", marginBottom: "24px" }}>Admin</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link style={linkStyle} to="/dashboard">
            Dashboard
          </Link>
          <Link style={linkStyle} to="/dashboard/matches">
            Matches
          </Link>
          <Link style={linkStyle} to="/dashboard/streams">
            Streams
          </Link>
          <Link style={linkStyle} to="/dashboard/banners">
            Banners
          </Link>
          <Link style={linkStyle} to="/dashboard/media">
            Media
          </Link>
          <Link style={linkStyle} to="/dashboard/analytics">
            Analytics
          </Link>
          <Link style={linkStyle} to="/dashboard/settings">
            Settings
          </Link>
        </nav>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        style={{
          marginTop: "20px",
          padding: "12px 14px",
          borderRadius: "10px",
          border: "1px solid #334155",
          background: "#020617",
          color: "#fda4af",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </aside>
  );
}

const linkStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  minHeight: "48px",
  width: "100%",
  color: "white",
  textDecoration: "none",
  background: "#1e293b",
  padding: "12px 14px",
  borderRadius: "8px",
  textAlign: "left",
  boxSizing: "border-box",
};