import { sanitizePlainText } from "./security";

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
    siteName: sanitizePlainText(nextSettings?.siteName, { maxLength: 80 }) || DEFAULT_SETTINGS.siteName,
    heroTitle: sanitizePlainText(nextSettings?.heroTitle, { maxLength: 120 }) || DEFAULT_SETTINGS.heroTitle,
    heroSubtitle: sanitizePlainText(nextSettings?.heroSubtitle, { maxLength: 240 }) || DEFAULT_SETTINGS.heroSubtitle,
    contactTelegram: sanitizePlainText(nextSettings?.contactTelegram, { maxLength: 80 }) || DEFAULT_SETTINGS.contactTelegram,
    contactViber: sanitizePlainText(nextSettings?.contactViber, { maxLength: 80 }) || DEFAULT_SETTINGS.contactViber,
    contactPhone: sanitizePlainText(nextSettings?.contactPhone, { maxLength: 80 }) || DEFAULT_SETTINGS.contactPhone,
    footerText: sanitizePlainText(nextSettings?.footerText, { maxLength: 240 }) || DEFAULT_SETTINGS.footerText,
    seoTitle: sanitizePlainText(nextSettings?.seoTitle, { maxLength: 120 }) || DEFAULT_SETTINGS.seoTitle,
    seoDescription: sanitizePlainText(nextSettings?.seoDescription, { maxLength: 260 }) || DEFAULT_SETTINGS.seoDescription,
  };

  if (typeof window !== "undefined") {
    const persisted = {
      ...sanitized,
    };

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(persisted));
    window.dispatchEvent(new Event("website-settings-updated"));
  }

  return sanitized;
}
