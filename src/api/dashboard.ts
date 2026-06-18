// api/dashboard.ts
import axios from "axios";

const BASE_URL = "https://postrack.onrender.com";

export const getSalesApi = () =>
  axios.get(`${BASE_URL}/sales/`);

export const getProductsApi = () =>
  axios.get(`${BASE_URL}/products/`);