import MatchCard from "./MatchCard";

export default function MatchList({ matches, loading, error, onEdit, onDelete, onGoLive }) {
  if (loading) {
    return <div style={styles.state}>Loading matches...</div>;
  }

  if (error) {
    return <div style={{ ...styles.state, ...styles.error }}>{error}</div>;
  }

  if (!matches.length) {
    return <div style={styles.state}>No matches found. Add the first match above.</div>;
  }

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.heading}>All Matches</h2>
        <span style={styles.count}>{matches.length} total</span>
      </div>

      <div style={styles.grid}>
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onEdit={onEdit}
            onDelete={onDelete}
            onGoLive={onGoLive}
          />
        ))}
      </div>
    </section>
  );
}

const styles = {
  section: {
    marginTop: "24px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "14px",
  },
  heading: {
    margin: 0,
    color: "#f8fafc",
    fontSize: "22px",
    fontWeight: 700,
  },
  count: {
    color: "#94a3b8",
    fontSize: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "18px",
  },
  state: {
    marginTop: "24px",
    padding: "32px",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    background: "#0f172a",
    color: "#94a3b8",
    textAlign: "center",
  },
  error: {
    borderColor: "rgba(248, 113, 113, 0.45)",
    color: "#fecaca",
  },
};
