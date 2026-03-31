import { apiRequest } from "./http";

export async function createReport(payload) {
  const formData = new FormData();
  const reportPayload = {
    title: payload.title,
    description: payload.description,
    latitude: payload.latitude,
    longitude: payload.longitude
  };

  formData.append(
    "report",
    new Blob([JSON.stringify(reportPayload)], {
      type: "application/json"
    })
  );

  (payload.mediaFiles || []).forEach((file) => {
    formData.append("mediaFiles", file);
  });

  const response = await apiRequest({
    method: "post",
    url: "/api/reports",
    data: formData
  });

  return response.data;
}

export async function getMyReports(params) {
  const response = await apiRequest({
    method: "get",
    url: "/api/reports/my",
    params
  });

  return response.data;
}

export async function getAllReports(params) {
  const response = await apiRequest({
    method: "get",
    url: "/api/reports",
    params
  });

  return response.data;
}

export async function updateReportStatus(id, status) {
  const response = await apiRequest({
    method: "put",
    url: `/api/reports/${id}/status`,
    data: { status }
  });

  return response.data;
}

export async function updateMyReport(id, payload) {
  const response = await apiRequest({
    method: "put",
    url: `/api/reports/my/${id}`,
    data: payload
  });

  return response.data;
}

export async function deleteMyReport(id) {
  await apiRequest({
    method: "delete",
    url: `/api/reports/my/${id}`
  });
}
