import { useCallback, useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { supabase } from "../services/supabase";

export default function Home() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const [match, setMatch] = useState({
    title: "Loading...",
    stream_url: "",
    status: "OFFLINE",
  });

  const fetchMatch = useCallback(async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.log("Load match error:", error);
      return null;
    }

    return data;
  }, []);

  function applyMatch(data) {
    if (!data) return;

    setMatch(data);

    if (playerRef.current && data.stream_url) {
      const currentSrc = playerRef.current.currentSrc();

      if (currentSrc !== data.stream_url) {
        playerRef.current.src({
          src: data.stream_url,
          type: "application/x-mpegURL",
        });
        playerRef.current.load();
        playerRef.current.play().catch(() => {});
      }
    }
  }

  useEffect(() => {
    let active = true;

    fetchMatch().then((data) => {
      if (!active) return;
      applyMatch(data);
    });

    const channel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: "id=eq.1",
        },
        (payload) => {
          if (payload.new) {
            applyMatch(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchMatch]);

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

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [match.stream_url]);

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
        match.status === "LIVE"
          ? "rgba(16, 185, 129, 0.1)"
          : "rgba(239, 68, 68, 0.1)",
      color: match.status === "LIVE" ? "#34d399" : "#f87171",
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
          ● {match.status === "LIVE" ? "SERVER ONLINE" : "OFFLINE"}
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
