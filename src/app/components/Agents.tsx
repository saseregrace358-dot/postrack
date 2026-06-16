import { useState } from "react";
import { Search, Plus, Edit, Trash2, MapPin, Phone, Mail, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const mockAgents = [
  {
    id: "AG001",
    name: "Sarah Johnson",
    phone: "+234 801 234 5678",
    email: "sarah.j@email.com",
    location: "Lagos Downtown",
    address: "123 Marina Street, Lagos",
    status: "active",
    dateJoined: "2025-03-15",
    transactions: 256,
    revenue: 89500,
    commission: 4475,
    lastTransaction: "2 mins ago",
    performanceData: [
      { id: "ag1-m1", month: "Jan", revenue: 12000 },
      { id: "ag1-m2", month: "Feb", revenue: 15000 },
      { id: "ag1-m3", month: "Mar", revenue: 18000 },
      { id: "ag1-m4", month: "Apr", revenue: 22000 },
      { id: "ag1-m5", month: "May", revenue: 22500 },
    ],
  },
  {
    id: "AG002",
    name: "Michael Chen",
    phone: "+234 802 345 6789",
    email: "m.chen@email.com",
    location: "Abuja Central",
    address: "456 Central Business District, Abuja",
    status: "active",
    dateJoined: "2025-02-20",
    transactions: 231,
    revenue: 78300,
    commission: 3915,
    lastTransaction: "5 mins ago",
    performanceData: [
      { id: "ag2-m1", month: "Jan", revenue: 10000 },
      { id: "ag2-m2", month: "Feb", revenue: 13000 },
      { id: "ag2-m3", month: "Mar", revenue: 16000 },
      { id: "ag2-m4", month: "Apr", revenue: 19000 },
      { id: "ag2-m5", month: "May", revenue: 20300 },
    ],
  },
  {
    id: "AG003",
    name: "Fatima Ahmed",
    phone: "+234 803 456 7890",
    email: "fatima.a@email.com",
    location: "Kano Market",
    address: "789 Market Road, Kano",
    status: "active",
    dateJoined: "2025-04-10",
    transactions: 218,
    revenue: 71200,
    commission: 3560,
    lastTransaction: "12 mins ago",
    performanceData: [
      { id: "ag3-m1", month: "Jan", revenue: 0 },
      { id: "ag3-m2", month: "Feb", revenue: 0 },
      { id: "ag3-m3", month: "Mar", revenue: 8000 },
      { id: "ag3-m4", month: "Apr", revenue: 14000 },
      { id: "ag3-m5", month: "May", revenue: 18000 },
    ],
  },
  {
    id: "AG004",
    name: "David Okonkwo",
    phone: "+234 804 567 8901",
    email: "david.o@email.com",
    location: "Port Harcourt",
    address: "321 Trans Amadi, Port Harcourt",
    status: "active",
    dateJoined: "2025-01-05",
    transactions: 195,
    revenue: 65800,
    commission: 3290,
    lastTransaction: "18 mins ago",
    performanceData: [
      { id: "ag4-m1", month: "Jan", revenue: 15000 },
      { id: "ag4-m2", month: "Feb", revenue: 14000 },
      { id: "ag4-m3", month: "Mar", revenue: 13000 },
      { id: "ag4-m4", month: "Apr", revenue: 12000 },
      { id: "ag4-m5", month: "May", revenue: 11800 },
    ],
  },
  {
    id: "AG005",
    name: "Aisha Bello",
    phone: "+234 805 678 9012",
    email: "aisha.b@email.com",
    location: "Ibadan Station",
    address: "654 Challenge, Ibadan",
    status: "inactive",
    dateJoined: "2024-11-20",
    transactions: 187,
    revenue: 61900,
    commission: 3095,
    lastTransaction: "2 days ago",
    performanceData: [
      { id: "ag5-m1", month: "Jan", revenue: 18000 },
      { id: "ag5-m2", month: "Feb", revenue: 16000 },
      { id: "ag5-m3", month: "Mar", revenue: 14000 },
      { id: "ag5-m4", month: "Apr", revenue: 12000 },
      { id: "ag5-m5", month: "May", revenue: 1900 },
    ],
  },
];

export function Agents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<typeof mockAgents[0] | null>(null);

  const filteredAgents = mockAgents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || agent.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeAgents = mockAgents.filter((a) => a.status === "active").length;
  const totalAgents = mockAgents.length;
  const totalRevenue = mockAgents.reduce((sum, a) => sum + a.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Agents</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your agent network and performance
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-4" />
          Add Agent
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Total Agents</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{totalAgents}</p>
          <p className="text-xs text-slate-400 mt-1">{activeAgents} active</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Total Revenue Generated</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">
            ₦{totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Avg Revenue per Agent</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">
            ₦{Math.round(totalRevenue / totalAgents).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedAgent(agent)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {agent.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                  <p className="text-sm text-slate-500">{agent.id}</p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  agent.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {agent.status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="size-4" />
                <span>{agent.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="size-4" />
                <span>{agent.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="size-4" />
                <span>{agent.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Transactions</p>
                <p className="text-lg font-semibold text-slate-900">{agent.transactions}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Revenue</p>
                <p className="text-lg font-semibold text-slate-900">
                  ₦{(agent.revenue / 1000).toFixed(0)}k
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Commission</p>
                <p className="text-lg font-semibold text-slate-900">
                  ₦{(agent.commission / 1000).toFixed(1)}k
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                <Edit className="size-4" />
                Edit
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm">
                <Trash2 className="size-4" />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAgent(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-semibold">
                  {selectedAgent.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">{selectedAgent.name}</h3>
                  <p className="text-slate-500">{selectedAgent.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-3">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-slate-400" />
                    <span className="text-slate-900">{selectedAgent.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-slate-400" />
                    <span className="text-slate-900">{selectedAgent.email}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="size-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-slate-900">{selectedAgent.location}</p>
                      <p className="text-slate-500">{selectedAgent.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-3">Performance Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Total Transactions</span>
                    <span className="font-semibold text-slate-900">{selectedAgent.transactions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Total Revenue</span>
                    <span className="font-semibold text-slate-900">
                      ₦{selectedAgent.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Commission Earned</span>
                    <span className="font-semibold text-slate-900">
                      ₦{selectedAgent.commission.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Date Joined</span>
                    <span className="font-semibold text-slate-900">{selectedAgent.dateJoined}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                <TrendingUp className="size-4" />
                Performance Trend (Last 5 Months)
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={selectedAgent.performanceData} id={`agent-performance-${selectedAgent.id}`}>
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
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={true} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Add New Agent</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+234 800 000 0000"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="City/Area"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Address
                </label>
                <textarea
                  placeholder="Enter full address"
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Agent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
