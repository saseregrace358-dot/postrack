
import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Activity,
  Package,
  CreditCard,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { getSalesApi, getProductsApi } from "../../api/dashboard";

// ================= TYPES =================

type SaleItem = {
  product_id: number;
  name: string;
  quantity: number;
  price: number;
};

type Sale = {
  id: string;
  date: string;
  total: number;
  balance: number;
  status: string;
  items: SaleItem[];
};

type Product = {
  id: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
};

type ReturnRecord = {
  id: number;
  product_id?: number;
  product_name?: string;
  name?: string;
  quantity: number;
  price?: number | string;
  unit_price?: number | string;
  condition?: string;
  item_condition?: string;
  reason?: string;
  return_reason?: string;
  returned_at?: string;
};

// ================= HELPERS =================

const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
];

export function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);

  const [weekDate, setWeekDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // ================= LOAD DATA =================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [salesResponse, productsResponse] = await Promise.all([
          getSalesApi(),
          getProductsApi(),
        ]);

        setSales(
          Array.isArray(salesResponse.data) ? salesResponse.data : []
        );

        setProducts(
          Array.isArray(productsResponse.data)
            ? productsResponse.data
            : []
        );
      } catch (error) {
        console.error("Unable to load dashboard data:", error);
      }
    };

    const loadReturns = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          "https://postrack.onrender.com/returns",
          {
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : {},
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load returns (${response.status})`
          );
        }

        const data = await response.json();

        const records = Array.isArray(data)
          ? data
          : Array.isArray(data.returns)
            ? data.returns
            : Array.isArray(data.items)
              ? data.items
              : [];

        setReturns(records);
      } catch (error) {
        console.error("Unable to load return records:", error);
      }
    };

    loadDashboard();
    loadReturns();
  }, []);

  // ================= DATE FILTER =================

  const selectedDate = useMemo(() => {
    const date = new Date(`${weekDate}T00:00:00`);
    date.setHours(23, 59, 59, 999);
    return date;
  }, [weekDate]);

  const selectedSales = useMemo(() => {
    return sales.filter((sale) => {
      const date = new Date(sale.date);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === weekDate
      );
    });
  }, [sales, weekDate]);

  const salesUntilDate = useMemo(() => {
    return sales.filter((sale) => {
      const date = new Date(sale.date);

      return (
        !Number.isNaN(date.getTime()) &&
        date <= selectedDate
      );
    });
  }, [sales, selectedDate]);

  // ================= WEEK HELPERS =================

  const { weekStart, weekEnd } = useMemo(() => {
    const date = new Date(`${weekDate}T00:00:00`);
    const day = date.getDay();

    const start = new Date(date);
    start.setDate(date.getDate() - day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { weekStart: start, weekEnd: end };
  }, [weekDate]);

  const weekSales = useMemo(() => {
    return sales.filter((sale) => {
      const date = new Date(sale.date);

      return (
        !Number.isNaN(date.getTime()) &&
        date >= weekStart &&
        date <= weekEnd
      );
    });
  }, [sales, weekStart, weekEnd]);

  // ================= CORE METRICS =================

  const totalRevenue = salesUntilDate.reduce(
    (sum, sale) => sum + Number(sale.total || 0),
    0
  );

  const daySales = selectedSales.reduce(
    (sum, sale) => sum + Number(sale.total || 0),
    0
  );

  const profit = salesUntilDate.reduce((sum, sale) => {
    const cost =
      sale.items?.reduce(
        (total, item) =>
          total +
          Number(item.price || 0) *
            Number(item.quantity || 0) *
            0.7,
        0
      ) || 0;

    return sum + (Number(sale.total || 0) - cost);
  }, 0);

  const inventoryValue = products.reduce((sum, product) => {
    return (
      sum +
      Number(product.cost || 0) *
        Number(product.stock || 0)
    );
  }, 0);

  const totalOrders = salesUntilDate.length;

  const aov =
    totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // ================= DAMAGED RETURNS =================

  const damagedReturns = useMemo(() => {
    return returns.filter((item) => {
      const condition = String(
        item.condition ?? item.item_condition ?? ""
      )
        .trim()
        .toLowerCase();

      return condition === "damaged";
    });
  }, [returns]);

  const damagedQuantity = useMemo(() => {
    return damagedReturns.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
  }, [damagedReturns]);

  const damagedValue = useMemo(() => {
    return damagedReturns.reduce((sum, item) => {
      const price = Number(
        item.price ?? item.unit_price ?? 0
      );

      return (
        sum +
        Math.max(0, Number(item.quantity || 0)) *
          Math.max(0, price)
      );
    }, 0);
  }, [damagedReturns]);

  // ================= RETURNS BY REASON =================

  const returnsByReason = useMemo(() => {
    const grouped = new Map<string, number>();

    returns.forEach((item) => {
      const reason =
        item.reason?.trim() ||
        item.return_reason?.trim() ||
        "Other";

      grouped.set(
        reason,
        (grouped.get(reason) || 0) +
          Math.max(0, Number(item.quantity || 0))
      );
    });

    return Array.from(grouped, ([reason, quantity]) => ({
      reason,
      quantity,
    })).sort((a, b) => b.quantity - a.quantity);
  }, [returns]);

  // ================= WEEKLY SALES CHART =================

  const weeklyData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const data = days.map((day) => ({
      day,
      sales: 0,
    }));

    weekSales.forEach((sale) => {
      const day = new Date(sale.date).getDay();

      data[day].sales += Number(sale.total || 0);
    });

    return data;
  }, [weekSales]);

  // ================= SALES INSIGHTS =================

  const peakHourLabel = useMemo(() => {
    const salesByHour: Record<number, number> = {};

    salesUntilDate.forEach((sale) => {
      const hour = new Date(sale.date).getHours();

      salesByHour[hour] =
        (salesByHour[hour] || 0) +
        Number(sale.total || 0);
    });

    const entries = Object.entries(salesByHour);

    if (entries.length === 0) return "No data";

    const peak = entries.reduce((max, current) =>
      Number(current[1]) > Number(max[1]) ? current : max
    );

    const hour = Number(peak[0]);

    return `${String(hour).padStart(2, "0")}:00 - ${String(
      (hour + 1) % 24
    ).padStart(2, "0")}:00`;
  }, [salesUntilDate]);

  const busyDay = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totals = days.map(() => 0);

    salesUntilDate.forEach((sale) => {
      const day = new Date(sale.date).getDay();

      totals[day] += Number(sale.total || 0);
    });

    if (salesUntilDate.length === 0) return "No data";

    const maxDayIndex = totals.indexOf(Math.max(...totals));

    return days[maxDayIndex];
  }, [salesUntilDate]);

  // ================= MONTHLY SALES TREND =================

  const monthlyTrend = useMemo(() => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const data = months.map((month) => ({
      month,
      value: 0,
    }));

    salesUntilDate.forEach((sale) => {
      const date = new Date(sale.date);

      if (!Number.isNaN(date.getTime())) {
        data[date.getMonth()].value += Number(sale.total || 0);
      }
    });

    return data;
  }, [salesUntilDate]);

  // ================= TOP PRODUCTS =================

  const topProducts = useMemo(() => {
    const map: Record<string, number> = {};

    weekSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        map[item.name] =
          (map[item.name] || 0) +
          Number(item.quantity || 0) *
            Number(item.price || 0);
      });
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [weekSales]);

  // ================= RENDER =================

  return (
    <div className="min-w-0 space-y-5 pb-6 sm:space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:w-[600px]">

          {/* DATE FILTER */}
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Activity size={19} />
            </div>

            <div className="min-w-0 flex-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Select Date
              </label>

              <input
                type="date"
                value={weekDate}
                onChange={(event) => setWeekDate(event.target.value)}
                className="mt-1 w-full min-w-0 border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none dark:text-white"
              />
            </div>
          </div>

          {/* SALES INSIGHTS */}
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sales Insights
            </h3>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Peak Hour
              </span>
              <span className="text-right text-xs font-semibold text-blue-600 dark:text-blue-400 sm:text-sm">
                {peakHourLabel}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Busiest Day
              </span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {busyDay}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">

        {/* TOTAL REVENUE */}
        <div className="group flex min-h-[112px] min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 border-l-4 border-l-blue-500 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:border-l-blue-500 dark:bg-slate-800 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
              Total Revenue
            </p>
            <h3 className="mt-2  text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-white [overflow-wrap:anywhere] sm:text-lg">
              {formatCurrency(totalRevenue)}
            </h3>
            <p className="mt-2 text-[10px] leading-snug text-slate-400 sm:text-xs">
              Revenue up to selected date
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-transform group-hover:scale-105 dark:bg-blue-950 dark:text-blue-400 sm:h-9 sm:w-9">
            <DollarSign size={18} />
          </div>
        </div>

        {/* SALES FOR SELECTED DATE */}
        <div className="group flex min-h-[112px] min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-800 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
              Sales for Selected Date
            </p>
            <h3 className="mt-2  text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-white [overflow-wrap:anywhere] sm:text-lg">
              {formatCurrency(daySales)}
            </h3>
            <p className="mt-2  text-[10px] leading-snug text-slate-400 sm:text-xs">
              Sales on {weekDate}
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105 dark:bg-emerald-950 dark:text-emerald-400 sm:h-9 sm:w-9">
            <Activity size={18} />
          </div>
        </div>

        {/* TOTAL PROFIT */}
        <div className="group flex min-h-[112px] min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 border-l-4 border-l-violet-500 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:border-l-violet-500 dark:bg-slate-800 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
              Total Profit
            </p>
            <h3 className="mt-2  text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-white [overflow-wrap:anywhere] sm:text-lg">
              {formatCurrency(profit)}
            </h3>
            <p className="mt-2 text-[10px] leading-snug text-slate-400 sm:text-xs">
              Estimated earnings
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-transform group-hover:scale-105 dark:bg-violet-950 dark:text-violet-400 sm:h-9 sm:w-9">
            <CreditCard size={18} />
          </div>
        </div>

        {/* AVERAGE ORDER VALUE */}
        <div className="group flex min-h-[112px] min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:border-l-amber-500 dark:bg-slate-800 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
              Average Order Value
            </p>
            <h3 className="mt-2  text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-white [overflow-wrap:anywhere] sm:text-lg">
              {formatCurrency(aov)}
            </h3>
            <p className="mt-2 text-[10px] leading-snug text-slate-400 sm:text-xs">
              Average per order
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition-transform group-hover:scale-105 dark:bg-amber-950 dark:text-amber-400 sm:h-9 sm:w-9">
            <DollarSign size={18} />
          </div>
        </div>

        {/* INVENTORY VALUE */}
        <div className="group flex min-h-[112px] min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 border-l-4 border-l-cyan-500 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:border-l-cyan-500 dark:bg-slate-800 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
              Inventory Value
            </p>
            <h3 className="mt-2  text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-white [overflow-wrap:anywhere] sm:text-lg">
              {formatCurrency(inventoryValue)}
            </h3>
            <p className="mt-2 text-[10px] leading-snug text-slate-400 sm:text-xs">
              Current stock at cost
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 transition-transform group-hover:scale-105 dark:bg-cyan-950 dark:text-cyan-400 sm:h-9 sm:w-9">
            <Package size={18} />
          </div>
        </div>

        {/* DAMAGED RETURNED GOODS */}
        <div className="group flex min-h-[112px] min-w-0 items-center justify-between gap-2 rounded-xl border border-red-100 border-l-4 border-l-red-500 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:border-l-red-500 dark:bg-slate-800 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
              Damaged Returned Goods
            </p>

            <h3 className="mt-2  text-base font-bold leading-tight text-slate-900 dark:text-white sm:text-lg">
              {damagedQuantity.toLocaleString()} units
            </h3>

            <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 sm:text-xs">
                Total value
              </p>
              <p className="mt-1  text-sm font-semibold leading-tight text-red-600 dark:text-red-400 [overflow-wrap:anywhere] sm:text-base">
                {formatCurrency(damagedValue)}
              </p>
            </div>
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-transform group-hover:scale-105 dark:bg-red-950 dark:text-red-400 sm:h-9 sm:w-9">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* ALL CHARTS: ONE COLUMN ON MOBILE, TWO ON TABLET/DESKTOP */}
      <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:gap-6">

        {/* WEEKLY SALES */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Weekly Sales
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Sales performance from Sunday to Saturday
            </p>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={weeklyData}
              margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(value) =>
                  value >= 1000
                    ? `₦${(value / 1000).toFixed(0)}k`
                    : `₦${value}`
                }
              />
              <Tooltip
                formatter={(value) => [
                  `₦${Number(value).toLocaleString("en-NG")}`,
                  "Sales",
                ]}
              />
              <Line
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 3, fill: "#3b82f6" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* MONTHLY SALES TREND */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Monthly Sales Trend
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Sales distribution across the months
            </p>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={monthlyTrend}
              margin={{ top: 10, right: 5, left: -12, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(value) =>
                  value >= 1000
                    ? `₦${(value / 1000).toFixed(0)}k`
                    : `₦${value}`
                }
              />
              <Tooltip
                formatter={(value) => [
                  `₦${Number(value).toLocaleString("en-NG")}`,
                  "Sales",
                ]}
              />
              <Bar
                dataKey="value"
                name="Sales"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* RETURNS BY REASON */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <RotateCcw size={19} />
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Returns by Reason
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Returned quantities grouped by recorded reason
              </p>
            </div>
          </div>

          {returnsByReason.length === 0 ? (
            <div className="flex h-[260px] flex-col items-center justify-center px-3 text-center">
              <RotateCcw
                size={30}
                className="mb-3 text-slate-300 dark:text-slate-600"
              />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No return records available
              </p>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Return reasons will appear here when saved records are available.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={returnsByReason}
                  dataKey="quantity"
                  nameKey="reason"
                  cx="50%"
                  cy="45%"
                  innerRadius={52}
                  outerRadius={85}
                  paddingAngle={3}
                  label={({ name, value }) =>
                    `${String(name)}: ${Number(value)}`
                  }
                  labelLine={false}
                >
                  {returnsByReason.map((item, index) => (
                    <Cell
                      key={item.reason}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>

                <RechartsTooltip
                  formatter={(value) => [
                    `${Number(value).toLocaleString()} units`,
                    "Returned quantity",
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          </div>

        {/* TOP SELLING PRODUCTS */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-3 dark:border-slate-700 sm:p-5">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Top Selling Products
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Product performance for the selected week
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Top 6
          </span>
        </div>

        {/* MOBILE PRODUCT LIST */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700 sm:hidden">
          {topProducts.map((product, index) => {
            const productItems = weekSales.flatMap((sale) =>
              (sale.items || []).filter(
                (item) => item.name === product.name
              )
            );

            const quantitySold = productItems.reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0
            );

            const revenue = productItems.reduce(
              (sum, item) =>
                sum +
                Number(item.quantity || 0) *
                  Number(item.price || 0),
              0
            );

            const estimatedProfit = productItems.reduce(
              (sum, item) =>
                sum +
                Number(item.quantity || 0) *
                  Number(item.price || 0) *
                  0.3,
              0
            );

            return (
              <details key={product.name} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 sm:px-4 [&::-webkit-details-marker]:hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Package size={17} />
                  </div>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-white">
                    {product.name}
                  </span>

                  <svg
                    className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-50/80 px-3 py-3 pl-14 dark:bg-slate-900/40 sm:px-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Qty Sold
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">
                      {quantitySold.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Revenue
                    </p>
                    <p className="mt-1  text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(revenue)}
                    </p>
                  </div>

                  <div className="col-span-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Estimated Profit
                    </span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(estimatedProfit)}
                    </span>
                  </div>
                </div>
              </details>
            );
          })}

          {topProducts.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No product sales found.
            </div>
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-4 font-medium">Product Name</th>
                <th className="px-5 py-4 text-right font-medium">Qty Sold</th>
                <th className="px-5 py-4 text-right font-medium">Revenue</th>
                <th className="px-5 py-4 text-right font-medium">Profit</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {topProducts.map((product, index) => {
                const productItems = weekSales.flatMap((sale) =>
                  (sale.items || []).filter(
                    (item) => item.name === product.name
                  )
                );

                const quantitySold = productItems.reduce(
                  (sum, item) =>
                    sum + Number(item.quantity || 0),
                  0
                );

                const revenue = productItems.reduce(
                  (sum, item) =>
                    sum +
                    Number(item.quantity || 0) *
                      Number(item.price || 0),
                  0
                );

                const estimatedProfit = productItems.reduce(
                  (sum, item) =>
                    sum +
                    Number(item.quantity || 0) *
                      Number(item.price || 0) *
                      0.3,
                  0
                );

                return (
                  <tr
                    key={product.name}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                          <Package size={19} />
                        </div>

                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Product #{index + 1}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right font-medium text-slate-700 dark:text-slate-200">
                      {quantitySold.toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-right font-medium text-slate-800 dark:text-white">
                      {formatCurrency(revenue)}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                      {formatCurrency(estimatedProfit)}
                    </td>
                  </tr>
                );
              })}

              {topProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No product sales found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-700 sm:px-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing the top products by revenue for the selected week.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
