import { supabase } from "../services/supabase";

const unavailable = "Unable to verify admin access. Please sign in again.";
const signedOut = { stage: "signedOut", userId: null, factors: [], expiresAt: null };

// No legacy browser flag participates in this decision. The SDK owns session storage.
export async function checkAdminAccess() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(unavailable);
  const session = sessionData?.session;
  if (!session) return signedOut;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user || userData.user.id !== session.user.id) {
    throw new Error(unavailable);
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) throw new Error(unavailable);
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    throw new Error("This account cannot access the admin dashboard.");
  }

  const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || !["aal1", "aal2"].includes(assurance?.currentLevel)) {
    throw new Error(unavailable);
  }
  const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
  if (factorError) throw new Error(unavailable);

  // Recheck identity/session after the asynchronous calls (logout/account-switch races).
  const { data: latest, error: latestError } = await supabase.auth.getSession();
  if (latestError || !latest?.session || latest.session.user.id !== session.user.id ||
      latest.session.access_token !== session.access_token ||
      !latest.session.expires_at || latest.session.expires_at * 1000 <= Date.now()) {
    throw new Error(unavailable);
  }
  const factors = (factorData?.totp || []).filter((factor) => factor.status === "verified")
    .map((factor) => ({ id: factor.id }));
  return {
    stage: assurance.currentLevel === "aal2" && factors.length ? "ready" : factors.length ? "challenge" : "enroll",
    userId: userData.user.id,
    factors,
    expiresAt: latest.session.expires_at * 1000,
  };
}

export async function signInAdmin(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error("Unable to sign in. Check your email and password and try again.");
  return checkAdminAccess();
}

export async function enrollAdminTotp(userId) {
  const access = await checkAdminAccess();
  if (access.userId !== userId || access.stage !== "enroll") throw new Error(unavailable);

  // Remove only abandoned, unverified factors created by this local enrollment flow.
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) throw new Error("Unable to start authenticator setup. Please try again.");
  for (const factor of factors.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified" &&
        factor.friendly_name === "Football Admin") {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw new Error("Unable to restart authenticator setup. Please try again.");
    }
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Football Admin" });
  if (error || !data?.totp?.qr_code) throw new Error("Unable to start authenticator setup. Please try again.");
  // Keep only the Supabase-generated QR image in component memory. Never log the response.
  return { factorId: data.id, qr: data.totp.qr_code };
}

export async function verifyAdminTotp(userId, factorId, code) {
  if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code from your authenticator app.");
  const access = await checkAdminAccess();
  if (access.userId !== userId || !["enroll", "challenge"].includes(access.stage)) throw new Error(unavailable);
  // A fresh challenge for every submission avoids reusing expired challenges.
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw new Error("Unable to verify this code. Try a fresh code or sign in again.");
  const verified = await checkAdminAccess();
  if (verified.stage !== "ready" || verified.userId !== userId) throw new Error(unavailable);
  return verified;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Unable to finish signing out. Please try again.");
}
