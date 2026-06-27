import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import { supabase } from "../services/supabase";
import { sanitizeImageUrl, sanitizePlainText, sanitizeUrl } from "../utils/security";

const STORAGE_BUCKET = "media";
const POSITIONS = ["top", "bottom", "side", "popup"];

const EMPTY_FORM = {
  title: "",
  description: "",
  image_url: "",
  link_url: "",
  position: "top",
  is_active: true,
};

export default function Banners() {
  const fileInputRef = useRef(null);
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBanners = useCallback(async () => {
    setError("");

    const { data, error: fetchError } = await supabase
      .from("banners")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setBanners(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    supabase
      .from("banners")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!active) return;

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        setBanners(data || []);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function validateBanner(values) {
    if (!values.title.trim()) return "Title is required.";
    if (!values.image_url.trim()) return "Image URL is required.";
    if (!POSITIONS.includes(values.position)) return "Invalid banner position.";

    try {
      new URL(values.image_url);
    } catch {
      return "Image URL must be a valid URL.";
    }

    if (values.link_url.trim()) {
      try {
        new URL(values.link_url);
      } catch {
        return "Link URL must be a valid URL.";
      }
    }

    return "";
  }

  function createPayload(values) {
    return {
      title: sanitizePlainText(values.title, { maxLength: 120 }),
      description: sanitizePlainText(values.description, { maxLength: 260 }) || null,
      image_url: sanitizeImageUrl(values.image_url),
      link_url: sanitizeUrl(values.link_url) || null,
      position: values.position,
      is_active: Boolean(values.is_active),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateBanner(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const payload = createPayload(form);
    const request = editingId
      ? supabase.from("banners").update(payload).eq("id", editingId)
      : supabase.from("banners").insert(payload);

    const { error: saveError } = await request;
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    setSuccess(editingId ? "Banner updated successfully." : "Banner created successfully.");
    await loadBanners();
  }

  function handleEdit(banner) {
    setEditingId(banner.id);
    setSuccess("");
    setError("");
    setForm({
      title: banner.title || "",
      description: banner.description || "",
      image_url: banner.image_url || "",
      link_url: banner.link_url || "",
      position: banner.position || "top",
      is_active: Boolean(banner.is_active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this banner?");
    if (!confirmed) return;

    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase.from("banners").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (editingId === id) {
      handleReset();
    }

    setSuccess("Banner deleted successfully.");
    await loadBanners();
  }

  async function handleToggleActive(banner) {
    setError("");
    setSuccess("");

    const { error: toggleError } = await supabase
      .from("banners")
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);

    if (toggleError) {
      setError(toggleError.message);
      return;
    }

    await loadBanners();
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files can be uploaded.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const path = `banners/${Date.now()}-${safeName || "banner"}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    setUploading(false);

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    setForm((currentForm) => ({
      ...currentForm,
      image_url: data.publicUrl,
    }));
    setSuccess("Image uploaded successfully.");
  }

  return (
    <div style={styles.shell}>
      <Sidebar />
      <main style={styles.main}>
        <header style={styles.header}>
          <p style={styles.eyebrow}>Admin</p>
          <h1 style={styles.title}>Banner Management</h1>
        </header>

        <form onSubmit={handleSubmit} style={styles.panel}>
          <div style={styles.formHeader}>
            <div>
              <h2 style={styles.heading}>{editingId ? "Edit Banner" : "Create Banner"}</h2>
              <p style={styles.subtext}>Manage banners for public placements.</p>
            </div>
            {editingId ? (
              <button type="button" onClick={handleReset} style={styles.secondaryButton}>
                Cancel Edit
              </button>
            ) : null}
          </div>

          {success ? <div style={styles.success}>{success}</div> : null}
          {error ? <div style={styles.error}>{error}</div> : null}

          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Title *</span>
              <input name="title" value={form.title} onChange={handleChange} required style={styles.input} />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Position *</span>
              <select name="position" value={form.position} onChange={handleChange} required style={styles.input}>
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {position.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ ...styles.field, ...styles.wide }}>
              <span style={styles.label}>Description</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                style={{ ...styles.input, ...styles.textarea }}
              />
            </label>

            <label style={{ ...styles.field, ...styles.wide }}>
              <span style={styles.label}>Image URL *</span>
              <input
                type="url"
                name="image_url"
                value={form.image_url}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </label>

            <div style={{ ...styles.field, ...styles.wide }}>
              <span style={styles.label}>Upload Image</span>
              <div style={styles.uploadRow}>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={styles.fileInput} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={styles.secondaryButton}>
                  {uploading ? "Uploading..." : "Choose Image"}
                </button>
                {form.image_url ? <img src={form.image_url} alt={form.title || "Banner preview"} style={styles.preview} /> : null}
              </div>
            </div>

            <label style={{ ...styles.field, ...styles.wide }}>
              <span style={styles.label}>Link URL</span>
              <input type="url" name="link_url" value={form.link_url} onChange={handleChange} style={styles.input} />
            </label>

            <label style={styles.toggleField}>
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
              <span>Active banner</span>
            </label>
          </div>

          <div style={styles.actions}>
            <button type="submit" disabled={saving || uploading} style={styles.primaryButton}>
              {saving ? "Saving..." : "Save Banner"}
            </button>
            <button type="button" onClick={handleReset} disabled={saving || uploading} style={styles.secondaryButton}>
              Reset
            </button>
          </div>
        </form>

        <section style={styles.listSection}>
          <div style={styles.listHeader}>
            <h2 style={styles.heading}>Banners</h2>
            <span style={styles.count}>{banners.length} total</span>
          </div>

          {loading ? <div style={styles.state}>Loading banners...</div> : null}
          {!loading && !banners.length ? <div style={styles.state}>No banners found.</div> : null}

          {!loading && banners.length ? (
            <div style={styles.cards}>
              {banners.map((banner) => (
                <article key={banner.id} style={styles.card}>
                  {banner.image_url ? <img src={sanitizeImageUrl(banner.image_url)} alt={banner.title} style={styles.cardImage} /> : null}
                  <div style={styles.cardBody}>
                    <div style={styles.cardTop}>
                      <div>
                        <p style={styles.position}>{banner.position}</p>
                        <h3 style={styles.cardTitle}>{banner.title}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(banner)}
                        style={{
                          ...styles.statusBadge,
                          ...(banner.is_active ? styles.activeBadge : styles.inactiveBadge),
                        }}
                      >
                        {banner.is_active ? "Active" : "Inactive"}
                      </button>
                    </div>

                    {banner.description ? <p style={styles.description}>{banner.description}</p> : null}
                    {banner.link_url ? (
                      <a href={banner.link_url} target="_blank" rel="noreferrer" style={styles.link}>
                        {banner.link_url}
                      </a>
                    ) : null}

                    <div style={styles.cardActions}>
                      <button type="button" onClick={() => handleEdit(banner)} style={styles.secondaryButton}>
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(banner.id)} style={styles.deleteButton}>
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

const styles = {
  shell: { display: "flex", flexWrap: "wrap", minHeight: "100vh", background: "#020617", color: "#f8fafc", textAlign: "left" },
  main: { flex: 1, minWidth: 0, width: "100%", padding: "32px" },
  header: { marginBottom: "24px" },
  eyebrow: { margin: 0, color: "#38bdf8", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
  title: { margin: "4px 0 0", color: "#f8fafc", fontSize: "32px", fontWeight: 700 },
  panel: { padding: "20px", border: "1px solid #1e293b", borderRadius: "8px", background: "#0f172a" },
  formHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" },
  heading: { margin: 0, color: "#f8fafc", fontSize: "22px", fontWeight: 700 },
  subtext: { margin: "6px 0 0", color: "#94a3b8", fontSize: "14px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" },
  wide: { gridColumn: "1 / -1" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { color: "#cbd5e1", fontSize: "13px", fontWeight: 700 },
  input: { width: "100%", boxSizing: "border-box", border: "1px solid #334155", borderRadius: "8px", background: "#020617", color: "#f8fafc", padding: "12px", outline: "none" },
  textarea: { resize: "vertical", fontFamily: "inherit" },
  uploadRow: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  fileInput: { display: "none" },
  preview: { width: "120px", height: "68px", objectFit: "cover", borderRadius: "8px", border: "1px solid #334155" },
  toggleField: { display: "flex", alignItems: "center", gap: "10px", color: "#cbd5e1", fontWeight: 700 },
  actions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px", flexWrap: "wrap" },
  primaryButton: { border: 0, borderRadius: "8px", background: "#10b981", color: "#052e16", padding: "12px 18px", cursor: "pointer", fontWeight: 800 },
  secondaryButton: { border: "1px solid #334155", borderRadius: "8px", background: "#1e293b", color: "#f8fafc", padding: "10px 12px", cursor: "pointer", fontWeight: 700 },
  deleteButton: { border: "1px solid rgba(248, 113, 113, 0.5)", borderRadius: "8px", background: "rgba(127, 29, 29, 0.45)", color: "#fecaca", padding: "10px 12px", cursor: "pointer", fontWeight: 700 },
  success: { marginBottom: "16px", padding: "12px 14px", border: "1px solid rgba(16, 185, 129, 0.45)", borderRadius: "8px", background: "rgba(6, 78, 59, 0.35)", color: "#bbf7d0", fontSize: "14px" },
  error: { marginBottom: "16px", padding: "12px 14px", border: "1px solid rgba(248, 113, 113, 0.45)", borderRadius: "8px", background: "rgba(127, 29, 29, 0.35)", color: "#fecaca", fontSize: "14px" },
  listSection: { marginTop: "24px" },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "14px" },
  count: { color: "#94a3b8", fontSize: "14px" },
  state: { padding: "32px", border: "1px solid #1e293b", borderRadius: "8px", background: "#0f172a", color: "#94a3b8", textAlign: "center" },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "18px" },
  card: { overflow: "hidden", border: "1px solid #1e293b", borderRadius: "8px", background: "#0f172a" },
  cardImage: { display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover", background: "#020617" },
  cardBody: { padding: "16px" },
  cardTop: { display: "flex", justifyContent: "space-between", gap: "12px" },
  position: { margin: 0, color: "#38bdf8", fontSize: "12px", fontWeight: 800, textTransform: "uppercase" },
  cardTitle: { margin: "6px 0 0", color: "#f8fafc", fontSize: "18px" },
  statusBadge: { alignSelf: "flex-start", borderRadius: "999px", padding: "6px 10px", fontSize: "12px", fontWeight: 800, cursor: "pointer" },
  activeBadge: { border: "1px solid rgba(52, 211, 153, 0.35)", background: "rgba(16, 185, 129, 0.18)", color: "#34d399" },
  inactiveBadge: { border: "1px solid rgba(148, 163, 184, 0.25)", background: "rgba(100, 116, 139, 0.2)", color: "#cbd5e1" },
  description: { color: "#cbd5e1", fontSize: "14px", lineHeight: 1.5 },
  link: { display: "block", color: "#38bdf8", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardActions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "16px" },
};
