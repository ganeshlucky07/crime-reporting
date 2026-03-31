import { useEffect, useState } from "react";
import { getAllReports } from "../../api/reports";
import ConnectionBadge from "../../components/ConnectionBadge";
import EmptyState from "../../components/EmptyState";
import Loader from "../../components/Loader";
import PageHeader from "../../components/PageHeader";
import ReportMap from "../../components/ReportMap";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeChannel } from "../../hooks/useRealtimeChannel";
import { useWakeupHint } from "../../hooks/useWakeupHint";
import { getErrorMessage } from "../../lib/errors";

export default function AdminMapPage() {
  const { token } = useAuth();
  const { pushToast } = useToast();
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const wakeupHint = useWakeupHint(loading);

  async function loadReports(nextStatus = statusFilter) {
    setLoading(true);
    setError("");

    try {
      const data = await getAllReports({
        page: 0,
        size: 100,
        status: nextStatus || undefined
      });
      setReports(data.content);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load map reports right now."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports("");
  }, []);

  const realtimeState = useRealtimeChannel({
    enabled: Boolean(token),
    token,
    destination: "/topic/admin/reports",
    onEvent: (event) => {
      if (!event.report) {
        return;
      }

      pushToast({
        title: "Realtime update",
        description: event.report.title
      });
      loadReports(statusFilter);
    }
  });

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Spatial view"
        title="Admin map overview"
        description="Inspect the geographic spread of recent incidents and filter the map by operational status."
        actions={<ConnectionBadge state={realtimeState} />}
      />

      <div className="panel flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <label className="block max-w-xs">
          <span className="label-text">Status filter</span>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(event) => {
              const nextStatus = event.target.value;
              setStatusFilter(nextStatus);
              loadReports(nextStatus);
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </label>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Showing up to 100 recent reports for map performance on free-tier hosting.
        </div>
      </div>

      {loading ? (
        <div className="panel space-y-3">
          <Loader label="Loading map..." />
          {wakeupHint ? (
            <p className="text-sm text-amber-700">
              Server waking up on Render free tier. Map data will appear once the backend resumes.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <div className="panel text-sm text-rose-700">{error}</div> : null}

      {!loading && !error && !reports.length ? (
        <EmptyState
          title="No reports to map"
          description="Once incidents are reported, they will be plotted here for admin review."
        />
      ) : null}

      {!loading && reports.length ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="panel">
            <ReportMap reports={reports} height="560px" />
          </div>
          <div className="panel">
            <h2 className="text-xl font-semibold text-slate-950">Recent plotted incidents</h2>
            <div className="mt-4 space-y-3">
              {reports.slice(0, 8).map((report) => (
                <div key={report.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="font-semibold text-slate-900">{report.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{report.description}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-ember">
                    {report.status.replaceAll("_", " ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
