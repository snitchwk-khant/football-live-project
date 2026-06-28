import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { supabase } from "../services/supabase";
import { readSettings } from "../utils/settings";
import { formatMatchTime, getMatchPoster, getMatchTitle, hasPlayableStreamUrl, normalizeMatchStatus } from "../utils/matches";
import { sanitizeImageUrl } from "../utils/security";

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
  const [matchLoading, setMatchLoading] = useState(true);
  const [matchError, setMatchError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [banners, setBanners] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerError, setBannerError] = useState("");
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState("");
  const [publicMatches, setPublicMatches] = useState([]);
  const [publicMatchesLoading, setPublicMatchesLoading] = useState(true);
  const [publicMatchesError, setPublicMatchesError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("all");
  const [countdown, setCountdown] = useState(null);
  const [settings, setSettings] = useState(readSettings());
  const navigate = useNavigate();

  const fetchLiveMatch = useCallback(async () => {
    setMatchLoading(true);
    setMatchError("");

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("is_live", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setMatchError(error.message);
      setMatchLoading(false);
      return null;
    }

    setMatchLoading(false);
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
    applyMatch(data);
  }, [fetchLiveMatch]);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth <= 900);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  const fetchBanners = useCallback(async () => {
    setBannerLoading(true);
    setBannerError("");

    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      setBannerError(error.message);
      setBannerLoading(false);
      return;
    }

    setBanners(data || []);
    setBannerLoading(false);
  }, []);

  const fetchUpcomingMatches = useCallback(async () => {
    setUpcomingLoading(true);
    setUpcomingError("");

    let query = supabase
      .from("matches")
      .select("id,title,home_team,away_team,league,status,match_time,is_live")
      .eq("is_live", false)
      .order("match_time", { ascending: true });

    if (match.id) {
      query = query.neq("id", match.id);
    }

    const { data, error } = await query;

    if (error) {
      setUpcomingError(error.message);
      setUpcomingLoading(false);
      return;
    }

    const normalizedMatches = (data || [])
      .filter((item) => item && item.match_time)
      .filter((item) => new Date(item.match_time).getTime() > Date.now())
      .sort((a, b) => new Date(a.match_time) - new Date(b.match_time))
      .slice(0, 5);

    setUpcomingMatches(normalizedMatches);
    setUpcomingLoading(false);
  }, [match.id]);

  const fetchPublicMatches = useCallback(async () => {
    setPublicMatchesLoading(true);
    setPublicMatchesError("");

    const { data, error } = await supabase
      .from("matches")
      .select("id,title,home_team,away_team,league,status,match_time,is_live,poster,stream_url")
      .order("match_time", { ascending: true });

    if (error) {
      setPublicMatchesError(error.message);
      setPublicMatchesLoading(false);
      return;
    }

    const normalizedMatches = (data || []).filter((item) => item && item.id).slice(0, 6);
    setPublicMatches(normalizedMatches);
    setPublicMatchesLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) {
        void refreshLiveMatch();
        void fetchUpcomingMatches();
        void fetchPublicMatches();
      }
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
          refreshLiveMatch().then(() => {
            if (!active) return;
            void fetchUpcomingMatches();
            void fetchPublicMatches();
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          refreshLiveMatch();
          void fetchUpcomingMatches();
          void fetchPublicMatches();
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [refreshLiveMatch, fetchUpcomingMatches, fetchPublicMatches]);

  useEffect(() => {
    let active = true;

    const runBannerRefresh = () => {
      if (active) {
        void fetchBanners();
      }
    };

    Promise.resolve().then(runBannerRefresh);

    const channel = supabase.channel("public-banners-homepage");

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "banners",
      },
      () => {
        runBannerRefresh();
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "banners",
      },
      () => {
        runBannerRefresh();
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "banners",
      },
      () => {
        runBannerRefresh();
      }
    );

    const pollTimer = window.setInterval(() => {
      runBannerRefresh();
    }, 3000);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        runBannerRefresh();
      }
    });

    return () => {
      active = false;
      window.clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchBanners]);

  useEffect(() => {
    let retryTimeout = null;

    if (!hasPlayableStreamUrl(match.stream_url)) {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.dispose();
        playerRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.innerHTML = "";
      }
      return () => {
        if (retryTimeout) {
          window.clearTimeout(retryTimeout);
        }
      };
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
        retryTimeout = window.setTimeout(() => {
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

    return () => {
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [match.stream_url]);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setSettings(readSettings());
    };

    window.addEventListener("website-settings-updated", handleSettingsUpdate);

    if (settings.seoTitle) {
      document.title = settings.seoTitle;
    }

    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag && settings.seoDescription) {
      descriptionTag.setAttribute("content", settings.seoDescription);
    }

    return () => {
      window.removeEventListener("website-settings-updated", handleSettingsUpdate);
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [settings.seoDescription, settings.seoTitle]);

  useEffect(() => {
    if (!upcomingMatches.length) {
      const timer = window.setTimeout(() => setCountdown(null), 0);
      return () => window.clearTimeout(timer);
    }

    const nextMatch = upcomingMatches[0];
    if (!nextMatch?.match_time) {
      const timer = window.setTimeout(() => setCountdown(null), 0);
      return () => window.clearTimeout(timer);
    }

    const targetTime = new Date(nextMatch.match_time).getTime();

    const updateCountdown = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setCountdown({ days, hours, minutes, seconds });
    };

    const timer = window.setInterval(updateCountdown, 1000);
    updateCountdown();

    return () => window.clearInterval(timer);
  }, [upcomingMatches]);

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
  }, [match.stream_url]);

  const matchTime = match.match_time
    ? formatMatchTime(match.match_time)
    : "Not scheduled";

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMatches = upcomingMatches.filter((item) => {
    const haystack = [item.home_team, item.away_team, item.league]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
    const matchesLeague = selectedLeague === "all" || item.league === selectedLeague;

    return matchesQuery && matchesLeague;
  });

  const leagueOptions = Array.from(new Set(upcomingMatches.map((item) => item.league).filter(Boolean)));
  const nextKickoff = filteredMatches[0] || upcomingMatches[0] || null;
  const countdownLabel = countdown
    ? `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`
    : nextKickoff?.match_time
      ? "Kickoff time is now"
      : "No upcoming fixtures";

  const topBanner = banners.find((banner) => banner.position === "top");
  const bottomBanner = banners.find((banner) => banner.position === "bottom");
  const sideBanner = banners.find((banner) => banner.position === "side");
  const popupBanner = banners.find((banner) => banner.position === "popup");

  const getMatchAction = (item) => {
    const status = normalizeMatchStatus(item);
    const isPlayable = status === "live" || hasPlayableStreamUrl(item?.stream_url);

    return {
      label: isPlayable ? "Watch" : "View",
      to: isPlayable ? `/watch/${item.id}` : `/matches/${item.id}`,
    };
  };

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
    mainStack: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "20px",
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "20px",
    },
    videoBox: {
      backgroundColor: "#000000",
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid #1e293b",
      minHeight: "320px",
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
    bannerCard: {
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      border: "1px solid #1e293b",
      overflow: "hidden",
      marginBottom: "16px",
      boxShadow: "0 8px 24px rgba(2, 6, 23, 0.3)",
    },
    infoBox: {
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      padding: "20px",
      border: "1px solid #1e293b",
      height: "260px",
    },
    upcomingCard: {
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      border: "1px solid #1e293b",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      boxShadow: "0 8px 24px rgba(2, 6, 23, 0.3)",
    },
    upcomingHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap",
    },
    upcomingControls: {
      display: "flex",
      gap: "12px",
      flexWrap: "wrap",
      alignItems: "center",
    },
    controlInput: {
      backgroundColor: "#020617",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#f8fafc",
      padding: "10px 12px",
      minWidth: "180px",
      outline: "none",
    },
    controlSelect: {
      backgroundColor: "#020617",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#f8fafc",
      padding: "10px 12px",
      minWidth: "170px",
      outline: "none",
    },
    publicMatchesCard: {
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      border: "1px solid #1e293b",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      boxShadow: "0 8px 24px rgba(2, 6, 23, 0.3)",
      marginTop: "20px",
    },
    publicMatchesGrid: {
      display: "grid",
      gap: "12px",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      maxWidth: "100%",
      overflowX: "hidden",
    },
    publicMatchItem: {
      backgroundColor: "#111827",
      border: "1px solid #243447",
      borderRadius: "10px",
      padding: "14px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      cursor: "pointer",
    },
    publicMatchPoster: {
      width: "100%",
      height: "120px",
      objectFit: "cover",
      borderRadius: "8px",
      backgroundColor: "#020617",
      marginBottom: "4px",
    },
    publicActionButton: {
      border: 0,
      borderRadius: "8px",
      backgroundColor: "#10b981",
      color: "#052e16",
      padding: "8px 10px",
      fontWeight: 700,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    upcomingList: {
      display: "grid",
      gap: "12px",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      maxWidth: "100%",
      overflowX: "hidden",
    },
    upcomingItem: {
      backgroundColor: "#111827",
      border: "1px solid #243447",
      borderRadius: "10px",
      padding: "14px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    matchTitle: {
      margin: 0,
      fontSize: "16px",
      fontWeight: 700,
      color: "#f8fafc",
    },
    matchMeta: {
      margin: 0,
      color: "#94a3b8",
      fontSize: "13px",
    },
    countdownPill: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(16, 185, 129, 0.14)",
      color: "#34d399",
      borderRadius: "999px",
      padding: "6px 10px",
      fontSize: "12px",
      fontWeight: 700,
    },
    sideAd: {
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      padding: "20px",
      border: "1px solid #1e293b",
      height: "180px",
      textAlign: "center",
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
        <div>
          <h1 style={styles.logo}>{settings.siteName}</h1>
          <p style={{ margin: "4px 0 0", color: "#cbd5e1", fontSize: "14px" }}>{settings.heroSubtitle}</p>
        </div>
        <div style={styles.badge}>
          ● {match.is_live ? "LIVE NOW" : "NO LIVE MATCH"}
        </div>
      </header>

      <main style={isMobile ? styles.mainStack : styles.main}>
        <div>
          {bannerLoading ? (
            <div style={styles.bannerState}>Loading banners...</div>
          ) : null}
          {bannerError ? <div style={styles.bannerState}><span style={styles.bannerError}>{bannerError}</span></div> : null}
          {matchLoading ? (
            <div style={styles.bannerState}>Loading live match...</div>
          ) : null}
          {matchError ? (
            <div style={styles.bannerState}><span style={styles.bannerError}>{matchError}</span></div>
          ) : null}

          {topBanner ? (
            <div style={styles.bannerCard}>
              {topBanner.image_url ? <img src={sanitizeImageUrl(topBanner.image_url)} alt={topBanner.title} style={styles.bannerImage} /> : null}
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
              {bottomBanner.image_url ? <img src={sanitizeImageUrl(bottomBanner.image_url)} alt={bottomBanner.title} style={styles.bannerImage} /> : null}
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

          <div style={styles.upcomingCard}>
            <div style={styles.upcomingHeader}>
              <div>
                <p style={styles.bannerLabel}>Upcoming Matches</p>
                <h3 style={styles.bannerTitle}>Next kickoffs</h3>
              </div>
              <div style={styles.countdownPill}>{countdownLabel}</div>
            </div>
            <div style={styles.upcomingControls}>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search teams or league"
                style={styles.controlInput}
                aria-label="Search upcoming matches"
              />
              <select
                value={selectedLeague}
                onChange={(event) => setSelectedLeague(event.target.value)}
                style={styles.controlSelect}
                aria-label="Filter by league"
              >
                <option value="all">All Leagues</option>
                {leagueOptions.map((league) => (
                  <option key={league} value={league}>
                    {league}
                  </option>
                ))}
              </select>
            </div>
            {upcomingLoading ? (
              <p style={styles.matchMeta}>Loading upcoming matches…</p>
            ) : upcomingError ? (
              <p style={styles.bannerError}>{upcomingError}</p>
            ) : filteredMatches.length > 0 ? (
              <div style={styles.upcomingList}>
                {filteredMatches.map((item) => (
                  <div key={item.id} style={styles.upcomingItem}>
                    <p style={styles.matchTitle}>{item.title || `${item.home_team || "Home"} vs ${item.away_team || "Away"}`}</p>
                    <p style={styles.matchMeta}>{item.home_team || "Home team"} vs {item.away_team || "Away team"}</p>
                    <p style={styles.matchMeta}>{item.league || "League not set"}</p>
                    <p style={styles.matchMeta}>{new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.match_time))}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.matchMeta}>No upcoming matches match the current search.</p>
            )}
          </div>

          <div style={styles.publicMatchesCard}>
            <div style={styles.upcomingHeader}>
              <div>
                <p style={styles.bannerLabel}>Public Match List</p>
                <h3 style={styles.bannerTitle}>Featured fixtures</h3>
              </div>
              <Link to="/matches" style={styles.publicActionButton}>
                View all matches
              </Link>
            </div>
            {publicMatchesLoading ? (
              <p style={styles.matchMeta}>Loading featured matches…</p>
            ) : publicMatchesError ? (
              <p style={styles.bannerError}>{publicMatchesError}</p>
            ) : publicMatches.length > 0 ? (
              <div style={styles.publicMatchesGrid}>
                {publicMatches.map((item) => {
                  const status = normalizeMatchStatus(item);
                  const poster = getMatchPoster(item);
                  const action = getMatchAction(item);
                  return (
                    <div key={item.id} style={styles.publicMatchItem} onClick={() => navigate(action.to)} onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(action.to);
                      }
                    }} tabIndex={0} role="button">
                      {poster ? <img src={sanitizeImageUrl(poster)} alt={getMatchTitle(item)} style={styles.publicMatchPoster} /> : null}
                      <p style={styles.matchTitle}>{getMatchTitle(item)}</p>
                      <p style={styles.matchMeta}>{item.home_team || "Home team"} vs {item.away_team || "Away team"}</p>
                      <p style={styles.matchMeta}>{item.league || "League not set"}</p>
                      <p style={styles.matchMeta}>{formatMatchTime(item.match_time)}</p>
                      <p style={{ ...styles.matchMeta, fontWeight: 700, color: status === "live" ? "#34d399" : status === "ended" ? "#f87171" : "#38bdf8" }}>
                        {status === "live" ? "Live" : status === "ended" ? "Ended" : "Upcoming"}
                      </p>
                      <Link to={action.to} style={styles.publicActionButton}>
                        {action.label}
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={styles.matchMeta}>No public matches have been added yet.</p>
            )}
          </div>

          <div style={styles.adBox}>
            <p>Sponsored Advertisement</p>
            <h2>{settings.heroTitle}</h2>
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
              {sideBanner.image_url ? <img src={sanitizeImageUrl(sideBanner.image_url)} alt={sideBanner.title} style={styles.bannerImage} /> : null}
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
            <p>CONTACT</p>
            <span>{settings.contactTelegram}</span>
            <br />
            <span>{settings.contactPhone}</span>
          </div>
        </div>
      </main>
      <footer
        style={{
          padding: "24px 20px 40px",
          textAlign: "center",
          color: "#94a3b8",
          backgroundColor: "#020617",
          borderTop: "1px solid #1e293b",
          marginTop: "24px",
        }}
      >
        <p style={{ margin: 0 }}>{settings.footerText}</p>
        <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>
          {settings.contactTelegram} • {settings.contactViber} • {settings.contactPhone}
        </p>
      </footer>
    </div>
  );
}
