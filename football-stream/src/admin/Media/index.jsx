import { useCallback, useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "../../services/supabase";
import MediaGrid from "./MediaGrid";
import UploadMedia from "./UploadMedia";

const MEDIA_BUCKET = "media";

export default function Media() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getPublicUrl = useCallback((path) => {
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const fetchMedia = useCallback(async () => {
    const { data, error: listError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list("", {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (listError) {
      throw listError;
    }

    return (data || [])
      .filter((item) => item.name && item.metadata?.mimetype?.startsWith("image/"))
      .map((item) => ({
        id: item.id || item.name,
        name: item.name,
        path: item.name,
        url: getPublicUrl(item.name),
        size: item.metadata?.size || 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
  }, [getPublicUrl]);

  const loadMedia = useCallback(async () => {
    try {
      const imageItems = await fetchMedia();
      setError("");
      setItems(imageItems);
    } catch (mediaError) {
      setError(mediaError.message);
    }
    setLoading(false);
  }, [fetchMedia]);

  useEffect(() => {
    let active = true;

    fetchMedia()
      .then((imageItems) => {
        if (!active) return;
        setError("");
        setItems(imageItems);
      })
      .catch((mediaError) => {
        if (!active) return;
        setError(mediaError.message);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchMedia]);

  async function handleDelete(path) {
    const { error: deleteError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .remove([path]);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setItems((currentItems) => currentItems.filter((item) => item.path !== path));
  }

  return (
    <div style={styles.shell}>
      <Sidebar />

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Admin</p>
            <h1 style={styles.title}>Media Library</h1>
          </div>
        </header>

        <UploadMedia bucket={MEDIA_BUCKET} onUploaded={loadMedia} />

        {error ? <div style={styles.error}>{error}</div> : null}

        <MediaGrid items={items} loading={loading} onDelete={handleDelete} />
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
  error: {
    marginTop: "18px",
    padding: "12px 14px",
    border: "1px solid rgba(248, 113, 113, 0.45)",
    borderRadius: "8px",
    background: "rgba(127, 29, 29, 0.35)",
    color: "#fecaca",
  },
};
