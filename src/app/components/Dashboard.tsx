import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Activity,
  Package,
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  FileText,
} from "lucide-react";

import {
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
  stock: number;
};

export function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [weekDate, setWeekDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const [s, p] = await Promise.all([getSalesApi(), getProductsApi()]);
    setSales(s.data);
    setProducts(p.data);
  };
  
  // ================= WEEK HELPERS =================
  const { weekStart, weekEnd } = useMemo(() => {
    const d = new Date(weekDate);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { weekStart: start, weekEnd: end };
  }, [weekDate]);

  // ================= FILTERED SALES =================
  const weekSales = useMemo(() => {
    return sales.filter((s) => {
      const d = new Date(s.date);
      return d >= weekStart && d <= weekEnd;
    });
  }, [sales, weekStart, weekEnd]);

  // ================= CORE METRICS =================
  const totalRevenue = sales.reduce((a, s) => a + (s.total || 0), 0);

  const todaySales = sales
    .filter((s) => {
      const d = new Date(s.date).toISOString().slice(0, 10);
      return d === new Date().toISOString().slice(0, 10);
    })
    .reduce((a, s) => a + s.total, 0);

    const profit = sales.reduce((a, s) => {
    const cost = s.items?.reduce(
      (sum, i) => sum + i.price * i.quantity * 0.7,
      0
    );
    return a + ((s.total || 0) - (cost || 0));
  }, 0);

  const totalOrders = sales.length;
const aov = totalOrders ? totalRevenue / totalOrders : 0;

  // ================= WEEKLY CHART =================
  const weeklyData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const data = Array(7).fill(0).map((_, i) => ({
      day: days[i],
      sales: 0,
    }));

    weekSales.forEach((s) => {
      const d = new Date(s.date).getDay();
      data[d].sales += s.total || 0;
    });

    return data;
  }, [weekSales]);

const salesByHour: Record<number, number> = {};

sales.forEach((s) => {
  const hour = new Date(s.date).getHours();
  salesByHour[hour] = (salesByHour[hour] || 0) + (s.total || 0);
});

const peakHour = Object.entries(salesByHour).reduce(
  (max, curr) => (curr[1] > max[1] ? curr : max),
  ["0", 0]
);

const peakHourLabel =
  sales.length > 0
    ? `${peakHour[0]}:00 - ${Number(peakHour[0]) + 1}:00`
    : "No data";

    const salesByDay = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(
  (_, i) =>
    sales
      .filter((s) => new Date(s.date).getDay() === i)
      .reduce((sum, s) => sum + (s.total || 0), 0)
);

const maxDayIndex = salesByDay.indexOf(Math.max(...salesByDay));

const busyDay =
  sales.length > 0
    ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][maxDayIndex]
    : "No data";

    
 const monthlyTrend = useMemo(() => {
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  const data = months.map((m) => ({
    month: m,
    value: 0,
  }));

  sales.forEach((s) => {
    const d = new Date(s.date);
    const monthIndex = d.getMonth(); // 0 = Jan, 11 = Dec

    data[monthIndex].value += s.total || 0;
  });

  return data;
}, [sales]);
  // ================= TOP PRODUCTS =================
  const topProducts = useMemo(() => {
    const map: Record<string, number> = {};

    weekSales.forEach((s) => {
      s.items?.forEach((i) => {
        map[i.name] = (map[i.name] || 0) + i.quantity * i.price;
      });
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [weekSales]);

  return (
   <div className="
  bg-white
  dark:bg-slate-900
  border
  border-slate-200
  dark:border-slate-800
  shadow-sm
  hover:shadow-md
  transition-all
  rounded-xl
  p-4
">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
            POS Dashboard
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sales • Inventory • Analytics
          </p>
        </div>

       
      </div>

      {/* WEEK SELECT */}
      
      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border dark:border-slate-800">
        <p className="text-sm text-slate-500 mb-2">Select Week</p>
        <input
          type="date"
          value={weekDate}
          onChange={(e) => setWeekDate(e.target.value)}
          className="p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
        />

      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

        <Metric title="Total Revenue" value={`₦${totalRevenue.toLocaleString()}`} icon={DollarSign} />
        <Metric title="Today Sales" value={`₦${todaySales.toLocaleString()}`} icon={Activity} />
        <Metric title="Total Profit" value={`₦${profit.toFixed(2)}`} icon={CreditCard} />
        <Metric
          title="Average Order Value"
          value={`₦${aov.toFixed(2)}`}
          icon={DollarSign}
        />
       
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800">
    <h3 className="font-semibold text-slate-900 dark:text-white">
      🧠 Sales Insights
    </h3>

    <div className="mt-3 space-y-2 text-sm">
      <p>
        ⏰ Peak Sales Hour:{" "}
        <span className="font-bold text-blue-500">
          {peakHourLabel}
        </span>
      </p>

      <p>
        📅 Busiest Day:{" "}
        <span className="font-bold text-green-500">
          {busyDay}
        </span>
      </p>
    </div>
  </div>

      </div>


      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">

        {/* WEEKLY SALES */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800">
          <h3 className="font-semibold mb-3">Weekly Sales (Sun – Sat)</h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line dataKey="sales" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* TOP PRODUCTS */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800">
          <h3 className="font-semibold mb-3">Top Selling Products</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

       {/* MONTHLY SALES */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800">
          <h3 className="font-semibold mb-3">Monthly Sales Trend</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrend}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* INSIGHTS SECTION */}
  </div>
</div>
      </div>

      );
}


// ================= SMALL COMPONENT =================
function Metric({ title, value, icon: Icon }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-xl">
      <div className="flex justify-between">
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        <Icon className="text-blue-500 size-5" />
      </div>
    </div>
  );
}