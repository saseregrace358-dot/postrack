// api/dashboard.ts
import axios from "axios";

const BASE_URL = "http://localhost:8000";

export const getSalesApi = () =>
  axios.get(`${BASE_URL}/sales/`);

export const getProductsApi = () =>
  axios.get(`${BASE_URL}/products/`);