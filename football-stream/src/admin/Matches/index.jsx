import { useCallback, useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "../../services/supabase";
import { sanitizePlainText, sanitizeStreamUrl, sanitizeImageUrl } from "../../utils/security";
import MatchForm from "./MatchForm";
import MatchList from "./MatchList";

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [editingMatch, setEditingMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchMatches = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    return data || [];
  }, []);

  const loadMatches = useCallback(async () => {
    try {
      const nextMatches = await fetchMatches();
      setMatches(nextMatches);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [fetchMatches]);

  useEffect(() => {
    let active = true;

    fetchMatches()
      .then((nextMatches) => {
        if (!active) return;
        setMatches(nextMatches);
        setError("");
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.message);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchMatches]);

  async function handleSave(formValues) {
    setSaving(true);
    setError("");

    const payload = {
      title: sanitizePlainText(`${formValues.home_team.trim()} vs ${formValues.away_team.trim()}`, { maxLength: 160 }),
      stream_url: sanitizeStreamUrl(formValues.stream_url),
      status: formValues.is_live ? "LIVE" : sanitizePlainText(formValues.status, { maxLength: 40 }),
      home_team: sanitizePlainText(formValues.home_team, { maxLength: 80 }),
      away_team: sanitizePlainText(formValues.away_team, { maxLength: 80 }),
      league: sanitizePlainText(formValues.league, { maxLength: 80 }) || null,
      poster: sanitizeImageUrl(formValues.poster) || null,
      match_time: formValues.match_time || null,
      is_live: Boolean(formValues.is_live),
    };

    if (payload.is_live) {
      const resetRequest = editingMatch
        ? supabase.from("matches").update({ is_live: false }).neq("id", editingMatch.id)
        : supabase.from("matches").update({ is_live: false }).eq("is_live", true);

      const { error: resetError } = await resetRequest;

      if (resetError) {
        setError(resetError.message);
        setSaving(false);
        return { ok: false, error: resetError.message };
      }
    }

    const request = editingMatch
      ? supabase.from("matches").update(payload).eq("id", editingMatch.id)
      : supabase.from("matches").insert(payload);

    const { error: saveError } = await request;

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return { ok: false, error: saveError.message };
    }

    setEditingMatch(null);
    await loadMatches();
    setSaving(false);
    return { ok: true };
  }

  async function handleDelete(matchId) {
    const confirmed = window.confirm("Delete this match?");
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (editingMatch?.id === matchId) {
      setEditingMatch(null);
    }

    await loadMatches();
  }

  async function handleGoLive(matchId) {
    setError("");

    const { error: resetError } = await supabase
      .from("matches")
      .update({ is_live: false })
      .neq("id", matchId);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    const { error: liveError } = await supabase
      .from("matches")
      .update({ is_live: true, status: "LIVE" })
      .eq("id", matchId);

    if (liveError) {
      setError(liveError.message);
      return;
    }

    await loadMatches();
  }

  function handleEdit(match) {
    setEditingMatch(match);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingMatch(null);
  }

  return (
    <div style={styles.shell}>
      <Sidebar />

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Admin</p>
            <h1 style={styles.title}>Match Management</h1>
          </div>

          <button type="button" onClick={loadMatches} style={styles.refreshButton}>
            Refresh
          </button>
        </header>

        <MatchForm
          key={editingMatch?.id || "new-match"}
          editingMatch={editingMatch}
          saving={saving}
          onSave={handleSave}
          onCancel={handleCancelEdit}
        />

        <MatchList
          matches={matches}
          loading={loading}
          error={error}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onGoLive={handleGoLive}
        />
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
    alignItems: "center",
    justifyContent: "space-between",
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
  refreshButton: {
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "#1e293b",
    color: "#f8fafc",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  error: {
    marginBottom: "18px",
    padding: "12px 14px",
    border: "1px solid rgba(248, 113, 113, 0.45)",
    borderRadius: "8px",
    background: "rgba(127, 29, 29, 0.35)",
    color: "#fecaca",
  },
};
