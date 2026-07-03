import api from "./api";

export const registerUser = (data: any) =>
  api.post("/auth/register", data);

export const loginUser = (data: any) =>
  api.post("/auth/login", data);

export const forgotPassword = (email: string) =>
  api.post("/auth/forgot-password", { email });

export const resetPassword = (
  token: string,
  new_password: string
) =>
  api.post("/auth/reset-password", {
    token,
    new_password,
  });