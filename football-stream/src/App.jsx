
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./admin/Login.jsx";
import Dashboard from "./admin/Dashboard.jsx";
import Matches from "./admin/Matches";
import Streams from "./admin/Streams.jsx";
import Banners from "./admin/Banners.jsx";
import Settings from "./admin/Settings.jsx";
import Media from "./admin/Media/index.jsx";
import Analytics from "./admin/Analytics.jsx";
import { isAdminAuthenticated } from "./utils/auth.js";
import { recordViewerVisit } from "./utils/viewerAnalytics.js";

function ProtectedRoute({ children }) {
  return isAdminAuthenticated() ? children : <Navigate to="/admin/login" replace />;
}

function App() {
  const location = useLocation();

  useEffect(() => {
    recordViewerVisit(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
      <Route path="/dashboard/streams" element={<ProtectedRoute><Streams /></ProtectedRoute>} />
      <Route path="/dashboard/banners" element={<ProtectedRoute><Banners /></ProtectedRoute>} />
      <Route path="/dashboard/media" element={<ProtectedRoute><Media /></ProtectedRoute>} />
      <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
