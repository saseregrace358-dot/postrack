import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

interface LandingProps {
  onGetStarted: () => void;
}
export default function Landing({ onGetStarted }: LandingProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">

      {/* Navbar */}

      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-600 text-white text-xl font-bold">
              B
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                BusinessFlow
              </h1>

              <p className="text-sm text-slate-500">
                Smart Business Management
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              to="/auth"
              className="rounded-xl border border-slate-300 px-5 py-2 font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Login
            </Link>

            <Link
              to="/auth?mode=register"
              className="rounded-xl bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}

      <section className="mx-auto grid max-w-7xl gap-16 px-6 py-20 lg:grid-cols-2 lg:items-center">

        <div>

          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            🚀 Modern POS & Business Software
          </span>

          <h1 className="mt-6 text-5xl font-extrabold leading-tight text-slate-900 dark:text-white">
            Run your entire business from one dashboard.
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
            BusinessFlow helps you manage inventory, employees,
            sales, customers, reports and subscriptions in one
            secure cloud platform.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/auth?mode=register"
              className="flex items-center gap-2 rounded-xl bg-green-600 px-7 py-4 font-semibold text-white hover:bg-green-700"
            >
              Start Free

              <ArrowRight size={20} />
            </Link>

            <Link
              to="/auth"
              className="rounded-xl border border-slate-300 px-7 py-4 font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Login
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-6">

            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              <span>Secure Authentication</span>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              <span>Cloud Sync</span>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              <span>Offline Support</span>
            </div>

          </div>

        </div>

        {/* Hero Card */}

        <div>

          <div className="rounded-3xl bg-gradient-to-br from-green-600 to-green-800 p-10 text-white shadow-2xl">

            <h2 className="text-3xl font-bold">
              Everything your business needs.
            </h2>

            <div className="mt-10 grid gap-5">

              <Feature
                icon={<ShoppingCart />}
                title="Point of Sale"
              />

              <Feature
                icon={<Package />}
                title="Inventory Management"
              />

              <Feature
                icon={<Users />}
                title="Employee Management"
              />

              <Feature
                icon={<BarChart3 />}
                title="Sales Analytics"
              />

              <Feature
                icon={<ShieldCheck />}
                title="Subscription Security"
              />

            </div>

          </div>

        </div>

      </section>

      {/* Features */}

      <section className="bg-slate-50 py-20 dark:bg-slate-900">

        <div className="mx-auto max-w-7xl px-6">

          <h2 className="text-center text-4xl font-bold text-slate-900 dark:text-white">
            Why choose BusinessFlow?
          </h2>

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

            <Card
              title="Inventory"
              desc="Track stock in real time."
            />

            <Card
              title="Employees"
              desc="Manage staff permissions securely."
            />

            <Card
              title="Customers"
              desc="Store customer information."
            />

            <Card
              title="Sales"
              desc="Monitor daily revenue instantly."
            />

            <Card
              title="Reports"
              desc="Beautiful business insights."
            />

            <Card
              title="Cloud Backup"
              desc="Access your business anywhere."
            />

          </div>

        </div>

      </section>

      {/* CTA */}

      <section className="py-20">

        <div className="mx-auto max-w-4xl rounded-3xl bg-green-600 px-10 py-16 text-center text-white">

          <h2 className="text-4xl font-bold">
            Ready to grow your business?
          </h2>

          <p className="mt-5 text-lg opacity-90">
            Join thousands of businesses already using BusinessFlow.
          </p>

          <Link
            to="/auth?mode=register"
            className="mt-8 inline-flex rounded-xl bg-white px-8 py-4 font-bold text-green-700"
          >
            Create Free Account
          </Link>

        </div>

      </section>

    </div>
  );
}

function Feature({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white/10 p-4">
      {icon}
      <span className="font-semibold">{title}</span>
    </div>
  );
}

function Card({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-800">
      <h3 className="text-xl font-bold">{title}</h3>

      <p className="mt-3 text-slate-500">
        {desc}
      </p>
    </div>
  );
}