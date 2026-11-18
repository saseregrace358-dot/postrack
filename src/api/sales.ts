
import api from "./api";

// Attach authentication token to requests.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// --------------------------------------------------
// Sale request types
// --------------------------------------------------

export interface SaleItemData {
  product_id: number;
  quantity: number;
}

export interface SaleData {
  items: SaleItemData[];
  amountPaid: number;
  paymentMethod: string;
}

export interface SaleQuoteData {
  items: SaleItemData[];
  amountPaid: number;
  paymentMethod: string;
}

// --------------------------------------------------
// Create sale
// --------------------------------------------------

export const createSaleApi = (data: SaleData) =>
  api.post("/sales", data);

// --------------------------------------------------
// Calculate sale quote
// Does not create a sale or change stock.
// --------------------------------------------------

export const quoteSaleApi = (data: SaleQuoteData) =>
  api.post("/sales/quote", data);

// --------------------------------------------------
// Get sales
// --------------------------------------------------

export const getSalesApi = () =>
  api.get("/sales");

// --------------------------------------------------
// Add payment to an existing sale
// --------------------------------------------------

export const addPaymentApi = (
  saleId: string,
  payment: any
) =>
  api.patch(`/sales/${saleId}/payment`, payment);

export default api;
