import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import { supabase } from "../services/supabase";

const EMPTY_FORM = {
  name: "",
  url: "",
  priority: 100,
  is_active: false,
  status: "OFFLINE",
};

const STATUS_OPTIONS = ["ONLINE", "OFFLINE", "MAINTENANCE"];

export default function Streams() {
  const [streams, setStreams] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStreams = useCallback(async () => {
    setError("");
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from("streams")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setStreams(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    const fetchStreams = async () => {
      setError("");
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("streams")
        .select("*")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });

      if (!active) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setStreams(data || []);
      setLoading(false);
    };

    fetchStreams();

    return () => {
      active = false;
    };
  }, [loadStreams]);

  const sortedStreams = useMemo(() => {
    return [...streams].sort((left, right) => {
      if (left.is_active !== right.is_active) {
        return left.is_active ? -1 : 1;
      }

      const leftPriority = Number(left.priority ?? 100);
      const rightPriority = Number(right.priority ?? 100);

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(right.created_at || 0) - new Date(left.created_at || 0);
    });
  }, [streams]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function validateStream(values) {
    if (!values.name.trim()) {
      return "Stream name is required.";
    }

    if (!values.url.trim()) {
      return "Stream URL is required.";
    }

    try {
      const parsedUrl = new URL(values.url.trim());
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return "Stream URL must use http or https.";
      }
    } catch {
      return "Stream URL must be a valid URL.";
    }

    const normalizedUrl = values.url.trim().toLowerCase();
    if (normalizedUrl.endsWith(".m3u8")) {
      try {
        const parsedUrl = new URL(values.url.trim());
        if (!parsedUrl.pathname.toLowerCase().endsWith(".m3u8")) {
          return "HLS streams must end with .m3u8.";
        }
      } catch {
        return "HLS stream URL must be a valid URL.";
      }
    }

    return "";
  }

  function createPayload(values) {
    return {
      name: values.name.trim(),
      url: values.url.trim(),
      priority: Number(values.priority) || 100,
      is_active: Boolean(values.is_active),
      status: values.is_active ? "ONLINE" : values.status || "OFFLINE",
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateStream(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const payload = createPayload(form);
    const request = editingId
      ? supabase.from("streams").update(payload).eq("id", editingId).select()
      : supabase.from("streams").insert(payload).select();

    const { data, error: saveError } = await request;
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    const savedStreamId = editingId ?? data?.[0]?.id;
    if (payload.is_active && savedStreamId) {
      const { error: resetError } = await supabase
        .from("streams")
        .update({ is_active: false, status: "OFFLINE" })
        .neq("id", savedStreamId);

      if (resetError) {
        setError(resetError.message);
        return;
      }
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    setSuccess(editingId ? "Stream updated successfully." : "Stream created successfully.");
    await loadStreams();
  }

  function handleEdit(stream) {
    setEditingId(stream.id);
    setError("");
    setSuccess("");
    setForm({
      name: stream.name || "",
      url: stream.url || "",
      priority: stream.priority ?? 100,
      is_active: Boolean(stream.is_active),
      status: stream.status || "OFFLINE",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this stream?");
    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase.from("streams").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (editingId === id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }

    setSuccess("Stream deleted successfully.");
    await loadStreams();
  }

  async function handleSetPrimary(stream) {
    setError("");
    setSuccess("");

    const { error: resetError } = await supabase
      .from("streams")
      .update({ is_active: false, status: "OFFLINE" })
      .neq("id", stream.id);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    const { error: activateError } = await supabase
      .from("streams")
      .update({ is_active: true, status: "ONLINE" })
      .eq("id", stream.id);

    if (activateError) {
      setError(activateError.message);
      return;
    }

    setSuccess(`${stream.name} is now the primary stream.`);
    await loadStreams();
  }

  function handlePreview(stream) {
    if (!stream?.url) {
      setError("No preview URL is available.");
      return;
    }

    try {
      new URL(stream.url);
    } catch {
      setError("The stream URL is invalid.");
      return;
    }

    window.open(stream.url, "_blank", "noopener,noreferrer");
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  return (
    <div style={styles.shell}>
      <Sidebar />

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Admin</p>
            <h1 style={styles.title}>Stream Manager</h1>
          </div>

          <button type="button" onClick={loadStreams} style={styles.refreshButton}>
            Refresh
          </button>
        </header>

        {error ? <div style={styles.error}>{error}</div> : null}
        {success ? <div style={styles.success}>{success}</div> : null}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>{editingId ? "Edit Stream" : "Add Stream"}</h2>
            {editingId ? (
              <button type="button" onClick={handleReset} style={styles.secondaryButton}>
                Cancel
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.grid}>
              <label style={styles.field}>
                <span style={styles.label}>Stream name</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Primary Stream"
                  required
                />
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Stream URL</span>
                <input
                  name="url"
                  value={form.url}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="https://example.com/stream.m3u8"
                  required
                />
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Priority</span>
                <input
                  name="priority"
                  type="number"
                  min="0"
                  value={form.priority}
                  onChange={handleChange}
                  style={styles.input}
                />
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Status</span>
                <select name="status" value={form.status} onChange={handleChange} style={styles.select}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={styles.checkboxRow}>
              <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange} />
              <span>Set as primary stream</span>
            </label>

            <div style={styles.actions}>
              <button type="submit" disabled={saving} style={styles.primaryButton}>
                {saving ? "Saving..." : editingId ? "Update Stream" : "Create Stream"}
              </button>
            </div>
          </form>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Streams</h2>
            <span style={styles.summary}>
              {sortedStreams.filter((stream) => stream.is_active).length} primary / {sortedStreams.length} total
            </span>
          </div>

          {loading ? (
            <div style={styles.emptyState}>Loading streams...</div>
          ) : sortedStreams.length === 0 ? (
            <div style={styles.emptyState}>No streams found yet.</div>
          ) : (
            <div style={styles.list}>
              {sortedStreams.map((stream) => (
                <article key={stream.id} style={styles.streamCard}>
                  <div style={styles.streamMeta}>
                    <div>
                      <div style={styles.streamTitleRow}>
                        <h3 style={styles.streamTitle}>{stream.name}</h3>
                        {stream.is_active ? (
                          <span style={styles.activeBadge}>Primary</span>
                        ) : (
                          <span style={styles.offlineBadge}>Backup</span>
                        )}
                      </div>
                      <p style={styles.streamUrl}>{stream.url}</p>
                      <div style={styles.streamInfoRow}>
                        <span style={styles.metaPill}>Priority {stream.priority ?? 100}</span>
                        <span style={styles.metaPill}>{stream.status || "OFFLINE"}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.streamActions}>
                    <button type="button" onClick={() => handlePreview(stream)} style={styles.secondaryButton}>
                      Preview
                    </button>

                    {!stream.is_active ? (
                      <button type="button" onClick={() => handleSetPrimary(stream)} style={styles.primaryButton}>
                        Switch to Primary
                      </button>
                    ) : null}

                    <button type="button" onClick={() => handleEdit(stream)} style={styles.secondaryButton}>
                      Edit
                    </button>

                    <button type="button" onClick={() => handleDelete(stream.id)} style={styles.dangerButton}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  shell: {
    display: "flex",
    flexWrap: "wrap",
    minHeight: "100vh",
    background: "#020617",
    color: "#f8fafc",
    textAlign: "left",
  },
  main: {
    flex: 1,
    minWidth: 0,
    width: "100%",
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
  card: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "20px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "16px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#f8fafc",
  },
  summary: {
    color: "#94a3b8",
    fontSize: "13px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "13px",
    color: "#cbd5e1",
    fontWeight: 600,
  },
  input: {
    border: "1px solid #334155",
    borderRadius: "10px",
    background: "#020617",
    color: "#f8fafc",
    padding: "10px 12px",
    fontSize: "14px",
  },
  select: {
    border: "1px solid #334155",
    borderRadius: "10px",
    background: "#020617",
    color: "#f8fafc",
    padding: "10px 12px",
    fontSize: "14px",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#cbd5e1",
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "none",
    borderRadius: "10px",
    background: "#38bdf8",
    color: "#082f49",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryButton: {
    border: "1px solid #334155",
    borderRadius: "10px",
    background: "#1e293b",
    color: "#f8fafc",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  dangerButton: {
    border: "1px solid rgba(248, 113, 113, 0.35)",
    borderRadius: "10px",
    background: "rgba(127, 29, 29, 0.35)",
    color: "#fecaca",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  error: {
    marginBottom: "16px",
    padding: "12px 14px",
    border: "1px solid rgba(248, 113, 113, 0.45)",
    borderRadius: "10px",
    background: "rgba(127, 29, 29, 0.35)",
    color: "#fecaca",
  },
  success: {
    marginBottom: "16px",
    padding: "12px 14px",
    border: "1px solid rgba(74, 222, 128, 0.35)",
    borderRadius: "10px",
    background: "rgba(22, 101, 52, 0.35)",
    color: "#dcfce7",
  },
  emptyState: {
    padding: "24px",
    border: "1px dashed #334155",
    borderRadius: "12px",
    textAlign: "center",
    color: "#94a3b8",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  streamCard: {
    border: "1px solid #1e293b",
    borderRadius: "14px",
    padding: "16px",
    background: "#111827",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  streamMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
  },
  streamTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  streamTitle: {
    margin: 0,
    color: "#f8fafc",
    fontSize: "18px",
  },
  activeBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "rgba(34, 197, 94, 0.16)",
    color: "#bbf7d0",
    fontSize: "12px",
    fontWeight: 700,
  },
  offlineBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "rgba(248, 113, 113, 0.16)",
    color: "#fecaca",
    fontSize: "12px",
    fontWeight: 700,
  },
  streamUrl: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
    wordBreak: "break-all",
  },
  streamInfoRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  metaPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#1e293b",
    color: "#cbd5e1",
    fontSize: "12px",
  },
  streamActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
};