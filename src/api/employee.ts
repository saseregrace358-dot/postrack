import api from "./api";
console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

export const getEmployees = () =>
  api.get("/employees/");

export const createEmployee = (data: any) =>
  api.post("/employees/", data);

export const updateEmployee = (
  id: string | number,
  data: any
) =>
  api.put(`/employees/${id}`, data);

export const deleteEmployee = (
  id: string | number
) =>
  api.delete(`/employees/${id}`);

  export const employeeLogin = (data: any) =>
  api.post("/employees/login", data);