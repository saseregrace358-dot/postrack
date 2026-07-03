import api from "./api";

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

export const getProducts = () => api.get("/products");

export const createProduct = (data: any) =>
  api.post("/products", data);

export const updateProductApi = (id: number, data: any) =>
  api.put(`/products/${id}`, data);

export const updateProductStockApi = (id: number, stock: number) =>
  api.patch(`/products/${id}/stock`, { stock });

export const createSaleApi = (data: any) =>
  api.post("/sales", data);

export const getSalesApi = () =>
  api.get("/sales");

export const addPaymentApi = (saleId: string, payment: any) =>
  api.patch(`/sales/${saleId}/payment`, payment);