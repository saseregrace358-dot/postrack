
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CreditCard,
  DollarSign,
  Package,
  RotateCcw,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../../api/api";

// ================= TYPES =================

type DashboardMetrics = {
  totalRevenue: number;
  daySales: number;
  totalProfit: number;
  averageOrderValue: number;
  pendingOtherReturns: number;
  pendingRefundAmount: number;
  damagedReturnedGoods: number;
  totalRefunds: number;
  totalOrders: number;
  selectedDayOrders: number;
};

type DailyData = {
  date: string;
  day: string;
  sales: number;
  revenue: number;
};

type MonthlyData = {
  month: string;
  monthKey: string;
  sales: number;
  revenue: number;
};

type DamagedProduct = {
  product_id: number;
  name: string;
  quantity: number;
  value: number;
};

type TopProduct = {
  product_id: number;
  name: string;
  quantity: number;
  revenue: number;
  profit?: number;
};

type DashboardSummary = {
  selected_date: string;
  peakHour: string;
  metrics: DashboardMetrics;
  weeklyData: DailyData[];
  monthlyTrend: MonthlyData[];
  damagedProducts: DamagedProduct[];
  topProducts: TopProduct[];
};

// ================= HELPERS =================

const formatCurrency = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatNumber = (value: number) =>
  Number(value || 0).toLocaleString("en-NG");

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const emptyMetrics: DashboardMetrics = {
  totalRevenue: 0,
  daySales: 0,
  totalProfit: 0,
  averageOrderValue: 0,
  pendingOtherReturns: 0,
  pendingRefundAmount: 0,
  damagedReturnedGoods: 0,
  totalRefunds: 0,
  totalOrders: 0,
  selectedDayOrders: 0,
};

const emptySummary = (selectedDate: string): DashboardSummary => ({
  selected_date: selectedDate,
  metrics: { ...emptyMetrics },
  peakHour: "—",
  weeklyData: [],
  monthlyTrend: [],
  damagedProducts: [],
  topProducts: [],
});

// ================= DASHBOARD =================

export function Dashboard() {
  const [activeDate, setActiveDate] = useState(getToday);
  const [summary, setSummary] = useState<DashboardSummary>(
    () => emptySummary(getToday())
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // All financial calculations come from the backend.
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dashboard/summary", {
        params: { selected_date: activeDate },
      });

      const data = response.data as DashboardSummary;

      if (!data || !data.metrics) {
        throw new Error("The dashboard response is incomplete.");
      }

      setSummary({
        selected_date: data.selected_date ?? activeDate,
        peakHour: data.peakHour ?? "—",
        metrics: {
          ...emptyMetrics,
          ...data.metrics,
        },
        weeklyData: Array.isArray(data.weeklyData)
          ? data.weeklyData
          : [],
        monthlyTrend: Array.isArray(data.monthlyTrend)
          ? data.monthlyTrend
          : [],
        damagedProducts: Array.isArray(data.damagedProducts)
          ? data.damagedProducts
          : [],
        topProducts: Array.isArray(data.topProducts)
          ? data.topProducts
          : [],
      });
    } catch (err) {
      console.error("Unable to load dashboard:", err);
      setError(
        "Unable to load dashboard data. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [activeDate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const refreshEvents = [
      "returns-updated",
      "sales-updated",
      "inventory-updated",
      "products-updated",
    ];

    const handleRefresh = () => {
      void loadDashboard();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadDashboard();
      }
    };

    refreshEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleRefresh);
    });

    window.addEventListener("focus", handleRefresh);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      refreshEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleRefresh);
      });

      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadDashboard]);

  const {
    totalRevenue,
    daySales,
    totalProfit,
    averageOrderValue,
    pendingOtherReturns,
    pendingRefundAmount,
    damagedReturnedGoods,
    totalOrders,
    selectedDayOrders,
  } = summary.metrics;

  const profitMargin =
    totalRevenue > 0
      ? (totalProfit / totalRevenue) * 100
      : 0;

  const weeklyData = summary.weeklyData;
  const monthlyTrend = summary.monthlyTrend;
  const damagedProducts = summary.damagedProducts;
  const topProducts = summary.topProducts;

  const peakHourLabel = summary.peakHour || "—";

