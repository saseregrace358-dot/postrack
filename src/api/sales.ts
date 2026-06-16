import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export const createSaleApi = (data: any) =>
  api.post("/sales", data);

export const getSalesApi = () =>
  api.get("/sales");

export const addPaymentApi = (saleId: string, payment: any) =>
  api.patch(`/sales/${saleId}/payment`, payment);