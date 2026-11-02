
import api from "./api";

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Sale request types
export interface SaleItemData {
  product_id: number;
  quantity: number;
}

export interface SaleData {
  items: SaleItemData[];
  amountPaid: number;
  paymentMethod: string;
}

// Create sale
export const createSaleApi = (data: SaleData) =>
  api.post("/sales", data);

// Get sales
export const getSalesApi = () =>
  api.get("/sales");

// Add payment
export const addPaymentApi = (saleId: string, payment: any) =>
  api.patch(`/sales/${saleId}/payment`, payment);

export default api;
