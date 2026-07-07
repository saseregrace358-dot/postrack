import api from "./api";

// Get all available subscription plans
export const getPlans = () => {
  return api.get("/subscriptions/plans");
};

// Get current business subscription
export const getMySubscription = () => {
  return api.get("/subscriptions/me");
};

// Initialize Paystack payment
export const initializePayment = (plan: string) => {
  return api.post("/payments/initialize", {
    plan,
  });
};

// Verify payment after Paystack redirects back
export const verifyPayment = (reference: string) => {
  return api.get(`/payments/verify/${reference}`);
};

// Cancel subscription
export const cancelSubscription = () => {
  return api.post("/payments/cancel");
};