const busyDay =
  weeklyData.length > 0
    ? weeklyData.reduce((best, current) =>
        current.sales > best.sales ? current : best
      ).day
    : "No data";

  // ================= RENDER =================

  return (
    <div className="min-w-0 space-y-5 pb-6 sm:space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:w-[600px]">
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Activity size={19} />
            </div>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="dashboard-date"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                Select Date
              </label>

              <input
                id="dashboard-date"
                type="date"
                value={activeDate}
                max={getToday()}
                onChange={(event) =>
                  setActiveDate(event.target.value || getToday())
                }
                className="mt-1 w-full min-w-0 border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none dark:text-white"
              />
            </div>
          </div>

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

      {/* LOADING / ERROR */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="self-start rounded-lg border border-red-300 px-3 py-2 font-semibold hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/50 sm:self-auto"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <p
          role="status"
          className="text-sm text-slate-500 dark:text-slate-400"
        >
          Updating dashboard…
        </p>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          description={`Net revenue through ${activeDate}`}
          color="blue"
          icon={<DollarSign size={18} />}
        />

        <MetricCard
          title="Sales for Selected Date"
          value={formatCurrency(daySales)}
          description={`${formatNumber(selectedDayOrders)} orders`}
          color="emerald"
          icon={<Activity size={18} />}
        />

        <MetricCard
          title="Total Profit"
          value={formatCurrency(totalProfit)}
          description={`Margin: ${profitMargin.toFixed(2)}%`}
          color="violet"
          icon={<CreditCard size={18} />}
        />

        <MetricCard
          title="Average Order Value"
          value={formatCurrency(averageOrderValue)}
          description={`${formatNumber(totalOrders)} orders to date`}
          color="amber"
          icon={<DollarSign size={18} />}
        />

        <MetricCard
          title="Pending Other Returns"
          value={formatNumber(pendingOtherReturns)}
          description="Pending return records"
          secondaryLabel="Pending refund value"
          secondaryValue={formatCurrency(pendingRefundAmount)}
          color="cyan"
          icon={<Package size={18} />}
        />

        <MetricCard
          title="Damaged Returned Goods"
          value={formatCurrency(damagedReturnedGoods)}
          description="Recorded damaged-item value"
          color="red"
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* CHARTS */}
      <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:gap-6">
        {/* SALES BY DAY */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
          <ChartHeading
            title="Sales by Day"
            description={`Sales less returns through ${activeDate}`}
          />

          {weeklyData.length === 0 ? (
            <EmptyChart />
          ) : (
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
                  tickFormatter={formatAxisCurrency}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value ?? 0)),
                    "Sales less returns",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="Sales less returns"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#3b82f6" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* MONTHLY SALES TREND */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
          <ChartHeading
            title="Monthly Sales Trend"
            description={`Sales less returns through ${activeDate}`}
          />

          {monthlyTrend.length === 0 ? (
            <EmptyChart />
          ) : (
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
                  tickFormatter={formatAxisCurrency}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value ?? 0)),
                    "Sales less returns",
                  ]}
                />
                <Bar
                  dataKey="sales"
                  name="Sales less returns"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* DAMAGED RETURNS */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
              <RotateCcw size={19} />
            </div>
            <ChartHeading
              title="Most Returned Damaged Goods"
              description={`Damaged items through ${activeDate}`}
            />
          </div>

          {damagedProducts.length === 0 ? (
            <EmptyChart message="No damaged returns found." />
          ) : (
            <ResponsiveContainer
              width="100%"
              height={Math.max(260, damagedProducts.length * 48)}
            >
              <BarChart
                data={damagedProducts}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatAxisCurrency}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={125}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value ?? 0)),
                    "Returned value",
                  ]}
                  labelFormatter={(label) => `Product: ${label}`}
                />
                <Bar
                  dataKey="value"
                  name="Returned value"
                  fill="#ef4444"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* TOP SELLING PRODUCTS */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-3 dark:border-slate-700 sm:p-5">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Top Selling Products
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Product performance through {activeDate}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Top 6
            </span>
          </div>

          {/* MOBILE LIST */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700 sm:hidden">
            {topProducts.map((product, index) => (
              <details key={product.product_id ?? product.name} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 [&::-webkit-details-marker]:hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Package size={17} />
                  </div>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-white">
                    {product.name}
                  </span>

                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(product.revenue)}
                  </span>

                  <span className="text-slate-400">⌄</span>
                </summary>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-50/80 px-3 py-3 pl-14 dark:bg-slate-900/40">
                  <ProductDetail
                    label="Qty Sold"
                    value={formatNumber(product.quantity)}
                  />
                  <ProductDetail
                    label="Revenue"
                    value={formatCurrency(product.revenue)}
                  />
                  <div className="col-span-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <ProductDetail
                      label="Profit"
                      value={
                        product.profit == null
                          ? "Not provided"
                          : formatCurrency(product.profit)
                      }
                    />
                  </div>
                </div>
              </details>
            ))}

            {topProducts.length === 0 && (
              <EmptyProducts />
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
                {topProducts.map((product, index) => (
                  <tr
                    key={product.product_id ?? product.name}
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
                      {formatNumber(product.quantity)}
                    </td>

                    <td className="px-5 py-4 text-right font-medium text-slate-800 dark:text-white">
                      {formatCurrency(product.revenue)}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                      {product.profit == null
                        ? "—"
                        : formatCurrency(product.profit)}
                    </td>
                  </tr>
                ))}

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
              Showing the top products by sales value through {activeDate}.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ================= REUSABLE COMPONENTS =================

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  secondaryLabel?: string;
  secondaryValue?: string;
};

function MetricCard({
  title,
  value,
  description,
  color,
  icon,
  secondaryLabel,
  secondaryValue,
}: MetricCardProps) {
  const colors: Record<string, string> = {
    blue: "border-l-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    emerald: "border-l-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    violet: "border-l-violet-500 bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    amber: "border-l-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    cyan: "border-l-cyan-500 bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400",
    red: "border-l-red-500 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  };

  const [borderColor, iconColor] = colors[color]
    .split(" ")
    .slice(0, 1)
    .concat(colors[color].split(" ").slice(1).join(" "));

  return (
    <div
      className={`group flex min-h-[112px] min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 border-l-4 ${borderColor} bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 sm:p-4`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
          {title}
        </p>
        <h3 className="mt-2 break-words text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-lg">
          {value}
        </h3>
        <p className="mt-2 text-[10px] leading-snug text-slate-400 sm:text-xs">
          {description}
        </p>

        {secondaryLabel && secondaryValue && (
          <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 sm:text-xs">
              {secondaryLabel}
            </p>
            <p className="mt-1 break-words text-sm font-semibold sm:text-base">
              {secondaryValue}
            </p>
          </div>
        )}
      </div>

      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColor} transition-transform group-hover:scale-105 sm:h-9 sm:w-9`}
      >
        {icon}
      </div>
    </div>
  );
}

function ChartHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
        {description}
      </p>
    </div>
  );
}

function EmptyChart({
  message = "No data available for this period.",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-[260px] items-center justify-center px-4 text-center text-sm text-slate-500 dark:text-slate-400">
      {message}
    </div>
  );
}

function EmptyProducts() {
  return (
    <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
      No product sales found.
    </div>
  );
}

function ProductDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function formatAxisCurrency(value: number) {
  return value >= 1000
    ? `₦${(value / 1000).toFixed(0)}k`
    : `₦${value}`;
}
