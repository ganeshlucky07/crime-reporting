import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.24),_transparent_26%),linear-gradient(180deg,_#fff8ef_0%,_#f8fafc_46%,_#eef2ff_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] bg-white shadow-panel lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden bg-storm px-10 py-12 text-white lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-200">Realtime Safety</p>
            <h1 className="mt-5 text-4xl font-bold leading-tight">
              Report incidents quickly and keep every update traceable.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-slate-300">
              Built for lightweight deployment on Render free tier with resilient reconnect handling,
              secure JWT auth, and location-aware reporting.
            </p>
            <div className="mt-10 space-y-4 text-sm text-slate-200">
              <p>Secure user and admin access</p>
              <p>Leaflet-based incident location selection</p>
              <p>Realtime updates for admins and reporters</p>
            </div>
          </div>
          <div className="px-6 py-8 sm:px-10 sm:py-12">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
