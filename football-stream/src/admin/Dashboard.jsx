import Sidebar from "./Sidebar";

export default function Dashboard() {
  return (
    <div style={{ display: "flex", background: "#020617", color: "white" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "40px" }}>
        <h1>Football Admin Dashboard</h1>

        <div style={{ marginTop: "30px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          <div style={cardStyle}>
            <h3>Live Match</h3>
            <p>Manage current live match</p>
          </div>

          <div style={cardStyle}>
            <h3>Streams</h3>
            <p>Update live stream URL</p>
          </div>

          <div style={cardStyle}>
            <h3>Banners</h3>
            <p>Manage advertisements</p>
          </div>
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
};