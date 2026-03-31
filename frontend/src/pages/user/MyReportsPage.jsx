import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteMyReport, getMyReports, updateMyReport } from "../../api/reports";
import Button from "../../components/Button";
import ConnectionBadge from "../../components/ConnectionBadge";
import EmptyState from "../../components/EmptyState";
import FormField from "../../components/FormField";
import Loader from "../../components/Loader";
import PageHeader from "../../components/PageHeader";
import ReportMap from "../../components/ReportMap";
import ReportsTable from "../../components/ReportsTable";
import StatsCard from "../../components/StatsCard";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeChannel } from "../../hooks/useRealtimeChannel";
import { useWakeupHint } from "../../hooks/useWakeupHint";
import { buildCitizenAiInsights } from "../../lib/aiInsights";
import { getErrorMessage } from "../../lib/errors";

export default function MyReportsPage() {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const { pushToast } = useToast();
  const [pageData, setPageData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
    page: 0,
    size: 10
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingReport, setEditingReport] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    latitude: "",
    longitude: ""
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const wakeupHint = useWakeupHint(loading);

  async function loadReports(page = 0) {
    setLoading(true);
    setError("");

    try {
      const data = await getMyReports({ page, size: 10 });
      setPageData(data);
    } catch (requestError) {
      const status = requestError.response?.status;
      if (status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (status === 403 && user?.role && user.role !== "USER") {
        navigate("/police/verification", { replace: true });
        return;
      }
      setError(getErrorMessage(requestError, "Unable to load your reports right now."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports(0);
  }, []);

  const realtimeState = useRealtimeChannel({
    enabled: Boolean(token),
    token,
    destination: "/user/queue/reports",
    onEvent: (event) => {
      if (!event.report) {
        return;
      }

      setPageData((current) => ({
        ...current,
        content: current.content.map((report) =>
          report.id === event.report.id ? event.report : report
        )
      }));

      pushToast({
        title: "Status updated",
        description: `${event.report.title} is now ${event.report.status.replaceAll("_", " ")}.`
      });
    }
  });

  const pendingCount = pageData.content.filter((report) => report.status === "PENDING").length;
  const activeCount = pageData.content.filter((report) => report.status === "IN_PROGRESS").length;
  const completedCount = pageData.content.filter((report) => report.status === "COMPLETED").length;
  const aiInsights = buildCitizenAiInsights(pageData.content);

  function openEditReport(report) {
    setEditingReport(report);
    setEditForm({
      title: report.title,
      description: report.description,
      latitude: String(report.latitude),
      longitude: String(report.longitude)
    });
  }

  function cancelEditReport() {
    setEditingReport(null);
    setEditForm({
      title: "",
      description: "",
      latitude: "",
      longitude: ""
    });
  }

  function handleEditChange(event) {
    setEditForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function saveEditedReport(event) {
    event.preventDefault();
    if (!editingReport) {
      return;
    }

    const latitude = Number(editForm.latitude);
    const longitude = Number(editForm.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      pushToast({
        title: "Invalid latitude",
        description: "Latitude must be between -90 and 90."
      });
      return;
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      pushToast({
        title: "Invalid longitude",
        description: "Longitude must be between -180 and 180."
      });
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await updateMyReport(editingReport.id, {
        title: editForm.title,
        description: editForm.description,
        latitude,
        longitude
      });
      setPageData((current) => ({
        ...current,
        content: current.content.map((report) => (report.id === updated.id ? updated : report))
      }));
      pushToast({
        title: "Report updated",
        description: "Your report changes were saved."
      });
      cancelEditReport();
    } catch (requestError) {
      pushToast({
        title: "Unable to update",
        description: getErrorMessage(requestError, "Could not save report changes.")
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteReport(report) {
    const confirmed = window.confirm("Delete this report permanently?");
    if (!confirmed) {
      return;
    }

    setDeletingId(report.id);
    try {
      await deleteMyReport(report.id);
      if (editingReport?.id === report.id) {
        cancelEditReport();
      }

      pushToast({
        title: "Report deleted",
        description: "The report was removed successfully."
      });

      const nextPage = pageData.content.length === 1 && pageData.page > 0
        ? pageData.page - 1
        : pageData.page;
      await loadReports(nextPage);
    } catch (requestError) {
      pushToast({
        title: "Unable to delete",
        description: getErrorMessage(requestError, "Could not delete this report.")
      });
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Case tracker"
        title="My reports"
        description="Track every submitted report, watch status changes in realtime, and review locations on the map."
        actions={<ConnectionBadge state={realtimeState} />}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard label="Total visible reports" value={pageData.totalElements} accent="bg-sky-500" />
        <StatsCard label="Pending" value={pendingCount} accent="bg-slate-500" />
        <StatsCard label="In progress" value={activeCount} accent="bg-amber-500" />
        <StatsCard label="Completed" value={completedCount} accent="bg-emerald-500" />
      </div>

      {!loading && !error && pageData.content.length ? (
        <div className="panel space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">AI case assistant</h2>
            <p className="text-xs text-slate-500">Lightweight on-device insights</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Open high priority</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{aiInsights.openCritical}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Pending over 12h</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{aiInsights.pendingLong}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Open with no media</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{aiInsights.evidenceGaps}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700">
            {aiInsights.advice.map((message, index) => (
              <p key={`ai-advice-${index}`}>{message}</p>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="panel space-y-3">
          <Loader label="Loading your reports..." />
          {wakeupHint ? (
            <p className="text-sm text-amber-700">
              Server waking up on Render free tier. This may take a few extra seconds.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="panel space-y-4">
          <p className="text-sm text-rose-700">{error}</p>
          <Button onClick={() => loadReports(pageData.page)}>Retry</Button>
        </div>
      ) : null}

      {!loading && !error && !pageData.content.length ? (
        <EmptyState
          title="No reports yet"
          description="Once you submit your first incident, it will appear here with realtime status tracking."
        />
      ) : null}

      {!loading && pageData.content.length ? (
        <>
          {editingReport ? (
            <form className="panel space-y-4" onSubmit={saveEditedReport}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-950">Edit pending report</h2>
                <p className="text-xs text-slate-500">Report ID: {editingReport.id}</p>
              </div>

              <FormField
                label="Incident title"
                name="title"
                value={editForm.title}
                onChange={handleEditChange}
                required
                maxLength={120}
              />
              <FormField
                as="textarea"
                rows="4"
                label="Description"
                name="description"
                value={editForm.description}
                onChange={handleEditChange}
                required
                maxLength={1000}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={editForm.latitude}
                  onChange={handleEditChange}
                  required
                />
                <FormField
                  label="Longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={editForm.longitude}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save changes"}
                </Button>
                <Button type="button" variant="ghost" onClick={cancelEditReport} disabled={savingEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          <ReportsTable
            reports={pageData.content}
            onUserEdit={openEditReport}
            onUserDelete={handleDeleteReport}
            deletingId={deletingId}
          />

          <p className="text-xs text-slate-500">
            Edit and delete are available only for pending reports.
          </p>

          <div className="panel">
            <h2 className="text-xl font-semibold text-slate-950">Map overview</h2>
            <p className="mt-2 text-sm text-slate-600">Review the pinned positions of your latest submitted reports.</p>
            <div className="mt-4">
              <ReportMap reports={pageData.content} />
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
