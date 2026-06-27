const CREDENTIALS_KEY = "footballstream_admin_credentials";
const SESSION_KEY = "footballstream_admin_session";
const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "admin123";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function getStorageSession() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function seedAdminCredentials() {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const existing = storage.getItem(CREDENTIALS_KEY);
  if (!existing) {
    storage.setItem(
      CREDENTIALS_KEY,
      JSON.stringify({ username: DEFAULT_USERNAME, password: DEFAULT_PASSWORD })
    );
  }
}

export function getAdminUsername() {
  seedAdminCredentials();
  const storage = getStorage();

  if (!storage) {
    return DEFAULT_USERNAME;
  }

  try {
    const parsed = JSON.parse(storage.getItem(CREDENTIALS_KEY) || "{}");
    return parsed?.username || DEFAULT_USERNAME;
  } catch {
    return DEFAULT_USERNAME;
  }
}

export function isAdminAuthenticated() {
  const sessionStorage = getStorageSession();
  return Boolean(sessionStorage?.getItem(SESSION_KEY));
}

export function loginAdmin(username, password) {
  seedAdminCredentials();
  const storage = getStorage();
  const sessionStorage = getStorageSession();

  if (!storage || !sessionStorage) {
    return false;
  }

  try {
    const parsed = JSON.parse(storage.getItem(CREDENTIALS_KEY) || "{}");
    const valid =
      username === parsed?.username &&
      password === parsed?.password;

    if (valid) {
      sessionStorage.setItem(SESSION_KEY, "true");
      return true;
    }
  } catch {
    // Fall through to invalid credentials.
  }

  return false;
}

export function logoutAdmin() {
  const sessionStorage = getStorageSession();
  sessionStorage?.removeItem(SESSION_KEY);
}

export function changeAdminPassword(currentPassword, newPassword) {
  seedAdminCredentials();
  const storage = getStorage();

  if (!storage) {
    return { success: false, message: "Storage is unavailable." };
  }

  try {
    const parsed = JSON.parse(storage.getItem(CREDENTIALS_KEY) || "{}");
    const currentStoredPassword = parsed?.password || DEFAULT_PASSWORD;

    if (currentPassword !== currentStoredPassword) {
      return { success: false, message: "Current password is incorrect." };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, message: "New password must be at least 4 characters." };
    }

    storage.setItem(
      CREDENTIALS_KEY,
      JSON.stringify({ username: parsed?.username || DEFAULT_USERNAME, password: newPassword })
    );

    return { success: true, message: "Password updated successfully." };
  } catch {
    return { success: false, message: "Unable to update password." };
  }
}
