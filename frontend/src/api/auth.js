import { apiRequest } from "./http";

export async function registerUser(payload) {
  const response = await apiRequest({
    method: "post",
    url: "/api/auth/register",
    data: payload
  });

  return response.data;
}

export async function loginUser(payload) {
  const response = await apiRequest({
    method: "post",
    url: "/api/auth/login",
    data: payload
  });

  return response.data;
}

export async function loginPoliceUser(payload) {
  const response = await apiRequest({
    method: "post",
    url: "/api/auth/police/login",
    data: payload
  });

  return response.data;
}
