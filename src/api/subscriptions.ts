
import api from "./api";

export const getPlans = () => api.get("/subscriptions/plans");

export const getMySubscription = () => api.get("/subscriptions/me");

export interface PaymentRequest {
  plan: string;
  billing_interval: "monthly" | "yearly";
  payment_currency: "NGN";
}

export const initializePayment = (payload: PaymentRequest) =>
  api.post("/payments/initialize", payload);

export const verifyPayment = (reference: string) =>
  api.get(`/payments/verify/${reference}`);

export const cancelSubscription = () =>
  api.post("/payments/cancel");
