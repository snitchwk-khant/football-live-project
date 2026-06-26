import { useCallback, useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { supabase } from "../services/supabase";

export default function Home() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const [match, setMatch] = useState({
    title: "Loading...",
    home_team: "",
    away_team: "",
    league: "",
    stream_url: "",
    status: "OFFLINE",
    match_time: null,
    is_live: false,
  });

  const fetchLiveMatch = useCallback(async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("is_live", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log("Load live match error:", error);
      return null;
    }

    return data;
  }, []);

  function applyMatch(data) {
    if (!data) {
      setMatch({
        title: "No Live Match",
        home_team: "",
        away_team: "",
        league: "",
        stream_url: "",
        status: "OFFLINE",
        match_time: null,
        is_live: false,
      });
      return;
    }

    setMatch(data);
  }

  const refreshLiveMatch = useCallback(async () => {
    const data = await fetchLiveMatch();
    console.log("Live match refetched");
    applyMatch(data);
  }, [fetchLiveMatch]);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) refreshLiveMatch();
    });

    const channel = supabase
      .channel("public-matches-live-homepage")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          console.log("Realtime event received");
          refreshLiveMatch().then(() => {
            if (!active) return;
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Realtime connected");
          refreshLiveMatch();
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [refreshLiveMatch]);

  useEffect(() => {
    if (videoRef.current && !playerRef.current && match.stream_url) {
      const videoElement = document.createElement("video");
      videoElement.className = "video-js vjs-big-play-centered";
      videoElement.setAttribute("playsinline", "true");
      videoRef.current.appendChild(videoElement);

      const player = (playerRef.current = videojs(videoElement, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        preload: "auto",
        liveui: true,
        sources: [
          {
            src: match.stream_url,
            type: "application/x-mpegURL",
          },
        ],
      }));

      player.on("error", () => {
        setTimeout(() => {
          if (match.stream_url) {
            player.src({
              src: match.stream_url,
              type: "application/x-mpegURL",
            });
            player.load();
            player.play().catch(() => {});
          }
        }, 5000);
      });
    }

  }, [match.stream_url]);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!playerRef.current) return;

    if (!match.stream_url) {
      playerRef.current.pause();
      playerRef.current.src([]);
      return;
    }

    const currentSrc = playerRef.current.currentSrc();

    if (currentSrc !== match.stream_url) {
      playerRef.current.src({
        src: match.stream_url,
        type: "application/x-mpegURL",
      });
      playerRef.current.load();
      playerRef.current.play().catch(() => {});
    }
  }, [match.stream_url]);

  const matchTime = match.match_time
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(match.match_time))
    : "Not scheduled";

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#020617",
      color: "#ffffff",
      fontFamily: "sans-serif",
    },
    header: {
      backgroundColor: "#0f172a",
      padding: "20px",
      borderBottom: "1px solid #1e293b",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    logo: {
      color: "#10b981",
      fontSize: "24px",
      fontWeight: "bold",
      margin: 0,
    },
    badge: {
      backgroundColor:
        match.is_live
          ? "rgba(16, 185, 129, 0.1)"
          : "rgba(239, 68, 68, 0.1)",
      color: match.is_live ? "#34d399" : "#f87171",
      padding: "6px 12px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "bold",
    },
    main: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "20px",
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: "20px",
    },
    videoBox: {
      backgroundColor: "#000000",
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid #1e293b",
    },
    adBox: {
      background: "linear-gradient(to right, #059669, #0d9488)",
      minHeight: "96px",
      borderRadius: "12px",
      marginTop: "16px",
      padding: "10px",
      textAlign: "center",
    },
    sidebar: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    infoBox: {
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      padding: "20px",
      border: "1px solid #1e293b",
      height: "260px",
    },
    sideAd: {
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      padding: "20px",
      border: "1px solid #1e293b",
      height: "180px",
      textAlign: "center",
    },
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>LIVE FOOTBALL</h1>
        <div style={styles.badge}>
          ● {match.is_live ? "LIVE NOW" : "NO LIVE MATCH"}
        </div>
      </header>

      <main style={styles.main}>
        <div>
          <div style={styles.videoBox}>
            <div ref={videoRef} />
          </div>

          <div style={styles.adBox}>
            <p>Sponsored Advertisement</p>
            <h2>သင့်လုပ်ငန်းကြော်ငြာများကို ဤနေရာတွင် ထည့်သွင်းနိုင်ပါသည်</h2>
          </div>
        </div>

        <div style={styles.sidebar}>
          <div style={styles.infoBox}>
            <h3>Live Match Info</h3>
            <p>
              လက်ရှိပြသနေသည့်ပွဲစဉ်- <b>{match.title}</b>
            </p>
            <p>
              Home Team: <b>{match.home_team || "-"}</b>
            </p>
            <p>
              Away Team: <b>{match.away_team || "-"}</b>
            </p>
            <p>
              League: <b>{match.league || "-"}</b>
            </p>
            <p>
              Match Time: <b>{matchTime}</b>
            </p>
          </div>

          <div style={styles.sideAd}>
            <p>ADVERTISEMENT</p>
            <span>Side Banner Ads</span>
          </div>
        </div>
      </main>
    </div>
  );
}
