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
  const [banners, setBanners] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerError, setBannerError] = useState("");
  const [popupDismissed, setPopupDismissed] = useState(false);

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

  const fetchBanners = useCallback(async () => {
    setBannerLoading(true);
    setBannerError("");

    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Load banners error:", error);
      setBannerError(error.message);
      setBannerLoading(false);
      return;
    }

    setBanners(data || []);
    setBannerLoading(false);
  }, []);

  const hasPlayableStreamUrl = useCallback((url) => {
    if (!url || typeof url !== "string") {
      return false;
    }

    const normalizedUrl = url.trim();
    if (!normalizedUrl || normalizedUrl.includes("<") || normalizedUrl.includes(">")) {
      return false;
    }

    if (normalizedUrl.includes("video-id") || normalizedUrl.includes("<video-id>")) {
      return false;
    }

    try {
      const parsedUrl = new URL(normalizedUrl);
      return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
    } catch {
      return false;
    }
  }, []);

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
    let active = true;

    const runBannerRefresh = () => {
      if (active) {
        void fetchBanners();
      }
    };

    Promise.resolve().then(runBannerRefresh);

    const channel = supabase
      .channel("public-banners-homepage")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "banners",
        },
        () => {
          runBannerRefresh();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Banners realtime connected");
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchBanners]);

  useEffect(() => {
    if (!hasPlayableStreamUrl(match.stream_url)) {
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
          if (match.stream_url && hasPlayableStreamUrl(match.stream_url)) {
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
  }, [hasPlayableStreamUrl, match.stream_url]);

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

    if (!match.stream_url || !hasPlayableStreamUrl(match.stream_url)) {
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
  }, [hasPlayableStreamUrl, match.stream_url]);

  const matchTime = match.match_time
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(match.match_time))
    : "Not scheduled";

  const topBanner = banners.find((banner) => banner.position === "top");
  const bottomBanner = banners.find((banner) => banner.position === "bottom");
  const sideBanner = banners.find((banner) => banner.position === "side");
  const popupBanner = banners.find((banner) => banner.position === "popup");

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
    videoPlaceholder: {
      minHeight: "320px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      textAlign: "center",
      backgroundColor: "#020617",
      color: "#94a3b8",
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
    bannerCard: {
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      border: "1px solid #1e293b",
      overflow: "hidden",
      marginBottom: "16px",
      boxShadow: "0 8px 24px rgba(2, 6, 23, 0.3)",
    },
    bannerImage: {
      display: "block",
      width: "100%",
      maxHeight: "220px",
      objectFit: "cover",
      backgroundColor: "#111827",
    },
    bannerBody: {
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    bannerLabel: {
      margin: 0,
      color: "#38bdf8",
      fontSize: "12px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    bannerTitle: {
      margin: 0,
      color: "#f8fafc",
      fontSize: "18px",
      fontWeight: 700,
    },
    bannerText: {
      margin: 0,
      color: "#cbd5e1",
      fontSize: "14px",
      lineHeight: 1.5,
    },
    bannerLink: {
      color: "#34d399",
      fontSize: "13px",
      fontWeight: 600,
      textDecoration: "none",
    },
    bannerState: {
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      border: "1px solid #1e293b",
      borderRadius: "12px",
      padding: "14px 16px",
      marginBottom: "16px",
      color: "#cbd5e1",
    },
    bannerError: {
      color: "#fca5a5",
    },
    popupOverlay: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(2, 6, 23, 0.78)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      zIndex: 1000,
    },
    popupCard: {
      width: "min(480px, 100%)",
      backgroundColor: "#111827",
      borderRadius: "16px",
      border: "1px solid #334155",
      overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.45)",
      position: "relative",
    },
    popupImage: {
      display: "block",
      width: "100%",
      maxHeight: "280px",
      objectFit: "cover",
      backgroundColor: "#020617",
    },
    popupBody: {
      padding: "18px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },
    popupButton: {
      position: "absolute",
      top: "12px",
      right: "12px",
      border: 0,
      borderRadius: "999px",
      width: "36px",
      height: "36px",
      cursor: "pointer",
      backgroundColor: "rgba(2, 6, 23, 0.84)",
      color: "#f8fafc",
      fontSize: "18px",
    },
  };

  return (
    <div style={styles.container}>
      {popupBanner && !popupDismissed ? (
        <div style={styles.popupOverlay}>
          <div style={styles.popupCard}>
            <button
              type="button"
              style={styles.popupButton}
              onClick={() => setPopupDismissed(true)}
              aria-label="Close popup banner"
            >
              ×
            </button>
            {popupBanner.image_url ? (
              <img src={popupBanner.image_url} alt={popupBanner.title} style={styles.popupImage} />
            ) : null}
            <div style={styles.popupBody}>
              <p style={styles.bannerLabel}>Popup</p>
              <h3 style={styles.bannerTitle}>{popupBanner.title}</h3>
              {popupBanner.description ? <p style={styles.bannerText}>{popupBanner.description}</p> : null}
              {popupBanner.link_url ? (
                <a href={popupBanner.link_url} target="_blank" rel="noreferrer" style={styles.bannerLink}>
                  Learn more
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <header style={styles.header}>
        <h1 style={styles.logo}>LIVE FOOTBALL</h1>
        <div style={styles.badge}>
          ● {match.is_live ? "LIVE NOW" : "NO LIVE MATCH"}
        </div>
      </header>

      <main style={styles.main}>
        <div>
          {bannerLoading ? (
            <div style={styles.bannerState}>Loading banners...</div>
          ) : null}
          {bannerError ? <div style={styles.bannerState}><span style={styles.bannerError}>{bannerError}</span></div> : null}

          {topBanner ? (
            <div style={styles.bannerCard}>
              {topBanner.image_url ? <img src={topBanner.image_url} alt={topBanner.title} style={styles.bannerImage} /> : null}
              <div style={styles.bannerBody}>
                <p style={styles.bannerLabel}>Top Banner</p>
                <h3 style={styles.bannerTitle}>{topBanner.title}</h3>
                {topBanner.description ? <p style={styles.bannerText}>{topBanner.description}</p> : null}
                {topBanner.link_url ? (
                  <a href={topBanner.link_url} target="_blank" rel="noreferrer" style={styles.bannerLink}>
                    Visit link
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {hasPlayableStreamUrl(match.stream_url) ? (
            <div style={styles.videoBox}>
              <div ref={videoRef} />
            </div>
          ) : (
            <div style={styles.videoBox}>
              <div style={styles.videoPlaceholder}>The live stream is currently unavailable. Please check back soon.</div>
            </div>
          )}

          {bottomBanner ? (
            <div style={styles.bannerCard}>
              {bottomBanner.image_url ? <img src={bottomBanner.image_url} alt={bottomBanner.title} style={styles.bannerImage} /> : null}
              <div style={styles.bannerBody}>
                <p style={styles.bannerLabel}>Bottom Banner</p>
                <h3 style={styles.bannerTitle}>{bottomBanner.title}</h3>
                {bottomBanner.description ? <p style={styles.bannerText}>{bottomBanner.description}</p> : null}
                {bottomBanner.link_url ? (
                  <a href={bottomBanner.link_url} target="_blank" rel="noreferrer" style={styles.bannerLink}>
                    Visit link
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

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

          {sideBanner ? (
            <div style={styles.bannerCard}>
              {sideBanner.image_url ? <img src={sideBanner.image_url} alt={sideBanner.title} style={styles.bannerImage} /> : null}
              <div style={styles.bannerBody}>
                <p style={styles.bannerLabel}>Side Banner</p>
                <h3 style={styles.bannerTitle}>{sideBanner.title}</h3>
                {sideBanner.description ? <p style={styles.bannerText}>{sideBanner.description}</p> : null}
                {sideBanner.link_url ? (
                  <a href={sideBanner.link_url} target="_blank" rel="noreferrer" style={styles.bannerLink}>
                    Visit link
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          <div style={styles.sideAd}>
            <p>ADVERTISEMENT</p>
            <span>Side Banner Ads</span>
          </div>
        </div>
      </main>
    </div>
  );
}
