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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const plansRes = await getPlans();
      const subRes = await getMySubscription();

      setPlans(plansRes.data);
      setSubscription(subRes.data);
    } finally {
      setLoading(false);
    }
  }

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
    <div className="space-y-5">

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

      {plans.map((plan) => (
        <div
          key={plan.id}
          className="rounded-xl border p-5 bg-white dark:bg-slate-800"
        >
          <div className="flex justify-between items-center">

            <div>

              <h2 className="text-xl font-bold">
                {plan.name}
              </h2>

              <p className="text-3xl font-bold text-blue-600 mt-2">
                ₦{plan.price.toLocaleString()}
              </p>

              <p className="text-gray-500">
                {plan.duration_days} Days
              </p>

            </div>

          </div>

          <div className="mt-5 space-y-2">

            <p className="flex items-center gap-2">
              <CheckCircle size={18} />
              {plan.max_products.toLocaleString()} Products
            </p>

            <p className="flex items-center gap-2">
              <CheckCircle size={18} />
              {plan.max_employees.toLocaleString()} Employees
            </p>

            <p className="flex items-center gap-2">
              <CheckCircle size={18} />
              {plan.max_customers.toLocaleString()} Customers
            </p>

            {plan.ai_enabled && (
              <p className="flex items-center gap-2">
                <CheckCircle size={18} />
                AI Features
              </p>
            )}

            {plan.reports_enabled && (
              <p className="flex items-center gap-2">
                <CheckCircle size={18} />
                Advanced Reports
              </p>
            )}

            {plan.notifications_enabled && (
              <p className="flex items-center gap-2">
                <CheckCircle size={18} />
                Notifications
              </p>
            )}

          </div>

          <button
            onClick={() => subscribe(plan.name.toLowerCase())}
            disabled={payingPlan !== null}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {payingPlan === plan.name.toLowerCase()
              ? "Redirecting..."
              : "Choose Plan"}
          </button>

        </div>
      ))}

    </div>
  );
}