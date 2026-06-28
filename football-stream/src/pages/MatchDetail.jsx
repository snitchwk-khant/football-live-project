import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import { readSettings } from "../utils/settings";
import { formatMatchTime, getMatchPoster, getMatchTitle, hasPlayableStreamUrl, normalizeMatchStatus } from "../utils/matches";
import { sanitizeImageUrl } from "../utils/security";

export default function MatchDetailPage() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(readSettings());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleSettingsUpdate = () => setSettings(readSettings());
    window.addEventListener("website-settings-updated", handleSettingsUpdate);
    return () => window.removeEventListener("website-settings-updated", handleSettingsUpdate);
  }, []);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth <= 900);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadMatch() {
      setLoading(true);
      setError("");

      if (!matchId || !/^\d+$/.test(`${matchId}`)) {
        setError("This match could not be found.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("matches")
        .select("id,title,home_team,away_team,league,status,match_time,is_live,stream_url,poster")
        .eq("id", matchId)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("This match could not be found.");
        setLoading(false);
        return;
      }

      setMatch(data);
      setLoading(false);
    }

    if (matchId) {
      void loadMatch();
    }

    return () => {
      active = false;
    };
  }, [matchId]);

  useEffect(() => {
    if (!match) {
      return;
    }

    if (settings.seoTitle) {
      document.title = `${settings.seoTitle} | ${getMatchTitle(match)}`;
    }
  }, [match, settings.seoTitle]);

  const status = useMemo(() => (match ? normalizeMatchStatus(match) : "upcoming"), [match]);
  const poster = match ? getMatchPoster(match) : "";
  const title = match ? getMatchTitle(match) : "Loading match…";
  const hasStream = match ? hasPlayableStreamUrl(match.stream_url) : false;

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
      borderBottom: "1px solid #1e293b",
      padding: isMobile ? "18px 14px" : "24px clamp(16px, 4vw, 24px)",
      width: "100%",
      boxSizing: "border-box",
    },
    inner: {
      maxWidth: "1120px",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      width: "100%",
      boxSizing: "border-box",
    },
    title: {
      margin: 0,
      fontSize: isMobile ? "24px" : "30px",
      fontWeight: 700,
    },
    subtitle: {
      margin: 0,
      color: "#cbd5e1",
      lineHeight: 1.6,
      maxWidth: "760px",
    },
    main: {
      maxWidth: "1120px",
      width: "100%",
      margin: "0 auto",
      padding: isMobile ? "16px 14px 32px" : "24px clamp(16px, 4vw, 24px) 40px",
      boxSizing: "border-box",
      display: "grid",
      gap: "20px",
      gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
    },
    card: {
      backgroundColor: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: "16px",
      overflow: "hidden",
      minWidth: 0,
      boxSizing: "border-box",
    },
    posterImage: {
      width: "100%",
      height: "240px",
      objectFit: "cover",
      display: "block",
      backgroundColor: "#111827",
    },
    body: {
      padding: "18px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      minWidth: 0,
      boxSizing: "border-box",
    },
    label: {
      margin: 0,
      color: "#38bdf8",
      fontSize: "12px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    value: {
      margin: 0,
      color: "#f8fafc",
      fontSize: "15px",
      lineHeight: 1.5,
    },
    button: {
      border: "1px solid #334155",
      borderRadius: "8px",
      backgroundColor: "transparent",
      color: "#f8fafc",
      padding: "10px 12px",
      cursor: "pointer",
      fontWeight: 700,
      textDecoration: "none",
      textAlign: "center",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "fit-content",
    },
    state: {
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      border: "1px solid #1e293b",
      padding: "16px",
      color: "#cbd5e1",
    },
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.inner}>
          <Link to="/matches" style={{ color: "#34d399", fontWeight: 700, textDecoration: "none" }}>
            ← Back to matches
          </Link>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.subtitle}>
            Review the fixture details and open the live stream when it becomes available.
          </p>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.card}>
          {poster ? <img src={sanitizeImageUrl(poster)} alt={title} style={styles.posterImage} /> : null}
          <div style={styles.body}>
            {loading ? <div style={styles.state}>Loading match details…</div> : null}
            {error ? <div style={styles.state} role="alert">{error}</div> : null}
            {!loading && !error && match ? (
              <>
                <p style={styles.label}>Status</p>
                <p style={styles.value}>{status === "live" ? "Live" : status === "ended" ? "Ended" : "Upcoming"}</p>
                <p style={styles.label}>Teams</p>
                <p style={styles.value}>{match.home_team || "Home team"} vs {match.away_team || "Away team"}</p>
                <p style={styles.label}>League</p>
                <p style={styles.value}>{match.league || "League not set"}</p>
                <p style={styles.label}>Kickoff</p>
                <p style={styles.value}>{formatMatchTime(match.match_time)}</p>
                {hasStream ? (
                  <Link to={`/watch/${match.id}`} style={styles.button}>Watch Live</Link>
                ) : (
                  <div style={styles.state}>No stream is available for this match yet.</div>
                )}
              </>
            ) : null}
          </div>
        </section>

        <aside style={styles.card}>
          <div style={styles.body}>
            <p style={styles.label}>About this match</p>
            <p style={styles.value}>
              This page gives supporters a simple overview of the fixture before they open the stream.
            </p>
            <Link to="/matches" style={styles.button}>Browse all matches</Link>
          </div>
        </aside>
      </main>
    </div>
  );
}
