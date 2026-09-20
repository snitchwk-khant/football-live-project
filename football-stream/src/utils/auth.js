const SESSION_KEY = "footballstream_admin_session";
const PASSWORD_ATTEMPT_KEY = "footballstream_admin_password_attempts";
const PASSWORD_LOCKOUT_KEY = "footballstream_admin_password_lockout_until";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getStorageSession() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function getEnvCredentials() {
  const username = import.meta.env.VITE_ADMIN_USERNAME?.trim() || "";
  const password = import.meta.env.VITE_ADMIN_PASSWORD?.trim() || "";
  const missingKeys = [];

  if (!username) {
    missingKeys.push("VITE_ADMIN_USERNAME");
  }

  if (!password) {
    missingKeys.push("VITE_ADMIN_PASSWORD");
  }

  return {
    username,
    password,
    configured: Boolean(username && password),
    missingKeys,
  };
}

function getAttemptState() {
  const sessionStorage = getStorageSession();

  if (!sessionStorage) {
    return {
      passwordAttempts: 0,
      passwordLockoutUntil: 0,
    };
  }

  return {
    passwordAttempts: Number(sessionStorage.getItem(PASSWORD_ATTEMPT_KEY) || 0),
    passwordLockoutUntil: Number(sessionStorage.getItem(PASSWORD_LOCKOUT_KEY) || 0),
  };
}

function setAttemptState(nextState) {
  const sessionStorage = getStorageSession();

  if (!sessionStorage) {
    return;
  }

  if (nextState.passwordAttempts > 0) {
    sessionStorage.setItem(PASSWORD_ATTEMPT_KEY, String(nextState.passwordAttempts));
  } else {
    sessionStorage.removeItem(PASSWORD_ATTEMPT_KEY);
  }

  if (nextState.passwordLockoutUntil > 0) {
    sessionStorage.setItem(PASSWORD_LOCKOUT_KEY, String(nextState.passwordLockoutUntil));
  } else {
    sessionStorage.removeItem(PASSWORD_LOCKOUT_KEY);
  }

}

export async function getAdminEnvDiagnostics() {
  async function describe(value) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value ?? ""),
    );
    return {
      exists: value !== undefined,
      length: (value ?? "").length,
      fingerprint: Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 8),
    };
  }

  return {
    VITE_ADMIN_USERNAME: await describe(import.meta.env.VITE_ADMIN_USERNAME),
    VITE_ADMIN_PASSWORD: await describe(import.meta.env.VITE_ADMIN_PASSWORD),
  };
}

export function getAdminSetupMessage() {
  const { configured, missingKeys } = getEnvCredentials();

  if (configured) {
    return "";
  }

  return `Admin authentication is not configured. Add ${missingKeys.join(" and ")} to .env.local and restart the app.`;
}

export function getAdminUsername() {
  return getEnvCredentials().username || "admin";
}

export function isAdminAuthenticated() {
  const sessionStorage = getStorageSession();
  return Boolean(sessionStorage?.getItem(SESSION_KEY));
}

export async function loginAdmin(username, password) {
  const sessionStorage = getStorageSession();

  if (!sessionStorage) {
    return { success: false, message: "This browser cannot start admin authentication." };
  }

  const { configured, username: expectedUsername, password: expectedPassword } = getEnvCredentials();
  if (!configured) {
    return { success: false, message: getAdminSetupMessage() };
  }

  const attempts = getAttemptState();
  const now = Date.now();

  if (attempts.passwordLockoutUntil > now) {
    const remainingSeconds = Math.ceil((attempts.passwordLockoutUntil - now) / 1000);
    return {
      success: false,
      message: `Too many failed passwords. Please wait ${remainingSeconds} seconds and try again.`,
    };
  }

  const normalizedUsername = `${username || ""}`.trim();
  const normalizedPassword = `${password || ""}`;
  const valid = normalizedUsername === expectedUsername && normalizedPassword === expectedPassword;

  if (!valid) {
    const nextPasswordAttempts = attempts.passwordAttempts + 1;
    const nextPasswordLockoutUntil = nextPasswordAttempts >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;

    setAttemptState({
      ...attempts,
      passwordAttempts: nextPasswordAttempts,
      passwordLockoutUntil: nextPasswordLockoutUntil,
    });

    if (nextPasswordLockoutUntil > 0) {
      return {
        success: false,
        message: "Too many failed passwords. Please wait 15 minutes and try again.",
      };
    }

    return {
      success: false,
      message: `Invalid username or password. ${MAX_ATTEMPTS - nextPasswordAttempts} attempts remaining.`,
    };
  }

  setAttemptState({
    passwordAttempts: 0,
    passwordLockoutUntil: 0,
  });
  sessionStorage.setItem(SESSION_KEY, "true");

  return { success: true };
}

export function logoutAdmin() {
  const sessionStorage = getStorageSession();
  sessionStorage?.removeItem(SESSION_KEY);
  sessionStorage?.removeItem(PASSWORD_ATTEMPT_KEY);
  sessionStorage?.removeItem(PASSWORD_LOCKOUT_KEY);
}

export function changeAdminPassword(currentPassword, newPassword) {
  const { configured } = getEnvCredentials();

  if (!configured) {
    return {
      success: false,
      message: "Admin credentials are configured through environment variables. Update VITE_ADMIN_PASSWORD in .env.local and restart the app to change them.",
    };
  }

  const trimmedCurrentPassword = `${currentPassword || ""}`;
  const trimmedNewPassword = `${newPassword || ""}`.trim();

  if (trimmedCurrentPassword !== getEnvCredentials().password) {
    return { success: false, message: "Current password is incorrect." };
  }

  if (!trimmedNewPassword || trimmedNewPassword.length < 8) {
    return { success: false, message: "New password must be at least 8 characters." };
  }

  if (trimmedNewPassword.length > 128) {
    return { success: false, message: "New password is too long." };
  }

  return {
    success: false,
    message: "Password changes are managed via environment variables. Update VITE_ADMIN_PASSWORD in .env.local and restart the app.",
  };
}
