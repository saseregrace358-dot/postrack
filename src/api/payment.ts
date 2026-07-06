import api from "./api";

export const initializePayment = (plan: string) =>
  api.post("/payments/initialize", {
    plan,
  });

export const verifyPayment = (reference: string) =>
  api.get(`/payments/verify/${reference}`);

export const getSubscription = () =>
  api.get("/payments/subscription");

export const cancelSubscription = () =>
  api.post("/payments/cancel");