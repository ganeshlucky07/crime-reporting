import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { buildPoliceAiInsights } from "../../lib/aiInsights";
import { getErrorMessage } from "../../lib/errors";
import { formatCoordinates, toIsoRange } from "../../lib/format";

const URL_PATTERN = /https?:\/\/[^\s]+/g;

function renderAlertMessageWithLinks(message, variant) {
  if (!message) {
    return "Support message received.";
  }

  const matches = [...message.matchAll(URL_PATTERN)];
  if (!matches.length) {
    return message;
  }

  const nodes = [];
  let cursor = 0;
  const linkClassName = variant === "panic"
    ? "font-semibold underline underline-offset-2 hover:opacity-80"
    : "font-semibold underline underline-offset-2 text-sky-700 hover:text-sky-800";

  matches.forEach((match, index) => {
    const rawUrl = match[0];
    const matchStart = match.index ?? 0;
    const matchEnd = matchStart + rawUrl.length;

    if (matchStart > cursor) {
      nodes.push(message.slice(cursor, matchStart));
    }

    const normalizedUrl = rawUrl.replace(/[),.;!?]+$/, "");
    const trailingText = rawUrl.slice(normalizedUrl.length);

    nodes.push(
      <a
        key={`alert-link-${index}-${normalizedUrl}`}
        href={normalizedUrl}
        target="_blank"
        rel="noreferrer"
        className={linkClassName}
      >
        {normalizedUrl}
      </a>
    );

    if (trailingText) {
      nodes.push(trailingText);
    }

    cursor = matchEnd;
  });

  if (cursor < message.length) {
    nodes.push(message.slice(cursor));
  }

  return nodes;
}

export default function PoliceVerificationPage() {
  const navigate = useNavigate();
  const { token, logout, user } = useAuth();
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
  const [supportAlerts, setSupportAlerts] = useState([]);
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
      if ([401, 403].includes(requestError.response?.status)) {
        logout();
        navigate("/police/login", { replace: true });
        return;
      }
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

  const supportRealtimeState = useRealtimeChannel({
    enabled: Boolean(token),
    token,
    destination: "/topic/support/chat",
    onEvent: (event) => {
      if (!event || typeof event !== "object") {
        return;
      }

      const targetRole = event.targetRole;
      const targetEmail = event.targetEmail;
      const isPoliceTarget = targetRole === "POLICE" || targetRole === "ALL";
      const isDirectTarget = Boolean(targetEmail) && targetEmail === user?.email;
      if (!isPoliceTarget && !isDirectTarget) {
        return;
      }

      setSupportAlerts((current) => [event, ...current].slice(0, 8));

      const senderLabel = event.senderName || event.senderEmail || "Citizen";
      pushToast({
        title: event.type === "PANIC" ? "Panic alert received" : "Support message received",
        description: `${senderLabel}: ${(event.text || "").slice(0, 90)}`
      });
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
  const aiInsights = buildPoliceAiInsights(pageData.content);
  const visibleCount = pageData.content.length;
  const pendingPercent = visibleCount ? Math.round((pendingCount / visibleCount) * 100) : 0;
  const progressPercent = visibleCount ? Math.round((progressCount / visibleCount) * 100) : 0;
  const completedPercent = visibleCount ? Math.round((completedCount / visibleCount) * 100) : 0;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Police operations"
        title="All user reports and status updates"
        description="Police team can review every submitted report, verify details, and update case status."
        actions={<ConnectionBadge state={realtimeState} />}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard label="Visible reports" value={pageData.totalElements} accent="bg-sky-500" />
        <StatsCard label="Pending verification" value={pendingCount} accent="bg-slate-500" />
        <StatsCard label="In progress" value={progressCount} accent="bg-amber-500" />
        <StatsCard label="Completed" value={completedCount} accent="bg-emerald-500" />
      </div>

      <div className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Status bar (visible reports)</p>
          <p className="text-xs text-slate-600">
            Pending {pendingPercent}% | In progress {progressPercent}% | Completed {completedPercent}%
          </p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="flex h-full w-full">
            <div className="bg-slate-500" style={{ width: `${pendingPercent}%` }} />
            <div className="bg-amber-500" style={{ width: `${progressPercent}%` }} />
            <div className="bg-emerald-500" style={{ width: `${completedPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Safety alerts and citizen chat</p>
          <ConnectionBadge state={supportRealtimeState} />
        </div>
        {supportAlerts.length ? (
          <div className="max-h-44 space-y-2 overflow-y-auto">
            {supportAlerts.map((alert, index) => (
              <div
                key={`${alert.id || alert.timestamp || "support"}-${index}`}
                className={`rounded-xl border px-3 py-3 text-xs ${
                  alert.type === "PANIC"
                    ? "border-rose-200 bg-rose-50 text-rose-900"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <p className="font-semibold">
                  {(alert.senderName || alert.senderEmail || "Citizen")} ({alert.senderRole || "USER"})
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words">
                  {renderAlertMessageWithLinks(
                    alert.text || "Support message received.",
                    alert.type === "PANIC" ? "panic" : "default"
                  )}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
            No incoming panic/chat alerts yet.
          </p>
        )}
      </div>

      <div className="panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">AI verification assistant</h2>
          <p className="text-xs text-slate-500">Priority and duplicate hints from visible reports</p>
        </div>

        {aiInsights.recommendedActions.length ? (
          <div className="space-y-2">
            {aiInsights.recommendedActions.map((action) => (
              <div
                key={`ai-action-${action.reportId}`}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{action.title}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {action.currentStatus.replaceAll("_", " ")} {"->"} {action.recommendedStatus.replaceAll("_", " ")} | Priority score{" "}
                    {action.priorityScore}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{action.reason}</p>
                </div>
                <Button
                  variant="ghost"
                  disabled={updatingId === action.reportId}
                  onClick={() => handleStatusChange(action.reportId, action.recommendedStatus)}
                >
                  {updatingId === action.reportId
                    ? "Applying..."
                    : `Apply ${action.recommendedStatus.replaceAll("_", " ")}`}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
            No urgent AI status recommendations in the current filtered view.
          </p>
        )}

        {aiInsights.hotspots.length ? (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Hotspot hints</p>
            {aiInsights.hotspots.map((spot) => (
              <p key={`hotspot-${spot.key}`} className="mt-2 text-xs text-slate-700">
                {spot.count} reports near {formatCoordinates(spot.latitude, spot.longitude)}
              </p>
            ))}
          </div>
        ) : null}

        {aiInsights.duplicates.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Possible duplicates</p>
            {aiInsights.duplicates.map((item) => (
              <p key={item.pairKey} className="mt-2 text-xs text-amber-900">
                {item.firstTitle} | {item.secondTitle} ({item.distanceKm} km, {item.similarityPercent}% text match)
              </p>
            ))}
          </div>
        ) : null}
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
          <Loader label="Loading verification queue..." />
          {wakeupHint ? (
            <p className="text-sm text-amber-700">
              Server waking up on Render free tier. First response may take a few extra seconds.
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
          description="Try changing filters or wait for new reports."
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
