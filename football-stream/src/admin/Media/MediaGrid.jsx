import MediaCard from "./MediaCard";

export default function MediaGrid({ items, loading, onDelete }) {
  if (loading) {
    return <div style={styles.state}>Loading media...</div>;
  }

  if (!items.length) {
    return <div style={styles.state}>No images uploaded yet.</div>;
  }

  return (
    <section style={styles.grid}>
      {items.map((item) => (
        <MediaCard key={item.path} item={item} onDelete={onDelete} />
      ))}
    </section>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "18px",
    marginTop: "24px",
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
};
