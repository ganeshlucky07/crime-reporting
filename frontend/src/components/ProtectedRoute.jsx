import { Navigate, Outlet } from "react-router-dom";
import { ROLE_HOME } from "../lib/constants";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const destination = ROLE_HOME[user.role] || "/login";
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
