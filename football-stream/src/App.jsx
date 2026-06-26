
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./admin/Login.jsx";
import Dashboard from "./admin/Dashboard.jsx";
import Matches from "./admin/Matches";
import Streams from "./admin/Streams.jsx";
import Banners from "./admin/Banners.jsx";
import Settings from "./admin/Settings.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/matches" element={<Matches />} />
      <Route path="/dashboard/streams" element={<Streams />} />
      <Route path="/dashboard/banners" element={<Banners />} />
      <Route path="/dashboard/settings" element={<Settings />} />
    </Routes>
  );
}

export default App;
