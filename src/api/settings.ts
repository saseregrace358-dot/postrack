import axios from "axios";

const BASE_URL = "https://postrack.onrender.com";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// Get business settings
export const getBusinessSettings = () =>
  axios.get(`${BASE_URL}/settings`, {
    headers: getAuthHeaders(),
  });

// Save or update business settings
export const saveBusinessSettings = (
  tax_enabled: boolean,
  tax_rate: number,
  debt_threshold: number
) =>
  axios.post(
    `${BASE_URL}/settings`,
    {
      tax_enabled,
      tax_rate,
      debt_threshold,
    },
    {
      headers: getAuthHeaders(),
    }
  );