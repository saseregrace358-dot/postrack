import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});
export const createSaleApi = (data: any) =>
  api.post("/sales", data);

export const getSalesApi = () =>
  api.get("/sales");

export const addPaymentApi = (saleId: string, payment: any) =>
  api.patch(`/sales/${saleId}/payment`, payment);