const STORAGE_KEY = "football-stream-viewer-analytics";
const VISITOR_ID_KEY = "football-stream-viewer-id";
const MAX_RECENT_VISITS = 12;

function getTodayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function getOrCreateVisitorId() {
  const storage = getStorage();
  if (!storage) return null;

  const storedId = storage.getItem(VISITOR_ID_KEY);
  if (storedId) {
    return storedId;
  }

  const visitorId = `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  storage.setItem(VISITOR_ID_KEY, visitorId);
  return visitorId;
}

function normalizePath(path) {
  if (!path) {
    return "/";
  }

  const sanitizedPath = `${path}`.trim();
  if (!sanitizedPath || sanitizedPath === "/") {
    return "/";
  }

  const [pathname] = sanitizedPath.split("?");
  const trimmedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return trimmedPath || "/";
}

function shouldTrackPath(path) {
  const normalizedPath = normalizePath(path);

  if (!normalizedPath) {
    return false;
  }

  if (normalizedPath === "/admin" || normalizedPath.startsWith("/admin") || normalizedPath === "/dashboard" || normalizedPath.startsWith("/dashboard")) {
    return false;
  }

  return true;
}

function getBrowserInfo(userAgent = "") {
  if (!userAgent) {
    return { device: "Unknown", browser: "Unknown" };
  }

  const lowered = userAgent.toLowerCase();
  let browser = "Unknown";
  let device = "Desktop";

  if (/(android)/i.test(userAgent)) {
    device = "Android";
  } else if (/(iphone|ipad|ipod)/i.test(userAgent)) {
    device = "iOS";
  } else if (/(mobile)/i.test(userAgent)) {
    device = "Mobile";
  }

  if (/(edg)/i.test(lowered)) {
    browser = "Edge";
  } else if (/(chrome|crios)/i.test(lowered)) {
    browser = "Chrome";
  } else if (/(firefox|fxios)/i.test(lowered)) {
    browser = "Firefox";
  } else if (/(safari)/i.test(lowered)) {
    browser = "Safari";
  } else if (/(opr|opera)/i.test(lowered)) {
    browser = "Opera";
  }

  return { device, browser };
}

function buildDefaultState(visitorId) {
  const todayKey = getTodayKey(new Date());
  return {
    visitorId,
    totalPageViews: 0,
    todayPageViews: 0,
    todayKey,
    mostViewedPages: [],
    recentVisits: [],
  };
}

function readViewerAnalytics() {
  const storage = getStorage();
  if (!storage) {
    return buildDefaultState(null);
  }

  const storedValue = storage.getItem(STORAGE_KEY);
  if (!storedValue) {
    return buildDefaultState(getOrCreateVisitorId());
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    const visitorId = parsedValue?.visitorId || getOrCreateVisitorId();
    return {
      ...buildDefaultState(visitorId),
      ...parsedValue,
      visitorId,
    };
  } catch {
    return buildDefaultState(getOrCreateVisitorId());
  }
}

function persistViewerAnalytics(analytics) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(analytics));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("viewer-analytics-updated", { detail: analytics }));
  }
}

export function recordViewerVisit(path) {
  if (typeof window === "undefined") {
    return null;
  }

  const normalizedPath = normalizePath(path || window.location.pathname + window.location.search);
  if (!shouldTrackPath(normalizedPath)) {
    return null;
  }

  const analytics = readViewerAnalytics();
  const now = new Date();
  const todayKey = getTodayKey(now);
  const isNewDay = analytics.todayKey !== todayKey;
  const pageViewsByPath = analytics.pageViewsByPath || {};
  const nextPathCount = (pageViewsByPath[normalizedPath] || 0) + 1;
  pageViewsByPath[normalizedPath] = nextPathCount;

  const mostViewedPages = Object.entries(pageViewsByPath)
    .sort(([leftPath, leftCount], [rightPath, rightCount]) => rightCount - leftCount || leftPath.localeCompare(rightPath))
    .slice(0, 5)
    .map(([pagePath, count]) => ({ path: pagePath, count }));

  const currentBrowser = getBrowserInfo(window.navigator?.userAgent || "");
  const recentVisits = [
    {
      path: normalizedPath,
      device: currentBrowser.device,
      browser: currentBrowser.browser,
      timestamp: now.toISOString(),
    },
    ...(analytics.recentVisits || []).slice(0, MAX_RECENT_VISITS - 1),
  ];

  const nextState = {
    ...analytics,
    visitorId: analytics.visitorId || getOrCreateVisitorId(),
    totalPageViews: analytics.totalPageViews + 1,
    todayPageViews: isNewDay ? 1 : analytics.todayPageViews + 1,
    todayKey,
    mostViewedPages,
    recentVisits,
    pageViewsByPath,
  };

  persistViewerAnalytics(nextState);
  return nextState;
}

export function getViewerAnalytics() {
  return readViewerAnalytics();
}

export function clearViewerAnalytics() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(STORAGE_KEY);
  storage.removeItem(VISITOR_ID_KEY);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("viewer-analytics-cleared"));
  }
}
