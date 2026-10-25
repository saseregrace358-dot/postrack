
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Read the token from either storage.
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handle expired or invalid sessions globally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url ?? "");

    // Do not log out because a login or registration request failed.
    const isAuthRequest =
      /\/(login|register|forgot-password|reset-password)(\/|$|\?)/i.test(
        requestUrl
      );

    if (status === 401 && !isAuthRequest) {
      // Prevent repeated logout handling from concurrent API requests.
      if (localStorage.getItem("token") || sessionStorage.getItem("token")) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");

        localStorage.removeItem("user");
        sessionStorage.removeItem("user");

        localStorage.removeItem("role");
        sessionStorage.removeItem("role");

        localStorage.removeItem("permissions");
        sessionStorage.removeItem("permissions");

        // Notify App.tsx to update its authentication state.
        window.dispatchEvent(new Event("session-expired"));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
