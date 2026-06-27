export const SETTINGS_STORAGE_KEY = "football-stream-settings";

export const DEFAULT_SETTINGS = {
  siteName: "LIVE FOOTBALL",
  heroTitle: "Watch live football anywhere",
  heroSubtitle:
    "Follow the action, discover upcoming matches, and stay connected with the latest football stream updates.",
  contactTelegram: "@footballstream",
  contactViber: "+95 900 000 000",
  contactPhone: "+95 900 000 000",
  footerText: "© 2026 Football Stream. All rights reserved.",
  seoTitle: "Football Stream | Live Matches & Updates",
  seoDescription: "A modern football streaming hub for live matches, upcoming fixtures, and match updates.",
};

export function readSettings() {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(rawValue);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(nextSettings) {
  const sanitized = {
    ...DEFAULT_SETTINGS,
    ...nextSettings,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new Event("website-settings-updated"));
  }

  return sanitized;
}
