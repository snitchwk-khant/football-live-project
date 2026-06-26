import { useRef, useState } from "react";
import { supabase } from "../../services/supabase";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export default function UploadMedia({ bucket, onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    setMessage("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Only image files can be uploaded.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const path = `${Date.now()}-${safeName || "image"}.${extension}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

    setUploading(false);
    event.target.value = "";

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Image uploaded successfully.");
    onUploaded();
  }

  return (
    <section style={styles.panel}>
      <div>
        <h2 style={styles.heading}>Upload Image</h2>
        <p style={styles.subtext}>PNG, JPG, WebP, or GIF. Maximum size: 5 MB.</p>
      </div>

      <div style={styles.actions}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={styles.input}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            ...styles.button,
            opacity: uploading ? 0.7 : 1,
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "Uploading..." : "Choose Image"}
        </button>
      </div>

      {message ? <p style={styles.message}>{message}</p> : null}
    </section>
  );
}

const styles = {
  panel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    padding: "20px",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    background: "#0f172a",
    flexWrap: "wrap",
  },
  heading: {
    margin: 0,
    color: "#f8fafc",
    fontSize: "20px",
    fontWeight: 700,
  },
  subtext: {
    margin: "6px 0 0",
    color: "#94a3b8",
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  input: {
    display: "none",
  },
  button: {
    border: 0,
    borderRadius: "8px",
    background: "#10b981",
    color: "#052e16",
    padding: "12px 16px",
    fontWeight: 800,
  },
  message: {
    flexBasis: "100%",
    margin: 0,
    color: "#cbd5e1",
    fontSize: "14px",
  },
};
