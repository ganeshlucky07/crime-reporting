export function formatDateTime(value) {
  if (!value) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function humanizeStatus(status) {
  return status.replaceAll("_", " ");
}

export function formatCoordinates(latitude, longitude) {
  return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
}

export function statusTone(status) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-700 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function toIsoRange(dateValue, boundary) {
  if (!dateValue) {
    return undefined;
  }

  const suffix = boundary === "end" ? "T23:59:59.999Z" : "T00:00:00.000Z";
  return `${dateValue}${suffix}`;
}
