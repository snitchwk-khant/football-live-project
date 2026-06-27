import { useState } from "react";
import Sidebar from "./Sidebar";
import { readSettings, writeSettings } from "../utils/settings";

const fields = [
  { key: "siteName", label: "Site Name", placeholder: "LIVE FOOTBALL" },
  { key: "heroTitle", label: "Hero Title", placeholder: "Watch live football anywhere" },
  { key: "heroSubtitle", label: "Hero Subtitle", placeholder: "Stay updated with live matches and upcoming fixtures.", multiline: true },
  { key: "contactTelegram", label: "Telegram", placeholder: "@footballstream" },
  { key: "contactViber", label: "Viber", placeholder: "+95 900 000 000" },
  { key: "contactPhone", label: "Phone", placeholder: "+95 900 000 000" },
  { key: "footerText", label: "Footer Text", placeholder: "© 2026 Football Stream. All rights reserved.", multiline: true },
  { key: "seoTitle", label: "SEO Title", placeholder: "Football Stream | Live Matches & Updates" },
  { key: "seoDescription", label: "SEO Description", placeholder: "A modern football streaming hub for live matches, upcoming fixtures, and match updates.", multiline: true },
];

export default function Settings() {
  const [form, setForm] = useState(() => readSettings());
  const [savedMessage, setSavedMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSave(event) {
    event.preventDefault();
    const saved = writeSettings(form);
    setForm(saved);
    setSavedMessage("Settings saved successfully.");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#020617", color: "white" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "40px", background: "#020617" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 600 }}>Website Settings</h1>
          <p style={{ margin: "8px 0 0", color: "#94a3b8" }}>
            Update the public branding and contact details that appear on the homepage.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "860px",
            display: "grid",
            gap: "16px",
          }}
        >
          {savedMessage ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.14)",
                color: "#6ee7b7",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              {savedMessage}
            </div>
          ) : null}

          <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {fields.map((field) => (
              <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ color: "#cbd5e1", fontSize: "14px" }}>{field.label}</span>
                {field.multiline ? (
                  <textarea
                    name={field.key}
                    value={form[field.key] ?? ""}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    rows={4}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid #334155",
                      background: "#020617",
                      color: "white",
                      resize: "vertical",
                    }}
                  />
                ) : (
                  <input
                    name={field.key}
                    value={form[field.key] ?? ""}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid #334155",
                      background: "#020617",
                      color: "white",
                    }}
                  />
                )}
              </label>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
            <button
              type="submit"
              style={{
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "12px 18px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save Settings
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}