import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach the JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Automatically handle expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log(
      error.config?.url,
      error.response?.status
    );

    if (
      error.response?.status === 401 &&
      error.config?.url?.includes("/auth")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
    }

    return Promise.reject(error);
  }
);
export default api;