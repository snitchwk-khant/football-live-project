import { Link } from "react-router-dom";
import Sidebar from "./Sidebar";

const cards = [
  { title: "Live Match", description: "Manage the current live match", to: "/dashboard/matches" },
  { title: "Streams", description: "Update the live stream URL", to: "/dashboard/streams" },
  { title: "Banners", description: "Manage advertisements and promos", to: "/dashboard/banners" },
  { title: "Media Library", description: "Upload and organise media files", to: "/dashboard/media" },
];

export default function Dashboard() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#020617", color: "white" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "40px", background: "#020617" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 600 }}>Football Admin Dashboard</h1>
          <p style={{ margin: "8px 0 0", color: "#94a3b8" }}>Quick access to the main admin areas.</p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            maxWidth: "900px",
          }}
        >
          {cards.map((card) => (
            <Link key={card.title} to={card.to} style={cardStyle}>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>{card.title}</h3>
              <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.5 }}>{card.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

const cardStyle = {
  background: "#0f172a",
  padding: "24px",
  borderRadius: "12px",
  border: "1px solid #1e293b",
  color: "white",
  textDecoration: "none",
  transition: "transform 0.2s ease, border-color 0.2s ease",
};