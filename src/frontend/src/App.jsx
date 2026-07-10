import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import BecomeSetter from "./pages/BecomeSetter";
import AddProblem from "./pages/AddProblem";
import ProblemWorkspace from "./pages/ProblemWorkspace";
import Navbar from "./components/Navbar";
import Inbox from "./pages/Inbox";
import Leaderboard from "./pages/Leaderboard";
import CampusLeaderboard from "./pages/CampusLeaderboard";

// Admin components
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProblemRequests from "./pages/admin/AdminProblemRequests";
import AdminContests from "./pages/admin/AdminContests";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import SetterApprovals from "./pages/admin/SetterApprovals";

function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-base-200 selection:bg-emerald-400 selection:text-black">
      {!hideNavbar && <Navbar />}
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/support" element={<Support />} />
          <Route path="/auth" element={<Auth />} />
          
          <Route path="/admin" element={<AdminLogin />} />
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
            path="/problems/:id" 
            element={
              <ProtectedRoute>
                <ProblemWorkspace />
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
          <Route 
            path="/become-setter" 
            element={
              <ProtectedRoute>
                <BecomeSetter />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inbox" 
            element={
              <ProtectedRoute>
                <Inbox />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/leaderboard" 
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/leaderboard/university/:universityId" 
            element={
              <ProtectedRoute>
                <CampusLeaderboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/add-problem" 
            element={
              <ProtectedRoute allowedRole="problem_setter">
                <AddProblem />
              </ProtectedRoute>
            } 
          />

          {/* Protected Admin Routes */}
          <Route path="/admin/*" element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="setter-approvals" element={<SetterApprovals />} />
              <Route path="problem-requests" element={<AdminProblemRequests />} />
              <Route path="contests" element={<AdminContests />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

// Route Guard Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const { data: session, isPending } = useSession();

  if (isPending) return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <span className="loading loading-ring loading-lg text-black"></span>
    </div>
  );

  if (!session) {
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
      <AppContent />
    </Router>
  );
}

export default App;
