import { humanizeStatus, statusTone } from "../lib/format";

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${statusTone(status)}`}>
      {humanizeStatus(status)}
    </span>
  );
}
