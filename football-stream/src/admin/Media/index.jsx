import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "../../services/supabase";
import MediaGrid from "./MediaGrid";
import UploadMedia from "./UploadMedia";

const MEDIA_BUCKET = "media";
const ITEMS_PER_PAGE = 24;

export default function Media() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const getPublicUrl = useCallback((path) => {
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const fetchMedia = useCallback(async () => {
    const imageItems = [];
    let offset = 0;

    while (true) {
      const { data, error: listError } = await supabase.storage.from(MEDIA_BUCKET).list("", {
        limit: 100,
        offset,
        sortBy: { column: "created_at", order: "desc" },
      });

      if (listError) {
        throw listError;
      }

      if (!data?.length) {
        break;
      }

      imageItems.push(
        ...data
          .filter((item) => item.name && item.metadata?.mimetype?.startsWith("image/"))
          .map((item) => ({
            id: item.id || item.name,
            name: item.name,
            path: item.name,
            url: getPublicUrl(item.name),
            size: item.metadata?.size || 0,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }))
      );

      if (data.length < 100) {
        break;
      }

      offset += 100;
    }

    return imageItems;
  }, [getPublicUrl]);

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      const imageItems = await fetchMedia();
      setError("");
      setItems(imageItems);
      setCurrentPage(1);
    } catch (mediaError) {
      setError(mediaError?.message || "Unable to load media from Supabase.");
    } finally {
      setLoading(false);
    }
  }, [fetchMedia]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMedia();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadMedia]);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const pagedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  async function handleDelete(path) {
    const { error: deleteError } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setError("");
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

        <section style={styles.toolbar}>
          <label style={styles.searchBox}>
            <span style={styles.searchLabel}>Search by filename</span>
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search images"
              style={styles.searchInput}
            />
          </label>

          <div style={styles.paginationSummary}>
            <span style={styles.summaryText}>
              {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
            </span>
            <div style={styles.paginationControls}>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                style={{
                  ...styles.paginationButton,
                  opacity: safeCurrentPage === 1 ? 0.5 : 1,
                  cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <span style={styles.pageText}>
                Page {safeCurrentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                style={{
                  ...styles.paginationButton,
                  opacity: safeCurrentPage === totalPages ? 0.5 : 1,
                  cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div style={styles.state}>Loading media library…</div>
        ) : null}

        {!loading && !error && !items.length ? (
          <div style={styles.state}>No images have been uploaded yet.</div>
        ) : null}

        {!loading && !error && items.length > 0 && !filteredItems.length ? (
          <div style={styles.state}>No images match your search.</div>
        ) : null}

        {!loading && !error && filteredItems.length > 0 ? (
          <MediaGrid items={pagedItems} loading={false} onDelete={handleDelete} />
        ) : null}
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
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    marginTop: "24px",
    flexWrap: "wrap",
  },
  searchBox: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: "min(320px, 100%)",
  },
  searchLabel: {
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  searchInput: {
    width: "100%",
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "#0f172a",
    color: "#f8fafc",
    padding: "10px 12px",
    outline: "none",
  },
  paginationSummary: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  summaryText: {
    color: "#94a3b8",
    fontSize: "14px",
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  paginationButton: {
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "#0f172a",
    color: "#f8fafc",
    padding: "8px 12px",
  },
  pageText: {
    color: "#cbd5e1",
    fontSize: "14px",
  },
  error: {
    marginTop: "18px",
    padding: "12px 14px",
    border: "1px solid rgba(248, 113, 113, 0.45)",
    borderRadius: "8px",
    background: "rgba(127, 29, 29, 0.35)",
    color: "#fecaca",
  },
  state: {
    marginTop: "24px",
    padding: "32px",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    background: "#0f172a",
    color: "#94a3b8",
    textAlign: "center",
  },
};
