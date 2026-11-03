
import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  Receipt,
  X,
} from "lucide-react";
import {
  getSalesApi,
  addPaymentApi,
} from "../../api/sales";
import { getBusinessSettings } from "../../api/settings";
import toast from "react-hot-toast";
import { Metric } from "./ui/Metric";
import { getReturnsApi } from "../../api/returns";

type CartItem = {
  id?: number;
  product_id?: number;
  name: string;
  price: number;
  quantity: number;
};

type SaleStatus = "PAID" | "PARTIAL" | "DEBT";

type Payment = {
  amount: number;
  date: string;
  method: string;
  currency?: string;
};

type Sale = {
  id: number | string;
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
  currency?: string;
  base_currency?: string;
  currency_at_sale?: string;
  exchange_rate_at_sale?: number;
  created_by?: number;
  created_by_name?: string;
};

export function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [payAmount, setPayAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [returnTotals, setReturnTotals] = useState<Record<string, number>>({});
  const [addingPayment, setAddingPayment] = useState(false);
  const [activeCurrency, setActiveCurrency] = useState("");
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const [currencyError, setCurrencyError] = useState(false);

  const formatMoney = (
    amount: number,
    currency: string = activeCurrency
  ) => {
    if (!currency || !/^[A-Z]{3}$/.test(currency)) {
      return "Currency unavailable";
    }

    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: currency === "JPY" ? 0 : 2,
        maximumFractionDigits: currency === "JPY" ? 0 : 2,
      }).format(Number(amount ?? 0));
    } catch {
      return `${currency} ${Number(amount ?? 0).toLocaleString()}`;
    }
  };

  const loadCurrency = async () => {
    try {
      setCurrencyLoading(true);
      setCurrencyError(false);

      const response = await getBusinessSettings();
      const currency = String(response.data?.currency ?? "")
        .trim()
        .toUpperCase();

      if (!/^[A-Z]{3}$/.test(currency)) {
        throw new Error("Business currency is missing or invalid.");
      }

      setActiveCurrency(currency);
    } catch (error) {
      console.error("Failed to load business currency:", error);
      setActiveCurrency("");
      setCurrencyError(true);
      toast.error("Could not load your business currency.");
    } finally {
      setCurrencyLoading(false);
    }
  };

  const loadSales = async (): Promise<Sale[]> => {
    try {
      const salesRes = await getSalesApi();

      const loadedSales: Sale[] = salesRes.data.map((sale: Sale) => ({
        ...sale,
        payments: sale.payments ?? [],
      }));

      setSales(loadedSales);

      try {
        const returnsRes = await getReturnsApi();
        const totals: Record<string, number> = {};

        for (const record of returnsRes.data) {
          const saleId = String(record.sale_id);

          totals[saleId] =
            (totals[saleId] ?? 0) +
            Number(record.refund_amount ?? 0);
        }

        setReturnTotals(totals);
      } catch (returnError) {
        console.error("Failed to load returns:", returnError);
        toast.error("Could not load return amounts.");
      }

      return loadedSales;
    } catch (error) {
      console.error("Failed to load sales:", error);
      toast.error("Could not load sales history.");
      return [];
    }
  };

  const getReturnedAmount = (sale: Sale) =>
    returnTotals[String(sale.id)] ?? 0;

  const getNetTotal = (sale: Sale) =>
    Math.max(0, sale.total - getReturnedAmount(sale));

  const getNetBalance = (sale: Sale) =>
    Math.max(
      0,
      getNetTotal(sale) - Number(sale.amountPaid ?? 0)
    );

  useEffect(() => {
    loadCurrency();
    loadSales();
  }, []);

  const addPayment = async (saleId: number | string, amount: number) => {
    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    try {
      setAddingPayment(true);

      await addPaymentApi(String(saleId), {
        amount,
        method: "Cash",
      });

      const updatedSales = await loadSales();

      const updatedSale = updatedSales.find(
        (sale) => String(sale.id) === String(saleId)
      );

      if (updatedSale) {
        setSelectedSale({
          ...updatedSale,
          payments: updatedSale.payments ?? [],
        });
      }

      setPayAmount("");
      toast.success("Payment added successfully!");
    } catch (error) {
      console.error("Failed to add payment:", error);
      toast.error("Failed to add payment.");
    } finally {
      setAddingPayment(false);
    }
  };

  const selectedPayments = selectedSale?.payments ?? [];

  const totalPaid = selectedPayments.reduce(
    (sum, payment) => sum + Number(payment.amount ?? 0),
    0
  );

  const balance = selectedSale
    ? Math.max(0, getNetTotal(selectedSale) - totalPaid)
    : 0;

  const filteredSales = sales.filter((sale: Sale) => {
    if (filterPeriod !== "all") {
      const saleDate = new Date(sale.date);
      const now = new Date();

      if (filterPeriod === "today") {
        if (saleDate.toDateString() !== now.toDateString()) {
          return false;
        }
      }

      if (filterPeriod === "week") {
        const weekAgo = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000
        );

        if (saleDate < weekAgo) return false;
      }

      if (filterPeriod === "month") {
        const monthAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        );

        if (saleDate < monthAgo) return false;
      }
    }

    if (!searchTerm.trim()) return true;

    const search = searchTerm.toLowerCase();

    return (
      sale.order_id.toLowerCase().includes(search) ||
      sale.status.toLowerCase().includes(search) ||
      (sale.paymentMethod ?? "").toLowerCase().includes(search) ||
      (sale.created_by_name ?? "").toLowerCase().includes(search) ||
      sale.total.toString().includes(search) ||
      sale.balance.toString().includes(search) ||
      sale.items.some((item) =>
        item.name.toLowerCase().includes(search)
      )
    );
  });

  const totalItems = filteredSales.reduce(
    (sum, sale) =>
      sum +
      sale.items.reduce(
        (itemSum, item) => itemSum + item.quantity,
        0
      ),
    0
  );

  const totalDebt = filteredSales.reduce(
    (sum, sale) => sum + getNetBalance(sale),
    0
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  if (currencyLoading) {
    return (
      <div className="p-6 text-center text-slate-500">
        Loading business currency...
      </div>
    );
  }

  if (currencyError || !activeCurrency) {
    return (
      <div className="p-6 text-center text-red-600">
        Business currency is unavailable. Please check your business settings and try again.
        <button
          onClick={loadCurrency}
          className="block mx-auto mt-3 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="col-span-2 lg:col-span-1">
          <Metric
            title="Total Sales"
            value={filteredSales.length}
            icon={ShoppingCart}
          />
        </div>

        <Metric
          title="Total Items Sold"
          value={totalItems}
          icon={Package}
        />

        <Metric
          title="Total Debt"
          value={formatMoney(totalDebt)}
          icon={AlertTriangle}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {[
          { value: "all", label: "All Time" },
          { value: "today", label: "Today" },
          { value: "week", label: "This Week" },
          { value: "month", label: "This Month" },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterPeriod(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filterPeriod === filter.value
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search Order ID, Status, Customer, Product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-3">
        {filteredSales.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="size-16 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              No sales found
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Start selling to see transactions here
            </p>
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
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {sale.order_id}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(sale.date)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatMoney(getNetTotal(sale))}
                  </p>

                  {getReturnedAmount(sale) > 0 && (
                    <p className="text-xs text-orange-600">
                      Returned: {formatMoney(getReturnedAmount(sale))}
                    </p>
                  )}

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

                    <div className="flex justify-between gap-2">
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

      {selectedSale && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Receipt
              </h3>

              <button
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  BizTrack POS
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your Business Name
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  123 Main St, City
                </p>
              </div>

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

              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-4">
                <div className="space-y-3">
                  {selectedSale.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.quantity} × {formatMoney(item.price)}
                        </p>
                      </div>

                      <p className="font-semibold text-slate-900 dark:text-white">
                        {formatMoney(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatMoney(selectedSale.subtotal)}</span>
                </div>

                {selectedSale.tax > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tax</span>
                    <span>{formatMoney(selectedSale.tax)}</span>
                  </div>
                )}

                <div className="flex justify-between font-semibold text-slate-900 dark:text-white border-t pt-2">
                  <span>Original Total</span>
                  <span>{formatMoney(selectedSale.total)}</span>
                </div>

                {getReturnedAmount(selectedSale) > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Returned Amount</span>
                    <span>
                      −{formatMoney(getReturnedAmount(selectedSale))}
                    </span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Net Sale Amount</span>
                  <span>{formatMoney(getNetTotal(selectedSale))}</span>
                </div>
              </div>

              <div className="border-t mt-2 pt-2">
                <p className="font-semibold text-sm">Payments</p>

                {selectedPayments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-xs"
                  >
                    <span>
                      {payment.date
                        ? formatDate(payment.date)
                        : "Payment"}
                    </span>
                    <span>{formatMoney(payment.amount)}</span>
                  </div>
                ))}
              </div>

              {(selectedSale.status === "DEBT" ||
                selectedSale.status === "PARTIAL") && (
                <div className="border-t mt-3 pt-3">
                  <input
                    type="number"
                    min="0"
                    placeholder={`Enter payment (${activeCurrency})`}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full p-2 border rounded"
                  />

                  <button
                    onClick={() =>
                      addPayment(selectedSale.id, Number(payAmount))
                    }
                    disabled={addingPayment}
                    className="w-full mt-2 bg-blue-600 text-white p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingPayment ? "Adding..." : "Add Payment"}
                  </button>
                </div>
              )}

              <div className="border-t mt-3 pt-2 text-sm">
                <p>Net Total: {formatMoney(getNetTotal(selectedSale))}</p>
                <p>Paid: {formatMoney(totalPaid)}</p>
                <p>Balance: {formatMoney(balance)}</p>
              </div>

              <div className="text-center border-t border-dashed border-slate-300 dark:border-slate-700 pt-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Thank you for your business!
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  Powered by BizTrack POS
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
