import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-xl px-3 py-2 text-sm font-medium transition ${
          isActive ? "bg-white text-storm shadow-sm" : "text-slate-200 hover:bg-white/10"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const roleLabel = user?.role === "USER" ? "USER" : "POLICE TEAM";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(15,118,110,0.18),_transparent_26%),radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_28%),linear-gradient(180deg,_#fff8ef_0%,_#f8fafc_100%)]">
      <header className="border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ember">Crime Reporting System</p>
            <h1 className="text-lg font-bold text-slate-950">Operational control center</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {user?.name} | {roleLabel}
            </span>
            <Button variant="ghost" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-[28px] bg-storm p-4 shadow-panel">
          <nav className="flex flex-col gap-2">
            {user?.role === "USER" ? (
              <>
                <NavItem to="/report">Submit Report</NavItem>
                <NavItem to="/my-reports">My Reports</NavItem>
              </>
            ) : (
              <>
                <NavItem to="/police/verification">Police Verification</NavItem>
                <NavItem to="/police/dashboard">Dashboard</NavItem>
                <NavItem to="/police/map">Map View</NavItem>
              </>
            )}
          </nav>
        </aside>

        <main className="space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
