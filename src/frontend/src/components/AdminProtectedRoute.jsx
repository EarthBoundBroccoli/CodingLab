import { Navigate, Outlet } from "react-router-dom";
import { useAdminAccess } from "../hooks/useAdminAccess";

const AdminProtectedRoute = () => {
  const { user, loading, error, retry } = useAdminAccess();
  if (loading) return <p className="p-8" role="status">Checking admin access...</p>;
  if (error) return (
    <div className="p-8" role="alert">
      <p>{error}</p>
      <button type="button" onClick={retry}>Try again</button>
    </div>
  );
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
