const SESSION_KEY = "footballstream_admin_session";
const PASSWORD_ATTEMPT_KEY = "footballstream_admin_password_attempts";
const PASSWORD_LOCKOUT_KEY = "footballstream_admin_password_lockout_until";
const TOTP_ATTEMPT_KEY = "footballstream_admin_totp_attempts";
const TOTP_LOCKOUT_KEY = "footballstream_admin_totp_lockout_until";
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
  const totpSecret = import.meta.env.VITE_ADMIN_TOTP_SECRET?.trim() || "";
  const missingKeys = [];

  if (!username) {
    missingKeys.push("VITE_ADMIN_USERNAME");
  }

  if (!password) {
    missingKeys.push("VITE_ADMIN_PASSWORD");
  }

  if (!totpSecret) {
    missingKeys.push("VITE_ADMIN_TOTP_SECRET");
  }

  return {
    username,
    password,
    totpSecret,
    configured: Boolean(username && password && totpSecret),
    missingKeys,
  };
}

function getAttemptState() {
  const sessionStorage = getStorageSession();

  if (!sessionStorage) {
    return {
      passwordAttempts: 0,
      passwordLockoutUntil: 0,
      totpAttempts: 0,
      totpLockoutUntil: 0,
    };
  }

  return {
    passwordAttempts: Number(sessionStorage.getItem(PASSWORD_ATTEMPT_KEY) || 0),
    passwordLockoutUntil: Number(sessionStorage.getItem(PASSWORD_LOCKOUT_KEY) || 0),
    totpAttempts: Number(sessionStorage.getItem(TOTP_ATTEMPT_KEY) || 0),
    totpLockoutUntil: Number(sessionStorage.getItem(TOTP_LOCKOUT_KEY) || 0),
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

  if (nextState.totpAttempts > 0) {
    sessionStorage.setItem(TOTP_ATTEMPT_KEY, String(nextState.totpAttempts));
  } else {
    sessionStorage.removeItem(TOTP_ATTEMPT_KEY);
  }

  if (nextState.totpLockoutUntil > 0) {
    sessionStorage.setItem(TOTP_LOCKOUT_KEY, String(nextState.totpLockoutUntil));
  } else {
    sessionStorage.removeItem(TOTP_LOCKOUT_KEY);
  }
}

function base32Decode(value) {
  const cleaned = `${value || ""}`.replace(/=+$/g, "").toUpperCase();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const lookup = new Map(alphabet.split("").map((char, index) => [char, index]));
  let bits = 0;
  let buffer = 0;
  const output = [];

  for (const char of cleaned) {
    const decoded = lookup.get(char);
    if (decoded === undefined) {
      continue;
    }

    buffer = (buffer << 5) | decoded;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >>> bits) & 255);
    }
  }

  return Uint8Array.from(output);
}

async function generateTotpCode(secret, timestamp = Date.now()) {
  const normalizedSecret = `${secret || ""}`.replace(/\s+/g, "").toUpperCase();
  const keyBytes = base32Decode(normalizedSecret);
  const counter = Math.floor(timestamp / 30000);
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setUint32(4, counter);

  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBuffer));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary = ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);

  return String(binary % 1000000).padStart(6, "0");
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

export async function loginAdmin(username, password, totpCode) {
  const sessionStorage = getStorageSession();

  if (!sessionStorage) {
    return { success: false, message: "This browser cannot start admin authentication." };
  }

  const { configured, username: expectedUsername, password: expectedPassword, totpSecret } = getEnvCredentials();
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

  if (attempts.totpLockoutUntil > now) {
    const remainingSeconds = Math.ceil((attempts.totpLockoutUntil - now) / 1000);
    return {
      success: false,
      message: `Too many failed TOTP codes. Please wait ${remainingSeconds} seconds and try again.`,
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

  const normalizedCode = `${totpCode || ""}`.replace(/\D/g, "").slice(0, 6);

  if (!/^[0-9]{6}$/.test(normalizedCode)) {
    return {
      success: false,
      message: "Enter the 6-digit code from your authenticator app.",
    };
  }

  const expectedCode = await generateTotpCode(totpSecret);

  if (normalizedCode !== expectedCode) {
    const nextTotpAttempts = attempts.totpAttempts + 1;
    const nextTotpLockoutUntil = nextTotpAttempts >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;

    setAttemptState({
      ...attempts,
      totpAttempts: nextTotpAttempts,
      totpLockoutUntil: nextTotpLockoutUntil,
    });

    if (nextTotpLockoutUntil > 0) {
      return {
        success: false,
        message: "Too many failed TOTP codes. Please wait 15 minutes and try again.",
      };
    }

    return {
      success: false,
      message: `Incorrect TOTP code. ${MAX_ATTEMPTS - nextTotpAttempts} attempts remaining.`,
    };
  }

  setAttemptState({
    passwordAttempts: 0,
    passwordLockoutUntil: 0,
    totpAttempts: 0,
    totpLockoutUntil: 0,
  });
  sessionStorage.setItem(SESSION_KEY, "true");

  return { success: true };
}

export function logoutAdmin() {
  const sessionStorage = getStorageSession();
  sessionStorage?.removeItem(SESSION_KEY);
  sessionStorage?.removeItem(PASSWORD_ATTEMPT_KEY);
  sessionStorage?.removeItem(PASSWORD_LOCKOUT_KEY);
  sessionStorage?.removeItem(TOTP_ATTEMPT_KEY);
  sessionStorage?.removeItem(TOTP_LOCKOUT_KEY);
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
