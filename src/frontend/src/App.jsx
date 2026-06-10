import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProblemRequests from "./pages/admin/AdminProblemRequests";
import AdminContests from "./pages/admin/AdminContests";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminLayout from "./components/AdminLayout";

function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith("/admin/");

  return (
    <div className="min-h-screen bg-base-200 selection:bg-primary selection:text-primary-content">
      {!hideNavbar && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="problem-requests" element={<AdminProblemRequests />} />
              <Route path="contests" element={<AdminContests />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
