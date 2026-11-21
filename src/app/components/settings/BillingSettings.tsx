
import { useEffect, useState } from "react";

import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

import {
  getPlans,
  getMySubscription,
  initializePayment,
} from "../../../api/subscriptions";

interface Plan {
  id: number;
  name: string;
  description?: string;

  monthly_price_ngn: number;
  monthly_price_usd: number;

  yearly_price_ngn: number;
  yearly_price_usd: number;

  duration_value: number;
  duration_unit: "days" | "months" | "years";

  max_products: number;
  max_employees: number;
  max_sales: number;

  ai_enabled: boolean;
  reports_enabled: boolean;
  export_enabled: boolean;
  notifications_enabled: boolean;
  custom_pricing: boolean;
  active: boolean;
}

interface Subscription {
  id?: number;
  plan_name?: string;
  status?: string;
  expires_at?: string | null;
  started_at?: string | null;
  billing_interval?: string | null;
  payment_currency?: string | null;
  amount_paid?: number | string | null;
  plan?: Plan | null;
}

interface Props {
  onBack: () => void;
}

type BillingInterval = "monthly" | "yearly";
type PaymentCurrency = "NGN" | "USD";

function formatPrice(
  amount: number,
  currency: PaymentCurrency
) {
  return new Intl.NumberFormat(
    currency === "NGN" ? "en-NG" : "en-US",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(Number(amount || 0));
}

function formatLimit(value: number | null | undefined) {
  if (value == null || value === -1) return "Unlimited";

  return Number(value).toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString();
}

function getStatusLabel(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "Active";
    case "trialing":
      return "Free Trial";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return status || "Unknown";
  }
}

function Feature({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle size={18} className="shrink-0 text-green-600" />
      <span>{label}</span>
    </div>
  );
}

