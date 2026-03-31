export default function ConnectionBadge({ state }) {
  const text = {
    idle: "Realtime idle",
    connecting: "Connecting realtime",
    connected: "Realtime live",
    reconnecting: "Realtime reconnecting",
    error: "Realtime unstable"
  }[state] || "Realtime idle";

  const tone = {
    connected: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    reconnecting: "bg-amber-100 text-amber-700 ring-amber-200",
    connecting: "bg-sky-100 text-sky-700 ring-sky-200",
    error: "bg-rose-100 text-rose-700 ring-rose-200",
    idle: "bg-slate-100 text-slate-700 ring-slate-200"
  }[state] || "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {text}
    </span>
  );
}
