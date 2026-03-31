import { useEffect, useState } from "react";
import { getAllReports, updateReportStatus } from "../../api/reports";
import Button from "../../components/Button";
import ConnectionBadge from "../../components/ConnectionBadge";
import EmptyState from "../../components/EmptyState";
import Loader from "../../components/Loader";
import PageHeader from "../../components/PageHeader";
import ReportsTable from "../../components/ReportsTable";
import StatsCard from "../../components/StatsCard";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeChannel } from "../../hooks/useRealtimeChannel";
import { useWakeupHint } from "../../hooks/useWakeupHint";
import { getErrorMessage } from "../../lib/errors";
import { toIsoRange } from "../../lib/format";

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const { pushToast } = useToast();
  const [filters, setFilters] = useState({
    status: "",
    from: "",
    to: ""
  });
  const [pageData, setPageData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
    page: 0,
    size: 10
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const wakeupHint = useWakeupHint(loading);

  async function loadReports(page = 0, nextFilters = filters) {
    setLoading(true);
    setError("");

    try {
      const data = await getAllReports({
        page,
        size: 10,
        status: nextFilters.status || undefined,
        from: toIsoRange(nextFilters.from, "start"),
        to: toIsoRange(nextFilters.to, "end")
      });
      setPageData(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load reports right now."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports(0, filters);
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
        title: event.type === "NEW_REPORT" ? "New report received" : "Report updated",
        description: event.report.title
      });

      loadReports(0, filters);
    }
  });

  async function handleStatusChange(reportId, status) {
    setUpdatingId(reportId);

    try {
      const updated = await updateReportStatus(reportId, status);
      setPageData((current) => ({
        ...current,
        content: current.content.map((report) =>
          report.id === updated.id ? updated : report
        )
      }));
      pushToast({
        title: "Status saved",
        description: `${updated.title} marked as ${updated.status.replaceAll("_", " ")}.`
      });
    } catch (requestError) {
      pushToast({
        title: "Status update failed",
        description: getErrorMessage(requestError, "Unable to save the new status.")
      });
    } finally {
      setUpdatingId("");
    }
  }

  function handleFilterChange(event) {
    setFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  const pendingCount = pageData.content.filter((report) => report.status === "PENDING").length;
  const progressCount = pageData.content.filter((report) => report.status === "IN_PROGRESS").length;
  const completedCount = pageData.content.filter((report) => report.status === "COMPLETED").length;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Admin operations"
        title="Incident command dashboard"
        description="Monitor all submitted reports, filter the timeline, and update case statuses with realtime visibility."
        actions={<ConnectionBadge state={realtimeState} />}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard label="Visible reports" value={pageData.totalElements} accent="bg-sky-500" />
        <StatsCard label="Pending" value={pendingCount} accent="bg-slate-500" />
        <StatsCard label="In progress" value={progressCount} accent="bg-amber-500" />
        <StatsCard label="Completed" value={completedCount} accent="bg-emerald-500" />
      </div>

      <div className="panel grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        <label className="block">
          <span className="label-text">Status</span>
          <select
            className="input-field"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </label>
        <label className="block">
          <span className="label-text">From date</span>
          <input className="input-field" type="date" name="from" value={filters.from} onChange={handleFilterChange} />
        </label>
        <label className="block">
          <span className="label-text">To date</span>
          <input className="input-field" type="date" name="to" value={filters.to} onChange={handleFilterChange} />
        </label>
        <div className="flex items-end gap-3">
          <Button onClick={() => loadReports(0, filters)}>Apply filters</Button>
          <Button
            variant="ghost"
            onClick={() => {
              const reset = { status: "", from: "", to: "" };
              setFilters(reset);
              loadReports(0, reset);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="panel space-y-3">
          <Loader label="Loading admin dashboard..." />
          {wakeupHint ? (
            <p className="text-sm text-amber-700">
              Server waking up on Render free tier. The first admin fetch can take longer after idle time.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="panel space-y-4">
          <p className="text-sm text-rose-700">{error}</p>
          <Button onClick={() => loadReports(pageData.page, filters)}>Retry</Button>
        </div>
      ) : null}

      {!loading && !error && !pageData.content.length ? (
        <EmptyState
          title="No matching reports"
          description="Try widening the filters or wait for a new submission to appear in realtime."
        />
      ) : null}

      {!loading && pageData.content.length ? (
        <>
          <ReportsTable
            reports={pageData.content}
            isAdmin
            updatingId={updatingId}
            onStatusChange={handleStatusChange}
          />

          <div className="panel flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              Page {pageData.page + 1} of {Math.max(pageData.totalPages, 1)}
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                disabled={pageData.page === 0}
                onClick={() => loadReports(pageData.page - 1, filters)}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                disabled={pageData.page + 1 >= pageData.totalPages}
                onClick={() => loadReports(pageData.page + 1, filters)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
