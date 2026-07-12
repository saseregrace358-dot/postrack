import api from "./api";

export const registerUser = (data: any) =>
  api.post("/auth/register", data);

export const loginUser = (data: any) =>
  api.post("/auth/login", data);

export const forgotPassword = (email: string) =>
  api.post("/auth/forgot-password", {
    email,
  });

export const verifyResetCode = (
  email: string,
  code: string
) =>
  api.post("/auth/verify-reset-code", {
    email,
    code,
  });

export const resetPassword = (
  email: string,
  code: string,
  new_password: string
) =>
  api.post("/auth/reset-password", {
    email,
    code,
    new_password,
  });