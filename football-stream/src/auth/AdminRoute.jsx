import { Navigate } from "react-router-dom";
import useAdminAccess from "./useAdminAccess";

export default function AdminRoute({ children }) {
  const access = useAdminAccess();
  if (access.loading) return <p role="status" style={{ padding: "24px", color: "#94a3b8" }}>Checking admin access…</p>;
  if (access.stage !== "ready") {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