export default function BillingSettings({ onBack }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");

  const [paymentCurrency, setPaymentCurrency] =
    useState<PaymentCurrency>("NGN");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingPlan, setPayingPlan] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [plansResult, subscriptionResult] =
        await Promise.allSettled([
          getPlans(),
          getMySubscription(),
        ]);

      if (plansResult.status === "fulfilled") {
        const returnedPlans = plansResult.value.data;

        setPlans(
          Array.isArray(returnedPlans)
            ? returnedPlans.filter(
                (plan: Plan) => plan.active !== false
              )
            : []
        );
      } else {
        setError("Unable to load subscription plans.");
      }

      if (subscriptionResult.status === "fulfilled") {
        setSubscription(subscriptionResult.value.data || null);
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error("Billing information error:", err);
      setError("Unable to load billing information.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Returns the actual amount charged for the selected interval.
  function getBillingTotal(plan: Plan): number {
    if (paymentCurrency === "USD") {
      return billingInterval === "yearly"
        ? Number(plan.yearly_price_usd || 0)
        : Number(plan.monthly_price_usd || 0);
    }

    return billingInterval === "yearly"
      ? Number(plan.yearly_price_ngn || 0)
      : Number(plan.monthly_price_ngn || 0);
  }

  // Returns the displayed monthly equivalent.
  function getDisplayedPrice(plan: Plan): number {
    const total = getBillingTotal(plan);

    return billingInterval === "yearly"
      ? total / 12
      : total;
  }

  async function subscribe(plan: Plan) {
    if (plan.custom_pricing) return;

    if (getBillingTotal(plan) <= 0) {
      alert("This plan is not available for paid checkout.");
      return;
    }

    const paymentKey =
      `${plan.id}-${billingInterval}-${paymentCurrency}`;

    try {
      setPayingPlan(paymentKey);

      const response = await initializePayment({
        plan: plan.name.toLowerCase(),
        billing_interval: billingInterval,
        payment_currency: paymentCurrency,
      });

      const authorizationUrl =
        response.data?.authorization_url;

      if (!authorizationUrl) {
        throw new Error(
          "Payment authorization URL was not returned."
        );
      }

      window.location.href = authorizationUrl;
    } catch (err) {
      console.error("Payment initialization failed:", err);
      alert("Unable to initialize payment. Please try again.");
      setPayingPlan(null);
    }
  }

  const currentPlanName =
    subscription?.plan_name?.toLowerCase().trim() ||
    subscription?.plan?.name?.toLowerCase().trim() ||
    "";

  const expiryTime = subscription?.expires_at
    ? new Date(subscription.expires_at).getTime()
    : 0;

  const hasCurrentAccess =
    ["active", "cancelled", "trialing"].includes(
      (subscription?.status || "").toLowerCase()
    ) && expiryTime > Date.now();

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 p-10">
        <Loader2 size={22} className="animate-spin" />
        <span>Loading subscription...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="space-y-8">

        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button
              onClick={loadData}
              className="ml-auto font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Current Subscription */}
        <section className="rounded-xl border bg-blue-50 p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-xl font-bold">
            Current Subscription
          </h2>

          {subscription ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">Current Plan</p>
                <p className="font-semibold">
                  {subscription.plan_name ||
                    subscription.plan?.name ||
                    "Not available"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-semibold">
                  {getStatusLabel(subscription.status)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Expires</p>
                <p className="font-semibold">
                  {formatDate(subscription.expires_at)}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              No subscription information is currently available.
            </p>
          )}

          {subscription?.status?.toLowerCase() === "cancelled" &&
            hasCurrentAccess && (
              <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
                Your subscription is cancelled, but access continues
                until your expiry date.
              </p>
            )}

          {subscription?.status?.toLowerCase() === "expired" && (
            <p className="mt-4 text-sm text-red-600">
              Your subscription has expired. Choose a plan below
              to renew access.
            </p>
          )}
        </section>

        {/* Subscription Plans */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              Subscription Plans
            </h2>

            <p className="mt-2 text-gray-500">
              Choose the plan that suits your business.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              All plans include unlimited sales.
            </p>
          </div>

          {/* Billing interval and currency */}
          <div className="mb-6 flex flex-wrap items-center gap-3">

            <button
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-lg px-5 py-2.5 font-medium transition ${
                billingInterval === "monthly"
                  ? "bg-blue-600 text-white"
                  : "border bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"
              }`}
            >
              Monthly
            </button>

            <button
              onClick={() => setBillingInterval("yearly")}
              className={`rounded-lg px-5 py-2.5 font-medium transition ${
                billingInterval === "yearly"
                  ? "bg-blue-600 text-white"
                  : "border bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"
              }`}
            >
              Yearly
            </button>

            <div className="ml-2 flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Currency:
              </span>

              <button
                onClick={() => setPaymentCurrency("NGN")}
                className={`rounded-lg px-4 py-2 font-medium transition ${
                  paymentCurrency === "NGN"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "border bg-white dark:border-slate-600 dark:bg-slate-800"
                }`}
              >
                NGN
              </button>

              <button
                onClick={() => setPaymentCurrency("USD")}
                className={`rounded-lg px-4 py-2 font-medium transition ${
                  paymentCurrency === "USD"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "border bg-white dark:border-slate-600 dark:bg-slate-800"
                }`}
              >
                USD
              </button>
            </div>

            {billingInterval === "yearly" && (
              <span className="text-sm text-green-600">
                Annual billing selected
              </span>
            )}
          </div>

          {plans.length === 0 ? (
            <div className="rounded-lg border p-6 text-center text-gray-500">
              No subscription plans are currently available.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

              {plans.map((plan) => {
                const planKey = plan.name.toLowerCase().trim();

                const isCurrentPlan =
                  currentPlanName === planKey &&
                  hasCurrentAccess;

                const paymentKey =
                  `${plan.id}-${billingInterval}-${paymentCurrency}`;

                const isPaying = payingPlan === paymentKey;

                const billingTotal = getBillingTotal(plan);
                const displayedPrice = getDisplayedPrice(plan);

                const isFreePlan =
                  !plan.custom_pricing &&
                  Number(plan.monthly_price_ngn || 0) === 0 &&
                  Number(plan.monthly_price_usd || 0) === 0 &&
                  Number(plan.yearly_price_ngn || 0) === 0 &&
                  Number(plan.yearly_price_usd || 0) === 0;

                return (
                  <div
                    key={plan.id}
                    className="flex flex-col rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
                  >
                    {/* Heading */}
                    <div className="mb-5">
                      <h3 className="text-2xl font-bold">
                        {plan.name}
                      </h3>

                      {plan.description && (
                        <p className="mt-2 text-sm text-gray-500">
                          {plan.description}
                        </p>
                      )}

                      {plan.custom_pricing ? (
                        <div className="mt-3">
                          <p className="text-2xl font-bold text-blue-600">
                            Custom Pricing
                          </p>

                          <p className="mt-2 text-sm text-gray-500">
                            Contact the sales team for a quotation.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3">

                          {/* Monthly equivalent */}
                          <p className="text-3xl font-bold text-blue-600">
                            {formatPrice(
                              displayedPrice,
                              paymentCurrency
                            )}

                            <span className="text-sm font-normal text-gray-500">
                              {" "}/ month
                            </span>
                          </p>

                          {/* Actual billing amount */}
                          <p className="mt-2 text-sm text-gray-500">
                            {formatPrice(
                              billingTotal,
                              paymentCurrency
                            )}{" "}
                            billed {billingInterval === "yearly"
                              ? "annually"
                              : "monthly"}
                          </p>

                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div className="flex-1 space-y-3">
                      <Feature
                        label={`${formatLimit(plan.max_products)} Products`}
                      />

                      <Feature
                        label={`${formatLimit(plan.max_employees)} Employees`}
                      />

                      {plan.reports_enabled && (
                        <Feature label="Advanced Reports" />
                      )}

                      {plan.notifications_enabled && (
                        <Feature label="Notifications" />
                      )}

                      {plan.ai_enabled && (
                        <Feature label="AI Features" />
                      )}

                      {plan.export_enabled && (
                        <Feature label="Data Export" />
                      )}
                    </div>

                    {/* Action */}
                    <div className="mt-6">
                      {plan.custom_pricing ? (
                        <div className="rounded-lg bg-gray-100 p-3 text-center text-sm font-medium text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                          Contact sales for a quotation
                        </div>
                      ) : isFreePlan ? (
                        <div className="rounded-lg bg-gray-100 p-3 text-center text-sm font-medium text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                          Free plan
                        </div>
                      ) : (
                        <button
                          onClick={() => subscribe(plan)}
                          disabled={
                            payingPlan !== null ||
                            isCurrentPlan ||
                            billingTotal <= 0
                          }
                          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                        >
                          {isPaying ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 size={18} className="animate-spin" />
                              Redirecting...
                            </span>
                          ) : isCurrentPlan ? (
                            "Current Plan"
                          ) : (
                            `Choose ${billingInterval === "yearly" ? "Yearly" : "Monthly"} Plan`
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          )}
        </section>
      </div>
    </div>
  );
}
