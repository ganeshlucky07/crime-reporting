export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8080";

export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL?.replace(/\/$/, "") || API_BASE_URL;

export const DEFAULT_MAP_CENTER = [
  Number(import.meta.env.VITE_MAP_DEFAULT_LAT || 28.6139),
  Number(import.meta.env.VITE_MAP_DEFAULT_LNG || 77.209)
];

export const REPORT_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"];

export const POLICE_ROLES = ["ADMIN", "POLICE"];

export function isPoliceRole(role) {
  return POLICE_ROLES.includes(role);
}

export const ROLE_HOME = {
  USER: "/my-reports",
  ADMIN: "/police/verification",
  POLICE: "/police/verification"
};
