import api from "./api";
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getSalesApi = () =>
  api.get(`/sales`, {
    headers: getAuthHeaders(),
  });

export const getProductsApi = () =>
  api.get(`/products`, {
    headers: getAuthHeaders(),
  });