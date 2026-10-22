
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import MatchesPage from "./pages/Matches.jsx";
import WatchPage from "./pages/Watch.jsx";
import MatchDetailPage from "./pages/MatchDetail.jsx";
import Login from "./admin/Login.jsx";
import Dashboard from "./admin/Dashboard.jsx";
import Matches from "./admin/Matches";
import Streams from "./admin/Streams.jsx";
import Banners from "./admin/Banners.jsx";
import Settings from "./admin/Settings.jsx";
import Media from "./admin/Media/index.jsx";
import Analytics from "./admin/Analytics.jsx";
import AdminRoute from "./auth/AdminRoute";
import { recordViewerVisit } from "./utils/viewerAnalytics.js";

function App() {
  const location = useLocation();

  useEffect(() => {
    recordViewerVisit(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/matches" element={<MatchesPage />} />
      <Route path="/matches/:matchId" element={<MatchDetailPage />} />
      <Route path="/watch/:matchId" element={<WatchPage />} />
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/dashboard/admin" element={<Login />} />
      <Route path="/dashboard" element={<AdminRoute key={location.pathname}><Dashboard /></AdminRoute>} />
      <Route path="/dashboard/matches" element={<AdminRoute key={location.pathname}><Matches /></AdminRoute>} />
      <Route path="/dashboard/streams" element={<AdminRoute key={location.pathname}><Streams /></AdminRoute>} />
      <Route path="/dashboard/banners" element={<AdminRoute key={location.pathname}><Banners /></AdminRoute>} />
      <Route path="/dashboard/media" element={<AdminRoute key={location.pathname}><Media /></AdminRoute>} />
      <Route path="/dashboard/analytics" element={<AdminRoute key={location.pathname}><Analytics /></AdminRoute>} />
      <Route path="/dashboard/settings" element={<AdminRoute key={location.pathname}><Settings /></AdminRoute>} />
    </Routes>
  );
}

export default App;
