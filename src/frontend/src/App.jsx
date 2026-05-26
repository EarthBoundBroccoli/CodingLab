import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "./lib/auth-client";
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";
import About from "./pages/About";
import Support from "./pages/Support";
import Problems from "./pages/Problems";
import Contests from "./pages/Contests";
import PreviousContests from "./pages/PreviousContests";
import Growth from "./pages/Growth";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Navbar from "./components/Navbar";

// Route Guard Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const { data: session, isPending } = useSession();

  if (isPending) return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <span className="loading loading-ring loading-lg text-black"></span>
    </div>
  );

  if (!session) {
    // If trying to access admin dashboard, redirect to admin login
    if (window.location.pathname.startsWith('/admin')) {
        return <Navigate to="/admin/login" />;
    }
    return <Navigate to="/auth" />;
  }

  if (allowedRole && session.user.role !== allowedRole) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-base-200 selection:bg-emerald-400 selection:text-black">
        <Navbar />
        <main>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/support" element={<Support />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* Protected User Routes */}
                <Route 
                  path="/problems" 
                  element={
                    <ProtectedRoute>
                      <Problems />
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/contests" 
                  element={
                    <ProtectedRoute>
                      <Contests />
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/contests/previous" 
                  element={
                    <ProtectedRoute>
                      <PreviousContests />
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/growth" 
                  element={
                    <ProtectedRoute>
                      <Growth />
                    </ProtectedRoute>
                  } 
                />

                {/* Protected Admin Routes */}
                <Route 
                  path="/admin/dashboard" 
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
