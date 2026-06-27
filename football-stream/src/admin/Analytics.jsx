import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { supabase } from "../services/supabase";
import { clearViewerAnalytics, getViewerAnalytics } from "../utils/viewerAnalytics";

const MEDIA_BUCKET = "media";

function formatDate(value) {
  if (!value) return "—";

  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "—";
  }

  return dateValue.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLabel(value) {
  if (!value) return "Untitled";
  return value.length > 40 ? `${value.slice(0, 37)}...` : value;
}

function formatTimestamp(value) {
  if (!value) return "—";

  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "—";
  }

  return dateValue.toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalMatches: 0,
    liveMatches: 0,
    upcomingMatches: 0,
    totalLeagues: 0,
    totalBanners: 0,
    totalMediaItems: 0,
  });
  const [recentActivity, setRecentActivity] = useState({
    matches: [],
    banners: [],
    media: [],
  });
  const [viewerStats, setViewerStats] = useState({
    totalPageViews: 0,
    todayPageViews: 0,
    uniqueVisitors: 0,
    mostViewedPages: [],
    recentVisits: [],
  });

  useEffect(() => {
    let active = true;

    function syncViewerAnalytics() {
      const analyticsSnapshot = getViewerAnalytics();
      setViewerStats({
        totalPageViews: analyticsSnapshot.totalPageViews || 0,
        todayPageViews: analyticsSnapshot.todayPageViews || 0,
        uniqueVisitors: analyticsSnapshot.visitorId ? 1 : 0,
        mostViewedPages: analyticsSnapshot.mostViewedPages || [],
        recentVisits: analyticsSnapshot.recentVisits || [],
      });
    }

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        const [{ data: matchesData }, { data: bannersData }, { data: mediaData, error: mediaError }] = await Promise.all([
          supabase.from("matches").select("id,title,status,is_live,league,created_at,match_time").order("created_at", { ascending: false }),
          supabase.from("banners").select("id,title,created_at,updated_at,position,is_active").order("created_at", { ascending: false }),
          supabase.storage.from(MEDIA_BUCKET).list("", {
            limit: 100,
            sortBy: { column: "created_at", order: "desc" },
          }),
        ]);

        if (mediaError) {
          throw mediaError;
        }

        if (!active) return;

        const matches = matchesData || [];
        const banners = bannersData || [];
        const mediaItems = (mediaData || []).filter((item) => item.name);
        const liveMatches = matches.filter((match) => match.is_live || match.status === "LIVE").length;
        const leagues = new Set(matches.map((match) => match.league).filter(Boolean));

        setStats({
          totalMatches: matches.length,
          liveMatches,
          upcomingMatches: Math.max(0, matches.length - liveMatches),
          totalLeagues: leagues.size,
          totalBanners: banners.length,
          totalMediaItems: mediaItems.length,
        });

        setRecentActivity({
          matches: matches.slice(0, 3),
          banners: banners.slice(0, 3),
          media: mediaItems.slice(0, 3),
        });
      } catch (analyticsError) {
        if (!active) return;
        setError(analyticsError?.message || "Unable to load analytics right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();

    syncViewerAnalytics();

    window.addEventListener("viewer-analytics-updated", syncViewerAnalytics);
    window.addEventListener("viewer-analytics-cleared", syncViewerAnalytics);
    window.addEventListener("storage", syncViewerAnalytics);

    return () => {
      active = false;
      window.removeEventListener("viewer-analytics-updated", syncViewerAnalytics);
      window.removeEventListener("viewer-analytics-cleared", syncViewerAnalytics);
      window.removeEventListener("storage", syncViewerAnalytics);
    };
  }, []);

  const handleClearViewerAnalytics = () => {
    clearViewerAnalytics();
    setViewerStats({
      totalPageViews: 0,
      todayPageViews: 0,
      uniqueVisitors: 0,
      mostViewedPages: [],
      recentVisits: [],
    });
  };

  const summaryCards = [
    { label: "Total matches", value: stats.totalMatches, hint: "All saved fixtures" },
    { label: "Live matches", value: stats.liveMatches, hint: "Currently marked live" },
    { label: "Upcoming matches", value: stats.upcomingMatches, hint: "Scheduled or pending" },
    { label: "Total leagues", value: stats.totalLeagues, hint: "League coverage" },
    { label: "Total banners", value: stats.totalBanners, hint: "Active and archived" },
    { label: "Total media", value: stats.totalMediaItems, hint: "Uploaded files" },
  ];

  return (
    <div style={styles.shell}>
      <Sidebar />

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Admin</p>
            <h1 style={styles.title}>Analytics</h1>
            <p style={styles.subtext}>A quick snapshot of your football-stream content and activity.</p>
          </div>
        </header>

        {error ? <div style={styles.error}>{error}</div> : null}

        {loading ? <div style={styles.state}>Loading analytics…</div> : null}

        {!loading && !error ? (
          <>
            <section style={styles.cardsGrid}>
              {summaryCards.map((card) => (
                <article key={card.label} style={styles.card}>
                  <p style={styles.cardLabel}>{card.label}</p>
                  <h2 style={styles.cardValue}>{card.value}</h2>
                  <p style={styles.cardHint}>{card.hint}</p>
                </article>
              ))}
            </section>

            <section style={styles.contentGrid}>
              <article style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>Website viewer analytics</h2>
                  <p style={styles.panelHint}>Local-only public page-view tracking for development and testing.</p>
                </div>

                <div style={styles.viewerActions}>
                  <button type="button" onClick={handleClearViewerAnalytics} style={styles.clearButton}>
                    Clear viewer analytics
                  </button>
                </div>

                <div style={styles.cardsGrid}>
                  <article style={styles.card}>
                    <p style={styles.cardLabel}>Total page views</p>
                    <h2 style={styles.cardValue}>{viewerStats.totalPageViews}</h2>
                    <p style={styles.cardHint}>All tracked public visits</p>
                  </article>
                  <article style={styles.card}>
                    <p style={styles.cardLabel}>Today views</p>
                    <h2 style={styles.cardValue}>{viewerStats.todayPageViews}</h2>
                    <p style={styles.cardHint}>Visits captured today</p>
                  </article>
                  <article style={styles.card}>
                    <p style={styles.cardLabel}>Unique visitors</p>
                    <h2 style={styles.cardValue}>{viewerStats.uniqueVisitors}</h2>
                    <p style={styles.cardHint}>Tracked in this browser</p>
                  </article>
                  <article style={styles.card}>
                    <p style={styles.cardLabel}>Most viewed page</p>
                    <h2 style={styles.cardValue}>{viewerStats.mostViewedPages[0]?.path || "—"}</h2>
                    <p style={styles.cardHint}>{viewerStats.mostViewedPages[0] ? `${viewerStats.mostViewedPages[0].count} views` : "No public page views yet"}</p>
                  </article>
                </div>

                <div style={styles.viewerGrid}>
                  <div style={styles.viewerSection}>
                    <h3 style={styles.columnTitle}>Most viewed pages</h3>
                    {viewerStats.mostViewedPages.length ? (
                      <ul style={styles.list}>
                        {viewerStats.mostViewedPages.map((page) => (
                          <li key={page.path} style={styles.listItem}>
                            <span style={styles.listPath}>{page.path}</span>
                            <span style={styles.listCount}>{page.count} views</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={styles.emptyState}>No public page view data yet.</p>
                    )}
                  </div>

                  <div style={styles.viewerSection}>
                    <h3 style={styles.columnTitle}>Recent website visits</h3>
                    {viewerStats.recentVisits.length ? (
                      <div style={styles.tableWrap}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.tableHeader}>Page</th>
                              <th style={styles.tableHeader}>Device / browser</th>
                              <th style={styles.tableHeader}>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewerStats.recentVisits.map((visit, index) => (
                              <tr key={`${visit.path}-${visit.timestamp}-${index}`}>
                                <td style={styles.tableCell}>{visit.path}</td>
                                <td style={styles.tableCell}>{`${visit.device} / ${visit.browser}`}</td>
                                <td style={styles.tableCell}>{formatTimestamp(visit.timestamp)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={styles.emptyState}>No public visits recorded yet.</p>
                    )}
                  </div>
                </div>
              </article>

              <article style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>Recent activity</h2>
                  <p style={styles.panelHint}>Latest content updates at a glance.</p>
                </div>

                <div style={styles.activityColumns}>
                  <div style={styles.activityColumn}>
                    <h3 style={styles.columnTitle}>Matches</h3>
                    {recentActivity.matches.length ? (
                      recentActivity.matches.map((match) => (
                        <div key={match.id} style={styles.activityItem}>
                          <div>
                            <p style={styles.activityTitle}>{formatLabel(match.title || "Match")}</p>
                            <p style={styles.activityMeta}>{match.league || "Unassigned league"}</p>
                          </div>
                          <span style={styles.activityDate}>{formatDate(match.created_at || match.match_time)}</span>
                        </div>
                      ))
                    ) : (
                      <p style={styles.emptyState}>No matches found yet.</p>
                    )}
                  </div>

                  <div style={styles.activityColumn}>
                    <h3 style={styles.columnTitle}>Banners</h3>
                    {recentActivity.banners.length ? (
                      recentActivity.banners.map((banner) => (
                        <div key={banner.id} style={styles.activityItem}>
                          <div>
                            <p style={styles.activityTitle}>{formatLabel(banner.title || "Banner")}</p>
                            <p style={styles.activityMeta}>{banner.position || "Banner"}</p>
                          </div>
                          <span style={styles.activityDate}>{formatDate(banner.updated_at || banner.created_at)}</span>
                        </div>
                      ))
                    ) : (
                      <p style={styles.emptyState}>No banners found yet.</p>
                    )}
                  </div>

                  <div style={styles.activityColumn}>
                    <h3 style={styles.columnTitle}>Media</h3>
                    {recentActivity.media.length ? (
                      recentActivity.media.map((item) => (
                        <div key={item.id || item.name} style={styles.activityItem}>
                          <div>
                            <p style={styles.activityTitle}>{formatLabel(item.name || "Media file")}</p>
                            <p style={styles.activityMeta}>Uploaded to media library</p>
                          </div>
                          <span style={styles.activityDate}>{formatDate(item.created_at || item.updated_at)}</span>
                        </div>
                      ))
                    ) : (
                      <p style={styles.emptyState}>No media items found yet.</p>
                    )}
                  </div>
                </div>
              </article>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

const styles = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: "#020617",
    color: "#f8fafc",
    textAlign: "left",
  },
  main: {
    flex: 1,
    minWidth: 0,
    padding: "32px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  eyebrow: {
    margin: 0,
    color: "#38bdf8",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "4px 0 0",
    color: "#f8fafc",
    fontSize: "32px",
    fontWeight: 700,
  },
  subtext: {
    margin: "8px 0 0",
    color: "#94a3b8",
    lineHeight: 1.6,
  },
  state: {
    padding: "18px 20px",
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    color: "#cbd5e1",
  },
  error: {
    marginBottom: "18px",
    padding: "12px 14px",
    border: "1px solid rgba(248, 113, 113, 0.45)",
    borderRadius: "8px",
    background: "rgba(127, 29, 29, 0.35)",
    color: "#fecaca",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  card: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 18px 45px rgba(2, 6, 23, 0.24)",
  },
  cardLabel: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  cardValue: {
    margin: "10px 0 6px",
    fontSize: "28px",
    color: "#f8fafc",
  },
  cardHint: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: "14px",
  },
  contentGrid: {
    display: "grid",
    gap: "16px",
  },
  panel: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "16px",
    padding: "22px",
  },
  panelHeader: {
    marginBottom: "16px",
  },
  panelTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#f8fafc",
  },
  panelHint: {
    margin: "6px 0 0",
    color: "#94a3b8",
  },
  activityColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  activityColumn: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "16px",
  },
  columnTitle: {
    margin: "0 0 12px",
    fontSize: "16px",
    color: "#f8fafc",
  },
  activityItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
    padding: "10px 0",
    borderBottom: "1px solid #1e293b",
  },
  activityTitle: {
    margin: 0,
    color: "#f8fafc",
    fontWeight: 600,
  },
  activityMeta: {
    margin: "4px 0 0",
    color: "#94a3b8",
    fontSize: "13px",
  },
  activityDate: {
    color: "#38bdf8",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
  emptyState: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
  },
  viewerActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "16px",
  },
  clearButton: {
    border: "1px solid rgba(248, 113, 113, 0.4)",
    background: "rgba(127, 29, 29, 0.3)",
    color: "#fecaca",
    padding: "10px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
  },
  viewerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    marginTop: "16px",
  },
  viewerSection: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "16px",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gap: "10px",
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #1e293b",
  },
  listPath: {
    color: "#f8fafc",
    fontWeight: 600,
    wordBreak: "break-all",
  },
  listCount: {
    color: "#38bdf8",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    textAlign: "left",
    padding: "8px 0",
    color: "#94a3b8",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #1e293b",
  },
  tableCell: {
    padding: "10px 0",
    color: "#cbd5e1",
    borderBottom: "1px solid #1e293b",
    fontSize: "14px",
    verticalAlign: "top",
  },
};
