import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export const getProducts = () => api.get("/products");


export const createProduct = (data: any) =>
  api.post("/products", data);
export const updateProductApi = (id: number, data: any) => {
  return api.put(`/products/${id}`, data);
};
export const updateProductStockApi = (id: number, stock: number) =>
  api.patch(`/products/${id}/stock`, { stock });

export const createSaleApi = (data: any) =>
  api.post("/sales", data);

export const getSalesApi = () =>
  api.get("/sales");

export const addPaymentApi = (
  saleId: string,
  payment: any
) => api.patch(`/sales/${saleId}/payment`, payment);