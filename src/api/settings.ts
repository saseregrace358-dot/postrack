import api from "./api";


// Get business settings
export const getBusinessSettings = () =>
  api.get("/settings/");

export const saveBusinessSettings = (
  tax_enabled: boolean,
  tax_rate: number,
  debt_threshold: number
) =>
  api.post("/settings/", {
    tax_enabled,
    tax_rate,
    debt_threshold,
  });