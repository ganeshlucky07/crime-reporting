import axios from "axios";
import { API_BASE_URL } from "../lib/constants";
import { getStoredToken } from "../lib/storage";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function pingServer() {
  return api.get("/api/public/health", {
    timeout: 12000
  });
}

export async function apiRequest(config, options = {}) {
  const { retries = 2 } = options;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await api(config);
    } catch (error) {
      const status = error.response?.status;
      const retryable = !status || [502, 503, 504].includes(status);

      if (!retryable || attempt === retries) {
        throw error;
      }

      try {
        await pingServer();
      } catch {
      }

      await sleep((attempt + 1) * 1500);
      attempt += 1;
    }
  }

  throw new Error("Request failed");
}

export default api;
