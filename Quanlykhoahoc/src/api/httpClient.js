import axios from "axios";

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE?.trim().replace(/\/+$/, "") || "http://localhost:8081";

let runtimeToken = null;

const STORAGE_KEY = "auth.session";

const readStoredToken = () => {
  if (runtimeToken) return runtimeToken;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.accessToken || parsed?.token || null;
  } catch {
    return null;
  }
};

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const setAuthToken = (token) => {
  runtimeToken = token || null;
  if (runtimeToken) {
    httpClient.defaults.headers.common.Authorization = `Bearer ${runtimeToken}`;
  } else {
    delete httpClient.defaults.headers.common.Authorization;
  }
};

httpClient.interceptors.request.use(
  (config) => {
    const token = readStoredToken();
    if (!token) return config;
    const headers = config.headers ?? {};
    if (typeof headers.set === "function") {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      headers.Authorization = `Bearer ${token}`;
    }
    config.headers = headers;
    return config;
  },
  (error) => Promise.reject(error),
);

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("auth:unauthorized", {
            detail: { status, url: error?.config?.url },
          }),
        );
      }
    }
    return Promise.reject(error);
  },
);

export default httpClient;
