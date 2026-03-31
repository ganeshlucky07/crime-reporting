import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import AuthLayout from "./layouts/AuthLayout";
import AppShell from "./layouts/AppShell";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminMapPage from "./pages/admin/AdminMapPage";
import PoliceVerificationPage from "./pages/admin/PoliceVerificationPage";
import LoginPage from "./pages/auth/LoginPage";
import PoliceLoginPage from "./pages/auth/PoliceLoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import NotFoundPage from "./pages/NotFoundPage";
import MyReportsPage from "./pages/user/MyReportsPage";
import SubmitReportPage from "./pages/user/SubmitReportPage";
import { ROLE_HOME } from "./lib/constants";

function RoleHomeRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const destination = ROLE_HOME[user.role] || "/login";
  return <Navigate to={destination} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/police/login" element={<PoliceLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<RoleHomeRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={["USER"]} />}>
            <Route path="/report" element={<SubmitReportPage />} />
            <Route path="/my-reports" element={<MyReportsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["ADMIN", "POLICE"]} />}>
            <Route path="/police" element={<Navigate to="/police/verification" replace />} />
            <Route path="/police/reports" element={<Navigate to="/police/verification" replace />} />
            <Route path="/police/verification" element={<PoliceVerificationPage />} />
            <Route path="/police/dashboard" element={<AdminDashboardPage />} />
            <Route path="/police/map" element={<AdminMapPage />} />

            <Route path="/admin" element={<Navigate to="/police/verification" replace />} />
            <Route path="/admin/verification" element={<Navigate to="/police/verification" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/police/dashboard" replace />} />
            <Route path="/admin/map" element={<Navigate to="/police/map" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
