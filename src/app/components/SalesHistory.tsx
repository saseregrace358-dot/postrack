import { useState, useEffect } from "react";
import { Calendar, Filter, Receipt, X } from "lucide-react";
import {
  getSalesApi,
  addPaymentApi,
} from "../../api/sales";

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

type SaleStatus = "PAID" | "DEBT";

type Sale = {
  id: string;
  order_id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  paymentMethod: string;
  status: SaleStatus;
  payments?: Payment[];

  created_by?: number;
  created_by_name?: string;

  
};

type Payment = {
  amount: number;
  date: string;
  method: string;
};

export function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("all");
 const [payAmount, setPayAmount] = useState("");

  const loadSales = async () => {
  try {
    const res = await getSalesApi();

    const safeSales = res.data.map((sale: Sale) => {
      const payments = sale.payments ?? [];

      const totalPaid = payments.reduce(
        (sum: number, p: Payment) => sum + p.amount,
        0
      );

      return {
        ...sale,
        payments,
        amountPaid: totalPaid,
        balance: sale.total - totalPaid,
        status: totalPaid >= sale.total ? "PAID" : "DEBT",
      };
    });

    setSales(safeSales);
  } catch (err) {
    console.error(err);
  }
};

useEffect(() => {
  loadSales();
}, []);

const addPayment = async (saleId: string, amount: number) => {
    if (!amount || amount <= 0) return;

  try {
    await addPaymentApi(saleId, {
  amount,
  method: "Cash",
});

    await loadSales();

    const res = await getSalesApi();

    const updatedSale = res.data.find((s: Sale) => s.id === saleId);

    if (updatedSale) {
      setSelectedSale(updatedSale);
    }

    setPayAmount("");
  } catch (err) {
    console.error(err);
  }
};
const selectedPayments = selectedSale?.payments ?? [];

const totalPaid =
  selectedPayments.reduce(
    (sum: number, p: Payment) => sum + p.amount,
    0
  ) || 0;

const balance = selectedSale
  ? selectedSale.total - totalPaid
  : 0;
 
 
const filteredSales = sales.filter((sale: Sale) => {
  if (filterPeriod === "all") return true;

  const saleDate = new Date(sale.date);
  const now = new Date();

  if (filterPeriod === "today") {
    return saleDate.toDateString() === now.toDateString();
  }

  if (filterPeriod === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return saleDate >= weekAgo;
  }

  if (filterPeriod === "month") {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return saleDate >= monthAgo;
  }

  return true;
});

const totalRevenue = filteredSales.reduce(
  (sum: number, sale: Sale) => sum + sale.total,
  0
);
 const totalItems = filteredSales.reduce(
  (sum: number, sale: Sale) =>
    sum +
    sale.items.reduce(
      (itemSum: number, item: CartItem) =>
        itemSum + item.quantity,
      0
    ),
  0
);
  const totalDebt = filteredSales.reduce(
  (sum: number, sale: Sale) =>
    sum + (sale.status === "DEBT" ? sale.balance : 0),
  0
);

 const formatDate = (dateString: string) => {
      const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Sales History</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">View all transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold">₦{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90 mb-1">Total Sales</p>
          <p className="text-2xl font-bold">{filteredSales.length}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90 mb-1">Total Items Sold</p>
          <p className="text-2xl font-bold">{totalItems}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90 mb-1">Total Debt</p>
          <p className="text-2xl font-bold">
            ₦{totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <button
          onClick={() => setFilterPeriod("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            filterPeriod === "all"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => setFilterPeriod("today")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            filterPeriod === "today"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setFilterPeriod("week")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            filterPeriod === "week"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setFilterPeriod("month")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            filterPeriod === "month"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          }`}
        >
          This Month
        </button>
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {filteredSales.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="size-16 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No sales found</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Start selling to see transactions here</p>
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => setSelectedSale(sale)}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{sale.order_id}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(sale.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">₦{sale.total.toFixed(2)}</p>
                  <div className="flex flex-col items-end gap-1">
                  
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                    sale.status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {sale.status}
                  </span>
                  <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    Sold By:
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {sale.created_by_name}
                  </span>
                </div>
                </div>
                </div>
              </div>
              
            </div>
            
          ))
        )}
      </div>

      {/* Receipt Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSale(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Receipt Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Receipt</h3>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="size-6" />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="p-6 space-y-6">
              {/* Store Info */}
              <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">BizTrack POS</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Your Business Name</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">123 Main St, City</p>
              </div>

              {/* Order Info */}
              {/* Order Info */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Order ID:
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedSale.order_id}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Date:
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatDate(selectedSale.date)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Payment Method:
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedSale.paymentMethod}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Status:
                    </span>
                    <span
                      className={`font-semibold ${
                        selectedSale.status === "PAID"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {selectedSale.status}
                    </span>
                  </div>
                </div>

              {/* Items */}
              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-4">
                <div className="space-y-3">
                  {selectedSale.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.quantity} × ₦{item.price.toLocaleString()}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                    
                  ))}
                </div>
              </div>

              {/* Totals */}
              {/* Totals */}
<div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-4 space-y-2 text-sm">

  <div className="flex justify-between text-slate-600 dark:text-slate-400">
    <span>Subtotal</span>
    <span>
      ₦{selectedSale.subtotal.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}
    </span>
  </div>

 {selectedSale.tax > 0 && (
  <div className="flex justify-between text-slate-600 dark:text-slate-400">
    <span>Tax (7.5%)</span>
    <span>
      ₦{selectedSale.tax.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}
    </span>
  </div>
)}
  <div className="flex justify-between font-semibold text-slate-900 dark:text-white border-t pt-2">
    <span>Total Amount</span>
    <span>
      ₦{selectedSale.total.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}
    </span>
  </div>

  <div className="flex justify-between text-green-600 font-semibold">
    <span>Amount Paid</span>
    <span>
      ₦{selectedSale.amountPaid.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}
    </span>
  </div>

  <div className="flex justify-between font-semibold">
    <span>Balance</span>
    <span
      className={
        selectedSale.balance > 0
          ? "text-red-600"
          : "text-green-600"
      }
    >
      ₦{selectedSale.balance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}
    </span>
  </div>

  <div className="flex justify-between font-bold text-base border-t pt-2">
    
  </div>
  
</div>
 {/* PAYMENTS */}
<div className="border-t mt-2 pt-2">
  <p className="font-semibold text-sm">Payments</p>

  {selectedPayments.map((p, i) => (
    <div key={i} className="flex justify-between text-xs">
      <span>{formatDate(p.date)}</span>
      <span>₦{p.amount.toLocaleString()}</span>
    </div>
  ))}
</div>

{/* ADD PAYMENT */}
{selectedSale.status === "DEBT" && (
  <div className="border-t mt-3 pt-3">
    <input
      type="number"
      placeholder="Enter payment"
      value={payAmount}
      onChange={(e) => setPayAmount(e.target.value)}
      className="w-full p-2 border rounded"
    />

    <button
      onClick={() =>
  addPayment(selectedSale.id, Number(payAmount))
}
      className="w-full mt-2 bg-blue-600 text-white p-2 rounded"
    >
      Add Payment
    </button>
  </div>
)}

{/* TOTALS */}
<div className="border-t mt-3 pt-2 text-sm">
  <p>Total: ₦{selectedSale.total}</p>
  <p>Paid: ₦{totalPaid}</p>
  <p>Balance: ₦{balance}</p>
 
</div>             {/* Footer */}
              <div className="text-center border-t border-dashed border-slate-300 dark:border-slate-700 pt-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Thank you for your business!</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Powered by BizTrack POS</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
