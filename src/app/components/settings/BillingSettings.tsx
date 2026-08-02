import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";

import {
  getPlans,
  getMySubscription,
  initializePayment,
} from "../../../api/subscriptions";

interface Plan {
  id: number;
  name: string;
  price: number;
  duration_days: number;

  max_products: number;
  max_employees: number;
  max_customers: number;

  ai_enabled: boolean;
  reports_enabled: boolean;
  notifications_enabled: boolean;
}

interface Subscription {
  plan_name: string;
  expires_at: string;
  status: string;
}

interface Props {
  onBack: () => void;
}

export default function BillingSettings({
  onBack,
}: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [loading, setLoading] = useState(true);

  const [payingPlan, setPayingPlan] =
    useState<string | null>(null);

  
  async function loadData() {
  try {
    const plansRes = await getPlans();
    setPlans(plansRes.data);
  } catch (err) {
    console.error("Failed to load plans", err);
  }

  try {
    const subRes = await getMySubscription();
    setSubscription(subRes.data);
  } catch (err) {
    console.log("No active subscription");
    setSubscription(null);
  }

  setLoading(false);
}
useEffect(() => {
    loadData();
  }, []);

  async function subscribe(plan: string) {
    try {
      setPayingPlan(plan);

      const res = await initializePayment(plan);

      window.location.href =
        res.data.authorization_url;
    } catch (err) {
      console.error(err);
      alert("Unable to initialize payment.");
    } finally {
      setPayingPlan(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        Loading subscription...
      </div>
    );
  }

  return (
  
  <div className="mx-auto max-w-7xl p-6">
    <div className="space-y-6">

      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 font-medium"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      {/* Current Subscription */}

      <div className="rounded-xl border bg-blue-50 dark:bg-slate-800 p-5">

        <h2 className="font-bold text-lg">
          Current Subscription
        </h2>

        <p className="mt-2">
          <span className="font-semibold">
            Plan:
          </span>{" "}
          {subscription?.plan_name ?? "Free"}
        </p>

        <p>
          <span className="font-semibold">
            Status:
          </span>{" "}
          {subscription?.status ?? "Active"}
        </p>

        {subscription?.expires_at && (
          <p>
            <span className="font-semibold">
              Expires:
            </span>{" "}
            {new Date(
              subscription.expires_at
            ).toLocaleDateString()}
          </p>
        )}

      </div>

      {/* Plans */}
      {/* Upgrade Plans */}

<div className="mt-6">
  <h2 className="mb-6 text-2xl font-bold">
    Upgrade Your Plan
  </h2>

  {/* Debug (remove after testing) */}
  <div className="mb-4 text-red-500 space-y-1">
    <p>Total Plans: {plans.length}</p>
    <p>
      Upgrade Plans:{" "}
      {plans.filter((p) => p.name.toLowerCase() !== "free").length}
    </p>
  </div>

  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    {plans
      .filter((plan) => plan.name.toLowerCase() !== "free")
      .map((plan) => (
        <div
          key={plan.id}
          className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-lg dark:bg-slate-800"
        >
          {/* Header */}
          <div className="mb-5">
            <h3 className="text-2xl font-bold">
              {plan.name}
            </h3>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              ₦{plan.price.toLocaleString()}
            </p>

            <p className="text-sm text-gray-500">
              {plan.duration_days} Days
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">

            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              <span>
                {plan.max_products.toLocaleString()} Products
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              <span>
                {plan.max_employees.toLocaleString()} Employees
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              <span>
                {plan.max_customers.toLocaleString()} Customers
              </span>
            </div>

            {plan.ai_enabled && (
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                <span>AI Features</span>
              </div>
            )}

            {plan.reports_enabled && (
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                <span>Advanced Reports</span>
              </div>
            )}

            {plan.notifications_enabled && (
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                <span>Notifications</span>
              </div>
            )}
          </div>

          {/* Button */}
          <button
            onClick={() => subscribe(plan.name.toLowerCase())}
            disabled={payingPlan !== null}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {payingPlan === plan.name.toLowerCase()
              ? "Redirecting..."
              : "Choose Plan"}
          </button>
        </div>
      ))}
  </div>
</div>   
  </div>
    </div>
  );
}