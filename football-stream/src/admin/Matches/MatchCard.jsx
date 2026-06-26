export default function MatchCard({ match, onEdit, onDelete, onGoLive }) {
  const title = match.title || `${match.home_team || "Home"} vs ${match.away_team || "Away"}`;

  return (
    <article style={styles.card}>
      <div style={styles.posterWrap}>
        {match.poster ? (
          <img src={match.poster} alt={title} loading="lazy" style={styles.poster} />
        ) : (
          <div style={styles.posterFallback}>No Poster</div>
        )}

        <span
          style={{
            ...styles.liveBadge,
            background: match.is_live ? "rgba(16, 185, 129, 0.18)" : "rgba(100, 116, 139, 0.2)",
            color: match.is_live ? "#34d399" : "#cbd5e1",
            borderColor: match.is_live ? "rgba(52, 211, 153, 0.35)" : "rgba(148, 163, 184, 0.25)",
          }}
        >
          {match.is_live ? "LIVE" : match.status || "OFFLINE"}
        </span>
      </div>

      <div style={styles.body}>
        <p style={styles.league}>{match.league || "League not set"}</p>
        <h3 style={styles.title}>{title}</h3>

        <div style={styles.teams}>
          <span>{match.home_team || "Home team"}</span>
          <strong style={styles.vs}>VS</strong>
          <span>{match.away_team || "Away team"}</span>
        </div>

        <dl style={styles.details}>
          <div style={styles.detailRow}>
            <dt style={styles.detailLabel}>Time</dt>
            <dd style={styles.detailValue}>{formatDate(match.match_time)}</dd>
          </div>
          <div style={styles.detailRow}>
            <dt style={styles.detailLabel}>Stream</dt>
            <dd title={match.stream_url || ""} style={styles.detailValue}>
              {match.stream_url ? "Configured" : "Missing"}
            </dd>
          </div>
        </dl>

        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => onGoLive(match.id)}
            disabled={match.is_live}
            style={{
              ...styles.goLiveButton,
              opacity: match.is_live ? 0.65 : 1,
              cursor: match.is_live ? "not-allowed" : "pointer",
            }}
          >
            {match.is_live ? "Currently Live" : "Go Live"}
          </button>
          <button type="button" onClick={() => onEdit(match)} style={styles.secondaryButton}>
            Edit
          </button>
          <button type="button" onClick={() => onDelete(match.id)} style={styles.deleteButton}>
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function formatDate(value) {
  if (!value) return "Not scheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const styles = {
  card: {
    overflow: "hidden",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    background: "#0f172a",
  },
  posterWrap: {
    position: "relative",
    background: "#020617",
  },
  poster: {
    display: "block",
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
  },
  posterFallback: {
    display: "grid",
    placeItems: "center",
    width: "100%",
    aspectRatio: "16 / 9",
    color: "#64748b",
    background: "#111827",
    fontWeight: 700,
  },
  liveBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    border: "1px solid",
    borderRadius: "999px",
    padding: "5px 9px",
    fontSize: "12px",
    fontWeight: 800,
  },
  body: {
    padding: "16px",
  },
  league: {
    margin: 0,
    color: "#38bdf8",
    fontSize: "13px",
    fontWeight: 700,
  },
  title: {
    margin: "6px 0 0",
    color: "#f8fafc",
    fontSize: "18px",
    fontWeight: 800,
    lineHeight: 1.25,
  },
  teams: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "10px",
    marginTop: "14px",
    color: "#cbd5e1",
    fontSize: "14px",
  },
  vs: {
    color: "#94a3b8",
    fontSize: "12px",
  },
  details: {
    display: "grid",
    gap: "8px",
    margin: "16px 0 0",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
  },
  detailLabel: {
    color: "#94a3b8",
    fontSize: "13px",
  },
  detailValue: {
    margin: 0,
    color: "#e2e8f0",
    fontSize: "13px",
    textAlign: "right",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginTop: "16px",
  },
  goLiveButton: {
    gridColumn: "1 / -1",
    border: 0,
    borderRadius: "8px",
    background: "#10b981",
    color: "#052e16",
    padding: "10px",
    fontWeight: 800,
  },
  secondaryButton: {
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "#1e293b",
    color: "#f8fafc",
    padding: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },
  deleteButton: {
    border: "1px solid rgba(248, 113, 113, 0.5)",
    borderRadius: "8px",
    background: "rgba(127, 29, 29, 0.45)",
    color: "#fecaca",
    padding: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },
};
