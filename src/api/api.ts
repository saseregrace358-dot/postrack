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
      "401:",
      error.config?.url,
      error.response?.status
    );

    // Don't logout yet
    return Promise.reject(error);
  }
);