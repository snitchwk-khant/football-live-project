import { useState } from "react";

const EMPTY_FORM = {
  home_team: "",
  away_team: "",
  league: "",
  stream_url: "",
  poster: "",
  match_time: "",
  status: "OFFLINE",
  is_live: false,
};

const REQUIRED_FIELDS = ["home_team", "away_team", "stream_url", "status"];

export default function MatchForm({ editingMatch, saving, onSave, onCancel }) {
  const [values, setValues] = useState(() => getInitialValues(editingMatch));
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSuccess("");
    setError("");

    const validationError = validateMatch(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    const result = await onSave(values);

    if (!result?.ok) {
      setError(result?.error || "Unable to save match.");
      return;
    }

    setValues(EMPTY_FORM);
    setSuccess(editingMatch ? "Match updated successfully." : "Match created successfully.");
  }

  function handleReset() {
    setValues(EMPTY_FORM);
    setSuccess("");
    setError("");
  }

  function handleCancel() {
    setValues(EMPTY_FORM);
    setSuccess("");
    setError("");
    onCancel();
  }

  return (
    <form onSubmit={handleSubmit} style={styles.panel}>
      <div style={styles.formHeader}>
        <div>
          <h2 style={styles.heading}>{editingMatch ? "Edit Match" : "Add Match"}</h2>
          <p style={styles.subtext}>Manage match details, stream URL, poster, and live state.</p>
        </div>

        {editingMatch ? (
          <button type="button" onClick={handleCancel} style={styles.secondaryButton}>
            Cancel Edit
          </button>
        ) : null}
      </div>

      {success ? <div style={styles.success}>{success}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.grid}>
        <label style={styles.field}>
          <span style={styles.label}>Home Team *</span>
          <input
            name="home_team"
            value={values.home_team}
            onChange={handleChange}
            required
            placeholder="Manchester United"
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Away Team *</span>
          <input
            name="away_team"
            value={values.away_team}
            onChange={handleChange}
            required
            placeholder="Chelsea"
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>League</span>
          <input
            name="league"
            value={values.league}
            onChange={handleChange}
            placeholder="Premier League"
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Match Time</span>
          <input
            type="datetime-local"
            name="match_time"
            value={values.match_time}
            onChange={handleChange}
            style={styles.input}
          />
        </label>

        <label style={{ ...styles.field, ...styles.wide }}>
          <span style={styles.label}>Stream URL *</span>
          <input
            type="url"
            name="stream_url"
            value={values.stream_url}
            onChange={handleChange}
            required
            placeholder="https://example.com/live.m3u8"
            style={styles.input}
          />
        </label>

        <label style={{ ...styles.field, ...styles.wide }}>
          <span style={styles.label}>Poster URL</span>
          <input
            type="url"
            name="poster"
            value={values.poster}
            onChange={handleChange}
            placeholder="https://example.com/poster.jpg"
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Status *</span>
          <select name="status" value={values.status} onChange={handleChange} style={styles.input}>
            <option value="OFFLINE">OFFLINE</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="LIVE">LIVE</option>
            <option value="ENDED">ENDED</option>
          </select>
        </label>

        <label style={styles.checkboxField}>
          <input
            type="checkbox"
            name="is_live"
            checked={values.is_live}
            onChange={handleChange}
            style={styles.checkbox}
          />
          <span>
            <strong style={styles.checkboxTitle}>Mark as live</strong>
            <span style={styles.checkboxText}>Only one match can be live at a time.</span>
          </span>
        </label>
      </div>

      <div style={styles.footer}>
        <button type="submit" disabled={saving} style={styles.primaryButton}>
          {saving ? "Saving..." : editingMatch ? "Update Match" : "Save Match"}
        </button>

        <button type="button" onClick={handleReset} disabled={saving} style={styles.secondaryButton}>
          Reset
        </button>
      </div>
    </form>
  );
}

function getInitialValues(match) {
  if (!match) return EMPTY_FORM;

  return {
    home_team: match.home_team || "",
    away_team: match.away_team || "",
    league: match.league || "",
    stream_url: match.stream_url || "",
    poster: match.poster || "",
    match_time: toDateTimeLocal(match.match_time),
    status: match.status || "OFFLINE",
    is_live: Boolean(match.is_live),
  };
}

function validateMatch(values) {
  const missingField = REQUIRED_FIELDS.find((field) => !values[field].trim());

  if (missingField) {
    return "Please fill all required fields.";
  }

  try {
    new URL(values.stream_url);
  } catch {
    return "Please enter a valid Stream URL.";
  }

  if (values.poster.trim()) {
    try {
      new URL(values.poster);
    } catch {
      return "Please enter a valid Poster URL.";
    }
  }

  return "";
}

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

const styles = {
  panel: {
    padding: "20px",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    background: "#0f172a",
  },
  formHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "20px",
  },
  heading: {
    margin: 0,
    color: "#f8fafc",
    fontSize: "22px",
    fontWeight: 700,
  },
  subtext: {
    margin: "6px 0 0",
    color: "#94a3b8",
    fontSize: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  wide: {
    gridColumn: "1 / -1",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "#020617",
    color: "#f8fafc",
    padding: "12px",
    outline: "none",
  },
  checkboxField: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px",
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "#111827",
  },
  checkbox: {
    marginTop: "3px",
  },
  checkboxTitle: {
    display: "block",
    color: "#f8fafc",
    fontSize: "14px",
  },
  checkboxText: {
    display: "block",
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "13px",
  },
  success: {
    marginBottom: "16px",
    padding: "12px 14px",
    border: "1px solid rgba(16, 185, 129, 0.45)",
    borderRadius: "8px",
    background: "rgba(6, 78, 59, 0.35)",
    color: "#bbf7d0",
    fontSize: "14px",
  },
  error: {
    marginBottom: "16px",
    padding: "12px 14px",
    border: "1px solid rgba(248, 113, 113, 0.45)",
    borderRadius: "8px",
    background: "rgba(127, 29, 29, 0.35)",
    color: "#fecaca",
    fontSize: "14px",
  },
  footer: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    marginTop: "18px",
  },
  primaryButton: {
    border: 0,
    borderRadius: "8px",
    background: "#10b981",
    color: "#052e16",
    padding: "12px 18px",
    cursor: "pointer",
    fontWeight: 800,
  },
  secondaryButton: {
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "#1e293b",
    color: "#f8fafc",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 700,
  },
};
