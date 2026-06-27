import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { readSettings } from "../utils/settings";
import { formatMatchTime, getMatchPoster, getMatchTitle, normalizeMatchStatus, sortMatchesForPublic } from "../utils/matches";

const STATUS_LABELS = {
  live: "Live",
  upcoming: "Upcoming",
  ended: "Ended",
};

export default function MatchesPage() {
  const navigate = useNavigate();
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

  const handleOpenMatch = (match) => {
    navigate(`/watch/${match.id}`);
  };

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#020617",
      color: "#f8fafc",
      fontFamily: "sans-serif",
    },
    header: {
      backgroundColor: "#0f172a",
      padding: "24px 20px",
      borderBottom: "1px solid #1e293b",
    },
    inner: {
      maxWidth: "1180px",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
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
    },
    input: {
      flex: "1 1 220px",
      backgroundColor: "#020617",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#f8fafc",
      padding: "10px 12px",
      outline: "none",
    },
    select: {
      backgroundColor: "#020617",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#f8fafc",
      padding: "10px 12px",
      outline: "none",
      minWidth: "160px",
    },
    main: {
      maxWidth: "1180px",
      margin: "0 auto",
      padding: "24px 20px 40px",
      width: "100%",
    },
    grid: {
      display: "grid",
      gap: "16px",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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
    },
    image: {
      width: "100%",
      height: "162px",
      objectFit: "cover",
      backgroundColor: "#111827",
    },
    body: {
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      flex: 1,
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
    },
    primaryButton: {
      border: 0,
      borderRadius: "8px",
      backgroundColor: "#10b981",
      color: "#052e16",
      padding: "10px 12px",
      fontWeight: 700,
      cursor: "pointer",
    },
    secondaryButton: {
      border: "1px solid #334155",
      borderRadius: "8px",
      backgroundColor: "transparent",
      color: "#f8fafc",
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
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.inner}>
          <Link to="/" style={{ color: "#34d399", fontWeight: 700, textDecoration: "none" }}>
            ← Back to home
          </Link>
          <h1 style={styles.title}>Matches</h1>
          <p style={styles.subtitle}>
            Browse the latest football fixtures, see their status, and jump straight into the watch page when a stream is available.
          </p>
          <div style={styles.controls}>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search teams or league"
              style={styles.input}
              aria-label="Search matches"
            />
            <select value={selectedLeague} onChange={(event) => setSelectedLeague(event.target.value)} style={styles.select} aria-label="Filter by league">
              <option value="all">All Leagues</option>
              {leagueOptions.map((league) => (
                <option key={league} value={league}>
                  {league}
                </option>
              ))}
            </select>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} style={styles.select} aria-label="Filter by status">
              <option value="all">All Statuses</option>
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {loading ? <div style={styles.state}>Loading matches…</div> : null}
        {error ? <div style={styles.state} role="alert">{error}</div> : null}

        {!loading && !error && filteredMatches.length === 0 ? (
          <div style={styles.state}>No matches match the current filters.</div>
        ) : null}

        {!loading && !error && filteredMatches.length > 0 ? (
          <div style={styles.grid}>
            {filteredMatches.map((match) => {
              const status = normalizeMatchStatus(match);
              const poster = getMatchPoster(match);
              const matchTitle = getMatchTitle(match);
              return (
                <article key={match.id} style={styles.card} onClick={() => handleOpenMatch(match)} onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenMatch(match);
                  }
                }} tabIndex={0} role="button">
                  {poster ? <img src={poster} alt={matchTitle} style={styles.image} /> : null}
                  <div style={styles.body}>
                    <span style={{ ...styles.tag, backgroundColor: status === "live" ? "rgba(16,185,129,0.16)" : status === "ended" ? "rgba(248,113,113,0.16)" : "rgba(56,189,248,0.16)", color: status === "live" ? "#34d399" : status === "ended" ? "#f87171" : "#38bdf8" }}>
                      {STATUS_LABELS[status]}
                    </span>
                    <h2 style={styles.titleText}>{matchTitle}</h2>
                    <p style={styles.meta}>{match.home_team || "Home team"} vs {match.away_team || "Away team"}</p>
                    <p style={styles.meta}>{match.league || "League not set"}</p>
                    <p style={styles.meta}>{formatMatchTime(match.match_time)}</p>
                    <div style={styles.actions}>
                      <button type="button" onClick={() => handleOpenMatch(match)} style={styles.primaryButton}>
                        Watch
                      </button>
                      <Link to={`/watch/${match.id}`} style={styles.secondaryButton}>
                        Open page
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
