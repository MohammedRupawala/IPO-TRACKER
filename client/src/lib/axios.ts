import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if a refresh is already in flight to avoid multiple simultaneous refresh calls
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// ─── Response Interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const detail = error.response?.data?.detail;
    const isTokenExpired =
      error.response?.status === 401 &&
      (detail === "TOKEN_EXPIRED" ||
        (typeof detail === "object" && detail !== null && detail.code === "TOKEN_EXPIRED"));

    if (isTokenExpired && !originalRequest._retry) {
      // If a refresh is already underway, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber(() => {
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Silent token refresh — backend reads refresh_token from HttpOnly cookie
        await apiClient.post("/api/users/refresh");
        isRefreshing = false;
        onRefreshed("");
        // Replay original request
        return apiClient(originalRequest);
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];

        // Wipe auth state and redirect
        if (typeof window !== "undefined") {
          const { useAuthStore } = await import("@/store/authStore");
          useAuthStore.getState().clearAuth();
          toast.error("Session expired. Please sign in again.", {
            description: "Your session could not be refreshed.",
          });
          window.location.href = "/login";
        }

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Error Message Extractor ──────────────────────────────────────────────────
export function extractErrorMessage(error: unknown, fallback = "An unexpected error occurred"): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.length > 0) return detail;
    if (error.response?.statusText) return error.response.statusText;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default apiClient;
