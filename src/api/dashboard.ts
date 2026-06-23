import axios from "axios";

const BASE_URL = "https://postrack.onrender.com";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getSalesApi = () =>
  axios.get(`${BASE_URL}/sales/`, {
    headers: getAuthHeaders(),
  });

export const getProductsApi = () =>
  axios.get(`${BASE_URL}/products/`, {
    headers: getAuthHeaders(),
  });