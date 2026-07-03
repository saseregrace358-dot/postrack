import api from "./api";
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const exportProductsCsv = () =>
  api.get(`/export/products/csv`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportProductsPdf = () =>
  api.get(`/export/products/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportSalesCsv = () =>
  api.get(`/export/sales/csv`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportSalesPdf = () =>
  api.get(`/export/sales/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportCustomersCsv = () =>
  api.get(`/export/customers/csv`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportCustomersPdf = () =>
  api.get(`/export/customers/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportDashboardPdf = () =>
  api.get(`/export/dashboard/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportDebtorsCsv = () =>
  api.get(`/export/debtors/csv`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportDebtorsPdf = () =>
  api.get(`/export/debtors/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportStaffCsv = () =>
  api.get(`/export/staff/csv`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });

export const exportStaffPdf = () =>
  api.get(`/export/staff/pdf`, {
    headers: getAuthHeaders(),
    responseType: "blob",
  });