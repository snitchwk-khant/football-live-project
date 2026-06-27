import { Link } from "react-router-dom";

export default function Sidebar() {
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
      }}
    >
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