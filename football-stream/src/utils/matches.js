export function hasPlayableStreamUrl(url) {
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
}

export function normalizeMatchStatus(match) {
  const normalizedStatus = `${match?.status || ""}`.toUpperCase();

  if (match?.is_live || normalizedStatus.includes("LIVE")) {
    return "live";
  }

  if (normalizedStatus.includes("ENDED") || normalizedStatus.includes("FINISH") || normalizedStatus.includes("COMPLETE")) {
    return "ended";
  }

  if (match?.match_time) {
    const timestamp = new Date(match.match_time).getTime();
    if (!Number.isNaN(timestamp) && timestamp <= Date.now()) {
      return "ended";
    }
  }

  return "upcoming";
}

export function formatMatchTime(value) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getMatchTitle(match) {
  if (match?.title) {
    return match.title;
  }

  return `${match?.home_team || "Home"} vs ${match?.away_team || "Away"}`;
}

export function getMatchPoster(match) {
  return match?.poster || match?.image_url || match?.thumbnail || "";
}

export function sortMatchesForPublic(matches = []) {
  return [...matches].sort((left, right) => {
    const leftStatus = normalizeMatchStatus(left);
    const rightStatus = normalizeMatchStatus(right);
    const statusOrder = { live: 0, upcoming: 1, ended: 2 };

    if (statusOrder[leftStatus] !== statusOrder[rightStatus]) {
      return statusOrder[leftStatus] - statusOrder[rightStatus];
    }

    if (left?.match_time && right?.match_time) {
      return new Date(left.match_time) - new Date(right.match_time);
    }

    return 0;
  });
}
