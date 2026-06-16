import { useState } from "react";
import { Search, Filter, Download, Plus, CheckCircle, Clock, XCircle } from "lucide-react";

const mockTransactions = [
  { id: "TXN001234", date: "2026-06-02 14:32", agent: "Sarah Johnson", agentId: "AG001", type: "Withdrawal", amount: 25000, commission: 125, status: "completed", reference: "REF8934567" },
  { id: "TXN001233", date: "2026-06-02 14:27", agent: "Michael Chen", agentId: "AG002", type: "Deposit", amount: 15000, commission: 75, status: "completed", reference: "REF8934566" },
  { id: "TXN001232", date: "2026-06-02 14:20", agent: "Fatima Ahmed", agentId: "AG003", type: "Bill Payment", amount: 8500, commission: 170, status: "completed", reference: "REF8934565" },
  { id: "TXN001231", date: "2026-06-02 14:14", agent: "David Okonkwo", agentId: "AG004", type: "Transfer", amount: 50000, commission: 250, status: "completed", reference: "REF8934564" },
  { id: "TXN001230", date: "2026-06-02 14:09", agent: "Aisha Bello", agentId: "AG005", type: "Withdrawal", amount: 12000, commission: 60, status: "pending", reference: "REF8934563" },
  { id: "TXN001229", date: "2026-06-02 14:05", agent: "James Williams", agentId: "AG006", type: "Deposit", amount: 30000, commission: 150, status: "completed", reference: "REF8934562" },
  { id: "TXN001228", date: "2026-06-02 14:01", agent: "Blessing Eze", agentId: "AG007", type: "Bill Payment", amount: 5200, commission: 104, status: "completed", reference: "REF8934561" },
  { id: "TXN001227", date: "2026-06-02 13:58", agent: "Sarah Johnson", agentId: "AG001", type: "Withdrawal", amount: 18000, commission: 90, status: "failed", reference: "REF8934560" },
  { id: "TXN001226", date: "2026-06-02 13:52", agent: "Michael Chen", agentId: "AG002", type: "Transfer", amount: 22000, commission: 110, status: "completed", reference: "REF8934559" },
  { id: "TXN001225", date: "2026-06-02 13:47", agent: "Fatima Ahmed", agentId: "AG003", type: "Deposit", amount: 45000, commission: 225, status: "completed", reference: "REF8934558" },
];

export function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredTransactions = mockTransactions.filter((txn) => {
    const matchesSearch =
      txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || txn.type === filterType;
    const matchesStatus = filterStatus === "all" || txn.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalAmount = filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  const totalCommission = filteredTransactions.reduce((sum, txn) => sum + txn.commission, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Transactions</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage and track all agent transactions
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <Download className="size-4" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="size-4" />
            New Transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Total Transactions</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">
            {filteredTransactions.length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Total Amount</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">
            ₦{totalAmount.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Total Commission</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">
            ₦{totalCommission.toLocaleString()}
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
              placeholder="Search by ID, agent, or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Types</option>
                <option value="Withdrawal">Withdrawal</option>
                <option value="Deposit">Deposit</option>
                <option value="Bill Payment">Bill Payment</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{txn.id}</div>
                    <div className="text-xs text-slate-500">{txn.reference}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {txn.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{txn.agent}</div>
                    <div className="text-xs text-slate-500">{txn.agentId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {txn.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                    ₦{txn.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    ₦{txn.commission.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        txn.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : txn.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {txn.status === "completed" && <CheckCircle className="size-3" />}
                      {txn.status === "pending" && <Clock className="size-3" />}
                      {txn.status === "failed" && <XCircle className="size-3" />}
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">New Transaction</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Agent
                </label>
                <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Select agent</option>
                  <option>Sarah Johnson (AG001)</option>
                  <option>Michael Chen (AG002)</option>
                  <option>Fatima Ahmed (AG003)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Transaction Type
                </label>
                <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Select type</option>
                  <option>Withdrawal</option>
                  <option>Deposit</option>
                  <option>Bill Payment</option>
                  <option>Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
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
                  Add Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
