import axios from "axios";

const BASE_URL = "https://postrack.onrender.com";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const exportProductsCsv = () =>
  axios.get(`${BASE_URL}/export/products/csv`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportProductsPdf = () =>
  axios.get(`${BASE_URL}/export/products/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportSalesCsv = () =>
  axios.get(`${BASE_URL}/export/sales/csv`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportSalesPdf = () =>
  axios.get(`${BASE_URL}/export/sales/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportCustomersCsv = () =>
  axios.get(`${BASE_URL}/export/customers/csv`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportCustomersPdf = () =>
  axios.get(`${BASE_URL}/export/customers/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportDashboardPdf = () =>
  axios.get(`${BASE_URL}/export/dashboard/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportDebtorsCsv = () =>
  axios.get(`${BASE_URL}/export/debtors/csv`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportDebtorsPdf = () =>
  axios.get(`${BASE_URL}/export/debtors/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportStaffCsv = () =>
  axios.get(`${BASE_URL}/export/staff/csv`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportStaffPdf = () =>
  axios.get(`${BASE_URL}/export/staff/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });