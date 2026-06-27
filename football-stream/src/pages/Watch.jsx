import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { supabase } from "../services/supabase";
import { readSettings } from "../utils/settings";
import { formatMatchTime, getMatchPoster, getMatchTitle, hasPlayableStreamUrl, normalizeMatchStatus } from "../utils/matches";
import { sanitizeImageUrl } from "../utils/security";

export default function WatchPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(readSettings());

  useEffect(() => {
    const handleSettingsUpdate = () => setSettings(readSettings());
    window.addEventListener("website-settings-updated", handleSettingsUpdate);
    return () => window.removeEventListener("website-settings-updated", handleSettingsUpdate);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadMatch() {
      setLoading(true);
      setError("");

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
    if (!match || !hasPlayableStreamUrl(match.stream_url)) {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.dispose();
        playerRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.innerHTML = "";
      }
      return;
    }

    if (videoRef.current && !playerRef.current) {
      const videoElement = document.createElement("video");
      videoElement.className = "video-js vjs-big-play-centered";
      videoElement.setAttribute("playsinline", "true");
      videoRef.current.appendChild(videoElement);

      playerRef.current = videojs(videoElement, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        preload: "auto",
        liveui: true,
        sources: [{ src: match.stream_url, type: "application/x-mpegURL" }],
      });
    }

    const currentVideoContainer = videoRef.current;

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      if (currentVideoContainer) {
        currentVideoContainer.innerHTML = "";
      }
    };
  }, [match]);

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

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#020617",
      color: "#f8fafc",
      fontFamily: "sans-serif",
    },
    header: {
      backgroundColor: "#0f172a",
      borderBottom: "1px solid #1e293b",
      padding: "24px 20px",
    },
    inner: {
      maxWidth: "1160px",
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
      lineHeight: 1.6,
      maxWidth: "760px",
    },
    main: {
      maxWidth: "1160px",
      margin: "0 auto",
      padding: "24px 20px 40px",
      display: "grid",
      gridTemplateColumns: "1.4fr 0.8fr",
      gap: "20px",
    },
    playerCard: {
      backgroundColor: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: "16px",
      overflow: "hidden",
    },
    playerBox: {
      minHeight: "360px",
      backgroundColor: "#000000",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "20px",
      color: "#94a3b8",
      textAlign: "center",
    },
    sidebar: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    infoCard: {
      backgroundColor: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: "14px",
      padding: "18px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
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
    posterImage: {
      width: "100%",
      height: "220px",
      objectFit: "cover",
      backgroundColor: "#111827",
      display: "block",
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
    },
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.inner}>
          <button type="button" onClick={() => navigate(-1)} style={styles.button}>
            ← Back
          </button>
          <h1 style={styles.title}>{match ? getMatchTitle(match) : "Loading match…"}</h1>
          <p style={styles.subtitle}>
            Follow this fixture, check the latest status, and open the stream when it becomes available.
          </p>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.playerCard}>
          {poster ? <img src={sanitizeImageUrl(poster)} alt={match ? getMatchTitle(match) : "Match poster"} style={styles.posterImage} /> : null}
          <div style={styles.playerBox}>
            {loading ? (
              <div>Loading watch page…</div>
            ) : error ? (
              <div role="alert">{error}</div>
            ) : hasPlayableStreamUrl(match?.stream_url) ? (
              <div style={{ width: "100%" }}>
                <div ref={videoRef} />
              </div>
            ) : (
              <div>Stream is not available yet.</div>
            )}
          </div>
        </section>

        <aside style={styles.sidebar}>
          <div style={styles.infoCard}>
            <p style={styles.label}>Match</p>
            <h2 style={{ margin: 0, fontSize: "22px" }}>{match ? getMatchTitle(match) : "—"}</h2>
          </div>
          <div style={styles.infoCard}>
            <p style={styles.label}>Teams</p>
            <p style={styles.value}>{match?.home_team || "Home team"} vs {match?.away_team || "Away team"}</p>
            <p style={styles.label}>League</p>
            <p style={styles.value}>{match?.league || "League not set"}</p>
            <p style={styles.label}>Status</p>
            <p style={styles.value}>{status === "live" ? "Live" : status === "ended" ? "Ended" : "Upcoming"}</p>
            <p style={styles.label}>Kickoff</p>
            <p style={styles.value}>{match ? formatMatchTime(match.match_time) : "—"}</p>
          </div>
          <div style={styles.infoCard}>
            <Link to="/matches" style={styles.button}>Browse all matches</Link>
          </div>
        </aside>
      </main>
    </div>
  );
}
