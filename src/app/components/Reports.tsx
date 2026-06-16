import { useState } from "react";
import { Calendar, Download, TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const monthlyData = [
  { id: "month-1", month: "Jan", revenue: 285000, transactions: 820, agents: 35, commission: 14250 },
  { id: "month-2", month: "Feb", revenue: 310000, transactions: 895, agents: 38, commission: 15500 },
  { id: "month-3", month: "Mar", revenue: 340000, transactions: 965, agents: 40, commission: 17000 },
  { id: "month-4", month: "Apr", revenue: 365000, transactions: 1042, agents: 41, commission: 18250 },
  { id: "month-5", month: "May", revenue: 399000, transactions: 1093, agents: 42, commission: 19950 },
  { id: "month-6", month: "Jun", revenue: 71000, transactions: 195, agents: 42, commission: 3550 },
];

const transactionTypeBreakdown = [
  { type: "Withdrawal", count: 495, percentage: 45.3, revenue: 185000 },
  { type: "Deposit", count: 328, percentage: 30.0, revenue: 125000 },
  { type: "Bill Payment", count: 164, percentage: 15.0, revenue: 62000 },
  { type: "Transfer", count: 106, percentage: 9.7, revenue: 41000 },
];

const locationPerformance = [
  { id: "loc-1", location: "Lagos", agents: 12, transactions: 385, revenue: 142000 },
  { id: "loc-2", location: "Abuja", agents: 8, transactions: 267, revenue: 98500 },
  { id: "loc-3", location: "Kano", agents: 6, transactions: 198, revenue: 71200 },
  { id: "loc-4", location: "Port Harcourt", agents: 5, transactions: 156, revenue: 58900 },
  { id: "loc-5", location: "Ibadan", agents: 4, transactions: 142, revenue: 52100 },
  { id: "loc-6", location: "Others", agents: 7, transactions: 145, revenue: 51300 },
];

const dailyGrowth = [
  { id: "growth-1", date: "May 27", growth: 2.5 },
  { id: "growth-2", date: "May 28", growth: 3.1 },
  { id: "growth-3", date: "May 29", growth: -1.2 },
  { id: "growth-4", date: "May 30", growth: 5.8 },
  { id: "growth-5", date: "May 31", growth: 1.9 },
  { id: "growth-6", date: "Jun 1", growth: 4.2 },
  { id: "growth-7", date: "Jun 2", growth: 3.7 },
];

export function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [reportType, setReportType] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Reports & Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">
            Comprehensive business insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <Calendar className="size-4" />
            Date Range
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="size-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setReportType("overview")}
          className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
            reportType === "overview"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setReportType("transactions")}
          className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
            reportType === "transactions"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setReportType("agents")}
          className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
            reportType === "agents"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Agents
        </button>
        <button
          onClick={() => setReportType("locations")}
          className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
            reportType === "locations"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Locations
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="size-5 text-blue-600" />
            </div>
            <p className="text-sm text-slate-500">Monthly Revenue</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">₦399,000</p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="size-4 text-green-500" />
            <span className="text-sm text-green-600">+9.3%</span>
            <span className="text-sm text-slate-400">vs April</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="size-5 text-green-600" />
            </div>
            <p className="text-sm text-slate-500">Transaction Volume</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">1,093</p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="size-4 text-green-500" />
            <span className="text-sm text-green-600">+4.9%</span>
            <span className="text-sm text-slate-400">vs April</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="size-5 text-purple-600" />
            </div>
            <p className="text-sm text-slate-500">Avg Transaction Size</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">₦365</p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="size-4 text-green-500" />
            <span className="text-sm text-green-600">+4.2%</span>
            <span className="text-sm text-slate-400">vs April</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="size-5 text-orange-600" />
            </div>
            <p className="text-sm text-slate-500">Commission Rate</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">5.0%</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-sm text-slate-400">₦19,950 earned</span>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      {reportType === "overview" && (
        <>
          {/* Revenue & Transaction Trend */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-900">Revenue & Transaction Trend</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPeriod("weekly")}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    selectedPeriod === "weekly"
                      ? "bg-blue-100 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setSelectedPeriod("monthly")}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    selectedPeriod === "monthly"
                      ? "bg-blue-100 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={monthlyData} id="monthly-revenue-area-chart">
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                  name="Revenue (₦)"
                />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Transactions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Growth Rate */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Daily Growth Rate (%)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyGrowth} id="daily-growth-bar-chart">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="growth"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  name="Growth %"
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {reportType === "transactions" && (
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-6">Transaction Type Breakdown</h3>
          <div className="space-y-4">
            {transactionTypeBreakdown.map((type, index) => (
              <div key={type.type} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-10 rounded-lg flex items-center justify-center font-semibold text-white"
                      style={{
                        backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][index],
                      }}
                    >
                      {type.count}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{type.type}</p>
                      <p className="text-sm text-slate-500">
                        ₦{type.revenue.toLocaleString()} total
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{type.percentage}%</p>
                    <p className="text-sm text-slate-500">{type.count} transactions</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${type.percentage}%`,
                      backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][index],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportType === "agents" && (
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Agent Growth Over Time</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyData} id="agent-growth-line-chart">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="agents"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", r: 4 }}
                activeDot={{ r: 6 }}
                name="Active Agents"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {reportType === "locations" && (
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-6">Performance by Location</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Agents
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Transactions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Avg per Agent
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {locationPerformance.map((loc) => (
                  <tr key={loc.location} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{loc.location}</td>
                    <td className="px-4 py-4 text-slate-600">{loc.agents}</td>
                    <td className="px-4 py-4 text-slate-600">{loc.transactions}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      ₦{loc.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      ₦{Math.round(loc.revenue / loc.agents).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={locationPerformance} id="location-performance-bar-chart">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="location" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="transactions" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Transactions" isAnimationActive={true} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
