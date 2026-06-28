import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { readSettings } from "../utils/settings";
import { formatMatchTime, getMatchPoster, getMatchTitle, hasPlayableStreamUrl, normalizeMatchStatus, sortMatchesForPublic } from "../utils/matches";
import { sanitizeImageUrl } from "../utils/security";

const STATUS_LABELS = {
  live: "Live",
  upcoming: "Upcoming",
  ended: "Ended",
};

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(readSettings());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    const handleSettingsUpdate = () => setSettings(readSettings());
    window.addEventListener("website-settings-updated", handleSettingsUpdate);

    if (settings.seoTitle) {
      document.title = `${settings.seoTitle} | Matches`;
    }

    return () => window.removeEventListener("website-settings-updated", handleSettingsUpdate);
  }, [settings.seoTitle]);

  useEffect(() => {
    let active = true;

    async function loadMatches() {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("matches")
        .select("id,title,home_team,away_team,league,status,match_time,is_live,poster,stream_url")
        .order("match_time", { ascending: true });

      if (!active) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setMatches(sortMatchesForPublic(data || []));
      setLoading(false);
    }

    void loadMatches();

    return () => {
      active = false;
    };
  }, []);

  const leagueOptions = useMemo(
    () => Array.from(new Set(matches.map((item) => item.league).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [matches]
  );

  const filteredMatches = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return matches.filter((item) => {
      const haystack = [item.home_team, item.away_team, item.league, item.title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesLeague = selectedLeague === "all" || item.league === selectedLeague;
      const status = normalizeMatchStatus(item);
      const matchesStatus = selectedStatus === "all" || status === selectedStatus;
      return matchesQuery && matchesLeague && matchesStatus;
    });
  }, [matches, searchQuery, selectedLeague, selectedStatus]);

  const getPrimaryAction = (match) => {
    const status = normalizeMatchStatus(match);
    const isPlayable = status === "live" || hasPlayableStreamUrl(match?.stream_url);

    return {
      label: isPlayable ? "Watch Live" : "View Match",
      to: isPlayable ? `/watch/${match.id}` : `/matches/${match.id}`,
    };
  };

  const pageStyles = `
    .matches-page-container,
    .matches-page-header,
    .matches-page-inner,
    .matches-page-main {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .matches-page-controls {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(180px, 1fr) minmax(180px, 1fr);
      gap: 12px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      margin-top: 8px;
    }

    .matches-page-input,
    .matches-page-select {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .matches-page-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    .matches-page-card {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      overflow: hidden;
    }

    .matches-page-image {
      width: 100%;
      max-width: 100%;
      height: 162px;
      object-fit: cover;
      display: block;
      flex-shrink: 0;
      background-color: #111827;
    }

    .matches-page-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: auto;
      padding-top: 8px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .matches-page-primary-button,
    .matches-page-secondary-button {
      width: auto;
      max-width: 100%;
      box-sizing: border-box;
      white-space: normal;
    }

    @media (max-width: 900px) {
      .matches-page-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .matches-page-controls {
        grid-template-columns: 1fr;
      }

      .matches-page-grid {
        grid-template-columns: 1fr;
      }

      .matches-page-actions {
        flex-direction: column;
      }

      .matches-page-primary-button,
      .matches-page-secondary-button {
        width: 100%;
        justify-content: center;
      }
    }
  `;

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#020617",
      color: "#f8fafc",
      fontFamily: "sans-serif",
      width: "100%",
      maxWidth: "100%",
      overflowX: "hidden",
      boxSizing: "border-box",
    },
    header: {
      backgroundColor: "#0f172a",
      padding: "24px clamp(16px, 4vw, 24px)",
      borderBottom: "1px solid #1e293b",
      width: "100%",
      boxSizing: "border-box",
    },
    inner: {
      maxWidth: "1180px",
      width: "100%",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      boxSizing: "border-box",
    },
    title: {
      margin: 0,
      fontSize: "30px",
      fontWeight: 700,
    },
    subtitle: {
      margin: 0,
      color: "#cbd5e1",
      maxWidth: "760px",
      lineHeight: 1.6,
    },
    controls: {
      display: "flex",
      gap: "12px",
      flexWrap: "wrap",
      marginTop: "8px",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
    },
    input: {
      flex: "1 1 220px",
      backgroundColor: "#020617",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#f8fafc",
      padding: "10px 12px",
      outline: "none",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
    },
    select: {
      backgroundColor: "#020617",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#f8fafc",
      padding: "10px 12px",
      outline: "none",
      minWidth: "160px",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
    },
    main: {
      maxWidth: "1180px",
      width: "100%",
      margin: "0 auto",
      padding: "24px clamp(16px, 4vw, 24px) 40px",
      boxSizing: "border-box",
    },
    grid: {
      display: "grid",
      gap: "16px",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
      maxWidth: "100%",
      width: "100%",
      minWidth: 0,
    },
    card: {
      backgroundColor: "#0f172a",
      borderRadius: "14px",
      border: "1px solid #1e293b",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      minHeight: "100%",
      cursor: "pointer",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      boxSizing: "border-box",
    },
    image: {
      width: "100%",
      maxWidth: "100%",
      height: "162px",
      objectFit: "cover",
      display: "block",
      backgroundColor: "#111827",
      flexShrink: 0,
    },
    body: {
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      flex: 1,
      minWidth: 0,
      boxSizing: "border-box",
    },
    tag: {
      alignSelf: "flex-start",
      padding: "5px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    titleText: {
      margin: 0,
      fontSize: "18px",
      fontWeight: 700,
      color: "#f8fafc",
    },
    meta: {
      margin: 0,
      color: "#cbd5e1",
      fontSize: "14px",
      lineHeight: 1.5,
    },
    actions: {
      marginTop: "auto",
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      paddingTop: "8px",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
    },
    primaryButton: {
      border: 0,
      borderRadius: "8px",
      backgroundColor: "#10b981",
      color: "#052e16",
      padding: "10px 12px",
      fontWeight: 700,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    state: {
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      border: "1px solid #1e293b",
      padding: "16px",
      color: "#cbd5e1",
      marginBottom: "16px",
    },
  };

  return (
    <div style={styles.container} className="matches-page-container">
      <style>{pageStyles}</style>
      <header style={styles.header} className="matches-page-header">
        <div style={styles.inner} className="matches-page-inner">
          <Link to="/" style={{ color: "#34d399", fontWeight: 700, textDecoration: "none" }}>
            ← Back to home
          </Link>
          <h1 style={styles.title}>Matches</h1>
          <p style={styles.subtitle}>
            Browse the latest football fixtures, see their status, and jump straight into the watch page when a stream is available.
          </p>
          <div style={styles.controls} className="matches-page-controls">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search teams or league"
              style={styles.input}
              className="matches-page-input"
              aria-label="Search matches"
            />
            <select value={selectedLeague} onChange={(event) => setSelectedLeague(event.target.value)} style={styles.select} className="matches-page-select" aria-label="Filter by league">
              <option value="all">All Leagues</option>
              {leagueOptions.map((league) => (
                <option key={league} value={league}>
                  {league}
                </option>
              ))}
            </select>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} style={styles.select} className="matches-page-select" aria-label="Filter by status">
              <option value="all">All Statuses</option>
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>
      </header>

      <main style={styles.main} className="matches-page-main">
        {loading ? <div style={styles.state}>Loading matches…</div> : null}
        {error ? <div style={styles.state} role="alert">{error}</div> : null}

        {!loading && !error && filteredMatches.length === 0 ? (
          <div style={styles.state}>No matches match the current filters.</div>
        ) : null}

        {!loading && !error && filteredMatches.length > 0 ? (
          <div style={styles.grid} className="matches-page-grid">
            {filteredMatches.map((match) => {
              const status = normalizeMatchStatus(match);
              const poster = getMatchPoster(match);
              const matchTitle = getMatchTitle(match);
              const action = getPrimaryAction(match);
              return (
                <article key={match.id} style={styles.card} className="matches-page-card">
                  {poster ? <img src={sanitizeImageUrl(poster)} alt={matchTitle} style={styles.image} className="matches-page-image" /> : null}
                  <div style={styles.body}>
                    <span style={{ ...styles.tag, backgroundColor: status === "live" ? "rgba(16,185,129,0.16)" : status === "ended" ? "rgba(248,113,113,0.16)" : "rgba(56,189,248,0.16)", color: status === "live" ? "#34d399" : status === "ended" ? "#f87171" : "#38bdf8" }}>
                      {STATUS_LABELS[status]}
                    </span>
                    <h2 style={styles.titleText}>{matchTitle}</h2>
                    <p style={styles.meta}>{match.home_team || "Home team"} vs {match.away_team || "Away team"}</p>
                    <p style={styles.meta}>{match.league || "League not set"}</p>
                    <p style={styles.meta}>{formatMatchTime(match.match_time)}</p>
                    <div style={styles.actions} className="matches-page-actions">
                      <Link to={action.to} style={styles.primaryButton} className="matches-page-primary-button">
                        {action.label}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </main>
    </div>
  );
}
