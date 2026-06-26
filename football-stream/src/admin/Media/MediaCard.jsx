import { useState } from "react";

export default function MediaCard({ item, onDelete }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(item.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete ${item.name}?`);
    if (!confirmed) return;

    setDeleting(true);
    await onDelete(item.path);
    setDeleting(false);
  }

  return (
    <>
      <article style={styles.card}>
        <button type="button" onClick={() => setPreviewOpen(true)} style={styles.previewButton}>
          <img src={item.url} alt={item.name} loading="lazy" style={styles.image} />
        </button>

        <div style={styles.body}>
          <h3 title={item.name} style={styles.name}>
            {item.name}
          </h3>
          <p style={styles.meta}>{formatBytes(item.size)}</p>

          <div style={styles.actions}>
            <button type="button" onClick={() => setPreviewOpen(true)} style={styles.secondaryButton}>
              Preview
            </button>
            <button type="button" onClick={handleCopy} style={styles.secondaryButton}>
              {copied ? "Copied" : "Copy URL"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                ...styles.deleteButton,
                opacity: deleting ? 0.7 : 1,
                cursor: deleting ? "not-allowed" : "pointer",
              }}
            >
              {deleting ? "Deleting" : "Delete"}
            </button>
          </div>
        </div>
      </article>

      {previewOpen ? (
        <div style={styles.modalBackdrop} onClick={() => setPreviewOpen(false)}>
          <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{item.name}</h3>
              <button type="button" onClick={() => setPreviewOpen(false)} style={styles.closeButton}>
                Close
              </button>
            </div>
            <img src={item.url} alt={item.name} style={styles.modalImage} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

const styles = {
  card: {
    overflow: "hidden",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    background: "#0f172a",
  },
  previewButton: {
    display: "block",
    width: "100%",
    padding: 0,
    border: 0,
    background: "#020617",
    cursor: "pointer",
  },
  image: {
    display: "block",
    width: "100%",
    aspectRatio: "4 / 3",
    objectFit: "cover",
  },
  body: {
    padding: "14px",
  },
  name: {
    margin: 0,
    color: "#f8fafc",
    fontSize: "15px",
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  meta: {
    margin: "6px 0 0",
    color: "#94a3b8",
    fontSize: "13px",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginTop: "14px",
  },
  secondaryButton: {
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "#1e293b",
    color: "#f8fafc",
    padding: "9px",
    cursor: "pointer",
  },
  deleteButton: {
    gridColumn: "1 / -1",
    border: "1px solid rgba(248, 113, 113, 0.5)",
    borderRadius: "8px",
    background: "rgba(127, 29, 29, 0.45)",
    color: "#fecaca",
    padding: "9px",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "rgba(2, 6, 23, 0.82)",
  },
  modal: {
    width: "min(960px, 100%)",
    maxHeight: "90vh",
    overflow: "auto",
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "#0f172a",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "14px 16px",
    borderBottom: "1px solid #1e293b",
  },
  modalTitle: {
    margin: 0,
    color: "#f8fafc",
    fontSize: "16px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  closeButton: {
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "#1e293b",
    color: "#f8fafc",
    padding: "8px 10px",
    cursor: "pointer",
  },
  modalImage: {
    display: "block",
    width: "100%",
    maxHeight: "calc(90vh - 62px)",
    objectFit: "contain",
    background: "#020617",
  },
};
