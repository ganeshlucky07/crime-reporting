import { REPORT_STATUSES } from "../lib/constants";
import { formatCoordinates, formatDateTime } from "../lib/format";
import { toMediaUrl } from "../lib/media";
import Button from "./Button";
import StatusBadge from "./StatusBadge";

export default function ReportsTable({
  reports,
  isAdmin = false,
  updatingId,
  onStatusChange,
  onUserEdit,
  onUserDelete,
  deletingId
}) {
  const showUserActions = !isAdmin && (onUserEdit || onUserDelete);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-panel">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="table-head">Report</th>
              <th className="table-head">Location</th>
              <th className="table-head">Created</th>
              {isAdmin ? <th className="table-head">Reporter</th> : null}
              <th className="table-head">Status</th>
              {isAdmin ? <th className="table-head text-right">Status Control</th> : null}
              {showUserActions ? <th className="table-head text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="table-cell">
                  <p className="font-semibold text-slate-900">{report.title}</p>
                  <p className="mt-1 max-w-lg text-sm text-slate-500">{report.description}</p>
                  {(report.imageUrls?.length || report.videoUrls?.length) ? (
                    <div className="mt-3 space-y-3">
                      {report.imageUrls?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {report.imageUrls.map((imageUrl, index) => (
                            <a
                              key={`${report.id}-image-${index}`}
                              href={toMediaUrl(imageUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={toMediaUrl(imageUrl)}
                                alt={`Report media ${index + 1}`}
                                className="h-20 w-28 rounded-xl border border-slate-200 object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}

                      {report.videoUrls?.length ? (
                        <div className="space-y-2">
                          {report.videoUrls.map((videoUrl, index) => (
                            <video
                              key={`${report.id}-video-${index}`}
                              controls
                              preload="metadata"
                              className="h-28 w-full max-w-xs rounded-xl border border-slate-200 bg-black"
                            >
                              <source src={toMediaUrl(videoUrl)} />
                            </video>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </td>
                <td className="table-cell text-sm text-slate-600">
                  {formatCoordinates(report.latitude, report.longitude)}
                </td>
                <td className="table-cell text-sm text-slate-600">{formatDateTime(report.createdAt)}</td>
                {isAdmin ? (
                  <td className="table-cell text-sm text-slate-600">
                    <p>{report.reporterName}</p>
                    <p className="text-xs text-slate-400">{report.reporterEmail}</p>
                  </td>
                ) : null}
                <td className="table-cell">
                  <StatusBadge status={report.status} />
                </td>
                {isAdmin ? (
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        value={report.status}
                        onChange={(event) => onStatusChange(report.id, event.target.value)}
                        disabled={updatingId === report.id}
                      >
                        {REPORT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                      {updatingId === report.id ? (
                        <Button variant="ghost" disabled>
                          Saving
                        </Button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
                {showUserActions ? (
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        disabled={report.status !== "PENDING"}
                        onClick={() => onUserEdit?.(report)}
                        title={report.status !== "PENDING" ? "Only pending reports can be edited." : "Edit report"}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={deletingId === report.id || report.status !== "PENDING"}
                        onClick={() => onUserDelete?.(report)}
                        title={report.status !== "PENDING" ? "Only pending reports can be deleted." : "Delete report"}
                      >
                        {deletingId === report.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
