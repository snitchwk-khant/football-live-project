import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import { checkAdminAccess } from "./adminAuth";

const initial = { loading: true, stage: "signedOut", userId: null, factors: [], expiresAt: null, error: "" };

export default function useAdminAccess() {
  const [access, setAccess] = useState(initial);
  const generation = useRef(0);
  const mounted = useRef(false);
  const invalidate = useCallback(() => { generation.current += 1; }, []);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    if (mounted.current) setAccess((current) => ({ ...current, loading: true, error: "" }));
    try {
      const next = await checkAdminAccess();
      if (mounted.current && request === generation.current) setAccess({ ...next, loading: false, error: "" });
    } catch {
      if (mounted.current && request === generation.current) {
        setAccess({ ...initial, loading: false, error: "Unable to confirm admin access. Please sign in again." });
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    let timer;
    // Never call async Supabase APIs inside its auth event callback (SDK lock).
    const schedule = () => {
      invalidate();
      setAccess((current) => ({ ...current, loading: true }));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { void refresh(); }, 0);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        invalidate();
        window.clearTimeout(timer);
        setAccess({ ...initial, loading: false });
      } else {
        schedule();
      }
    });
    timer = window.setTimeout(() => { void refresh(); }, 0);
    window.addEventListener("focus", schedule);
    return () => {
      mounted.current = false;
      invalidate();
      subscription.unsubscribe();
      window.clearTimeout(timer);
      window.removeEventListener("focus", schedule);
    };
  }, [refresh, invalidate]);

  useEffect(() => {
    if (!access.expiresAt) return;
    const timer = window.setTimeout(() => { void refresh(); }, Math.max(0, access.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [access.expiresAt, refresh]);

  return { ...access, refresh };
}
