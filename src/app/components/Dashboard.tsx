import { useState, useEffect } from "react";
import {
  DollarSign,
  Users,
  CreditCard,
  Activity,
  Package,
  AlertTriangle,
} from "lucide-react";

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { getSalesApi, getProductsApi } from "../../api/dashboard";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function Dashboard() {
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [salesRes, productsRes] = await Promise.all([
        getSalesApi(),
        getProductsApi(),
      ]);

      setSales(salesRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // CORE STATS
  // =========================

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (sum, p) => sum + (p.stock || 0),
    0
  );

  const inventoryValue = products.reduce(
    (sum, p) => sum + (p.stock || 0) * (p.price || 0),
    0
  );

  const lowStock = products.filter((p) => p.stock < 5);

  const totalRevenue = sales.reduce(
    (sum, s) => sum + (s.total || 0),
    0
  );

  const totalDebt = sales.reduce(
    (sum, s) => sum + (s.balance || 0),
    0
  );

  const totalItems = sales.reduce((sum, sale) => {
    return (
      sum +
      (sale.items?.reduce(
        (a: number, i: any) => a + i.quantity,
        0
      ) || 0)
    );
  }, 0);

  // =========================
  // GROUPED DATA
  // =========================

  const revenueByDay = Object.values(
    sales.reduce((acc: any, sale: any) => {
      const date = new Date(sale.date).toLocaleDateString();

      if (!acc[date]) {
        acc[date] = { date, revenue: 0 };
      }

      acc[date].revenue += sale.total || 0;
      return acc;
    }, {})
  );

  const paid = sales.filter((s) => s.status === "PAID").length;
  const debt = sales.filter((s) => s.status !== "PAID").length;

  const paymentData = [
    { name: "Paid", value: paid },
    { name: "Debt", value: debt },
  ];

  // =========================
  // STAT CARDS
  // =========================

  const stats = [
    {
      title: "Total Revenue",
      value: `₦${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-blue-500",
    },
    {
      title: "Total Sales Items",
      value: totalItems,
      icon: Activity,
      color: "bg-green-500",
    },
    {
      title: "Total Stock",
      value: totalStock,
      icon: Package,
      color: "bg-purple-500",
    },
    {
      title: "Total Debt",
      value: `₦${totalDebt.toLocaleString()}`,
      icon: CreditCard,
      color: "bg-red-500",
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* HEADER */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
          Dashboard Overview
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sales + Inventory + Financial Summary
        </p>
      </div>

      {/* ================= INVENTORY STATS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border dark:border-slate-800">
          <p className="text-sm text-slate-500">Products</p>
          <p className="text-xl font-bold">{totalProducts}</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border dark:border-slate-800">
          <p className="text-sm text-slate-500">Stock Units</p>
          <p className="text-xl font-bold text-green-600">{totalStock}</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border dark:border-slate-800">
          <p className="text-sm text-slate-500">Low Stock</p>
          <p className="text-xl font-bold text-red-600">{lowStock.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border dark:border-slate-800">
          <p className="text-sm text-slate-500">Inventory Value</p>
          <p className="text-xl font-bold text-blue-600">
            ₦{inventoryValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ================= SALES STATS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.title}
            className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-xl"
          >
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-slate-500">{s.title}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
              <div className={`${s.color} p-2 rounded-lg`}>
                <s.icon className="text-white size-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ================= CHARTS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LINE CHART */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800">
          <h3 className="font-semibold mb-3">Revenue Trend</h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line dataKey="revenue" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* PIE CHART */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800">
          <h3 className="font-semibold mb-3">Payment Status</h3>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={paymentData} dataKey="value" outerRadius={80}>
                {paymentData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= LOW STOCK ================= */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="text-red-500" />
          Low Stock Alert
        </h3>

        {lowStock.length === 0 ? (
          <p className="text-slate-500">All stock levels are healthy</p>
        ) : (
          lowStock.map((p) => (
            <div key={p.id} className="flex justify-between text-sm text-red-500 py-1">
              <span>{p.name}</span>
              <span>{p.stock}</span>
            </div>
          ))
        )}
      </div>

    </div>
  );
}