import api from "./api";
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// Get business settings
export const getBusinessSettings = () =>
  api.get(`/settings`, {
    headers: getAuthHeaders(),
  });

// Save or update business settings
export const saveBusinessSettings = (
  tax_enabled: boolean,
  tax_rate: number,
  debt_threshold: number
) =>
  api.post(
    `/settings`,
    {
      tax_enabled,
      tax_rate,
      debt_threshold,
    },
    {
      headers: getAuthHeaders(),
    }
  );