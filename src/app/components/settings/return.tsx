import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Package,
  Plus,
  RotateCcw,
  Search,
  X,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  createReturnApi,
  getReturnsApi,
  updateReturnStatusApi,
  type RefundStatus,
} from "../../../api/returns";

import { getProducts } from "../../../api/products";
import { getSalesApi } from "../../../api/sales";

type Product = {
  id: number;
  name: string;
  cost: number;
  price: number;
  category: string;
  stock: number;
  image?: string;
  barcode?: string;
};

type SaleItem = {
  id?: number | string;
  product_id?: number | string;
  name: string;
  price: number;
  quantity: number;
};

type Sale = {
  id: number | string;
  order_id: string;
  date?: string;
  created_at?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
};

type RestockCondition = "Resellable" | "Damaged";

type ReturnRecord = {
  id: string;
  return_id: string;
  sale_id: string;
  order_id: string;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  reason: string;
  condition: RestockCondition;
  date: string;
  restocked: boolean;
  refund_status: string;
};

type ReturnItemsProps = {
  onBack: () => void;
};

type SavedReturn = {
  id: string | number;
  return_id?: string | number;
  sale_id: string | number;
  order_id: string;
  business_id?: string;
  reason?: string;
  return_reason?: string;
  refund_amount: number;
  refund_status?: string;
  created_at?: string;
  returned_at?: string;
  items?: {
    id?: string | number;
    product_id: number;
    product_name?: string;
    name?: string;
    quantity: number;
    unit_price?: number;
    price?: number;
    refund_amount: number;
    item_condition?: RestockCondition;
    condition?: RestockCondition;
    restocked: boolean;
  }[];
};

const today = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const getDateKey = (value?: string) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const money = (value: number) =>
  `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getApiError = (err: unknown, fallback: string) => {
  const error = err as {
    response?: {
      data?: {
        detail?: string;
        message?: string;
      };
    };
    message?: string;
  };

  return (
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    fallback
  );
};

const getSaleProductId = (item: SaleItem) =>
  item.product_id ?? item.id;

function flattenReturns(returns: SavedReturn[]): ReturnRecord[] {
  return returns.flatMap((record) =>
    (record.items ?? []).map((item) => ({
      id: String(item.id ?? `${record.id}-${item.product_id}`),
      return_id: String(record.return_id ?? record.id),
      sale_id: String(record.sale_id),
      order_id: record.order_id,
      product_id: item.product_id,
      product_name: item.product_name ?? item.name ?? "Unknown product",
      quantity: item.quantity,
      unit_price: item.unit_price ?? item.price ?? 0,
      refund_amount: item.refund_amount ?? 0,
      reason: record.reason ?? record.return_reason ?? "",
      condition: item.item_condition ?? item.condition ?? "Resellable",
      date: record.created_at ?? record.returned_at ?? "",
      restocked: item.restocked ?? false,
      refund_status: record.refund_status ?? "PENDING",
     })),
  );
}
export default function ReturnItems({ onBack }: ReturnItemsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");

const filteredReturns = useMemo(
  () =>
    returns.filter(
      (record) =>
        !dateFilter ||
        getDateKey(record.date) === dateFilter
    ),
  [returns, dateFilter]
);
  const [refundStatus, setRefundStatus] =
    useState<RefundStatus>("PENDING");
  const [updatingReturnId, setUpdatingReturnId] =
    useState<string | null>(null);

  const [saleSearch, setSaleSearch] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [showSaleSuggestions, setShowSaleSuggestions] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [condition, setCondition] =
    useState<RestockCondition>("Resellable");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const [productResponse, salesResponse, returnsResponse] =
      await Promise.all([
        getProducts(),
        getSalesApi(),
        getReturnsApi(),
      ]);

    const productData = productResponse.data;
    const salesData = salesResponse.data;
    const returnsData = returnsResponse.data;

    if (
      !Array.isArray(productData) ||
      !Array.isArray(salesData) ||
      !Array.isArray(returnsData)
    ) {
      throw new Error(
        "The server returned an unexpected sales, inventory, or returns response."
      );
    }

    setProducts(productData);

    setSales(
      (salesData as Sale[]).map((sale) => ({
        ...sale,
        items: Array.isArray(sale.items) ? sale.items : [],
      }))
    );

    setReturns(flattenReturns(returnsData as SavedReturn[]));
    setPageError("");
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await loadData();
      } catch (err) {
        console.error("Failed to load return data:", err);

        if (active) {
          setPageError(
            getApiError(
              err,
              "Unable to load return history, sales, and inventory."
            )
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [loadData]);

  const selectedSale = sales.find(
    (sale) => String(sale.id) === selectedSaleId
  );

  // Backend returns are tracked by product_id, not sale-line id.
  const selectedSaleItem = selectedSale?.items.find(
    (item) => String(getSaleProductId(item) ?? "") === selectedProductId
  );

  const selectedProductIdNumber = selectedSaleItem
    ? Number(getSaleProductId(selectedSaleItem))
    : NaN;

  const selectedInventoryProduct = products.find(
    (product) => product.id === selectedProductIdNumber
  );

  const filteredSales = useMemo(() => {
    const search = saleSearch.trim().toLowerCase();

    if (!search) return [];

    return sales.filter((sale) =>
      `${sale.order_id} ${sale.id} ${sale.date ?? ""} ${
        sale.created_at ?? ""
      }`
        .toLowerCase()
        .includes(search)
    );
  }, [sales, saleSearch]);

 
  // Count saved returns against the original product in the sale.
  const returnedQuantityForProduct = (
    saleId: string | number,
    productId: string | number
  ) =>
    returns
      .filter(
        (record) =>
          record.sale_id === String(saleId) &&
          String(record.product_id) === String(productId)
      )
      .reduce((sum, record) => sum + record.quantity, 0);

  // Count all matching sale lines when calculating remaining quantity.
  const soldQuantityForProduct = (
    sale: Sale,
    productId: string | number
  ) =>
    sale.items
      .filter(
        (item) =>
          String(getSaleProductId(item) ?? "") === String(productId)
      )
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const remainingQuantity =
    selectedSale && selectedSaleItem
      ? Math.max(
          0,
          soldQuantityForProduct(selectedSale, selectedProductId) -
            returnedQuantityForProduct(
              selectedSale.id,
              selectedProductId
            )
        )
      : 0;

  // Informational estimate only. The backend calculates the saved refund.
  const refundEstimate =
    selectedSaleItem && Number(quantity) > 0
      ? Number(quantity) * Number(selectedSaleItem.price)
      : 0;

  const handleSaleChange = (sale: Sale) => {
    setSelectedSaleId(String(sale.id));
    setSaleSearch(sale.order_id);
    setSelectedProductId("");
    setQuantity("");
    setShowSaleSuggestions(false);
    setError("");
  };

  const resetForm = () => {
    setSaleSearch("");
    setSelectedSaleId("");
    setShowSaleSuggestions(false);
    setSelectedProductId("");
    setQuantity("");
    setReason("");
    setCondition("Resellable");
    setRefundStatus("PENDING");
    setError("");
    setShowForm(false);
  };

  const handleReturn = async () => {
    if (saving) return;

    setError("");

    if (!selectedSale) {
      setError("Select the original sale for this return.");
      return;
    }

    if (!selectedSaleItem) {
      setError("Select a product from the original sale.");
      return;
    }

    const productId = getSaleProductId(selectedSaleItem);

    if (
      productId === undefined ||
      productId === null ||
      !Number.isInteger(Number(productId)) ||
      Number(productId) <= 0
    ) {
      setError(
        "This sale item has no valid inventory product ID. Check the original sale data."
      );
      return;
    }

    if (!selectedInventoryProduct) {
      setError(
        "This product could not be found in your inventory. No return was saved."
      );
      return;
    }

    const returnedQuantity = Number(quantity);

    if (
      !Number.isInteger(returnedQuantity) ||
      returnedQuantity <= 0
    ) {
      setError("Enter a valid whole-number return quantity.");
      return;
    }

    if (returnedQuantity > remainingQuantity) {
      setError(
        `You can return up to ${remainingQuantity} more unit(s) of this product.`
      );
      return;
    }

    if (!reason.trim()) {
      setError("Select a reason for the return.");
      return;
    }

    if (
      !Number.isFinite(Number(selectedSaleItem.price)) ||
      Number(selectedSaleItem.price) < 0
    ) {
      setError("The original sale price is invalid.");
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading("Saving return to database...");

    try {
      const response = await createReturnApi({
        sale_id: Number(selectedSale.id),
        reason: reason.trim(),
        refund_status: refundStatus,
        items: [
          {
            product_id: Number(productId),
            quantity: returnedQuantity,
            item_condition: condition,
          },
        ],
      });

      const savedReturn = response.data?.return as
        | SavedReturn
        | undefined;

      if (!savedReturn || savedReturn.id === undefined) {
        throw new Error(
          "The server response did not contain the saved return."
        );
      }

      await loadData();

      const savedDate = getDateKey(savedReturn.created_at) || today();
      setDateFilter(savedDate);
      setExpandedId(`${savedReturn.id}-${Number(productId)}`);

      window.dispatchEvent(new Event("inventory-updated"));

      resetForm();

      toast.dismiss(loadingToast);
      toast.success(
        `Return saved successfully. Refund recorded: ${money(
          Number(savedReturn.refund_amount)
        )}`
      );
    } catch (err) {
      console.error("Return processing failed:", err);

      toast.dismiss(loadingToast);

      const message = getApiError(err, "Unable to save the return.");

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteRefund = async (item: ReturnRecord) => {
    if (updatingReturnId !== null) return;

    if (item.refund_status?.toUpperCase() !== "PENDING") {
      toast.error("Only pending refunds can be completed.");
      return;
    }

    const returnId = Number(item.return_id);

    if (!Number.isInteger(returnId) || returnId <= 0) {
      toast.error("Invalid return record ID.");
      return;
    }

    setUpdatingReturnId(item.return_id);
    const loadingToast = toast.loading("Updating refund status...");

    try {
      await updateReturnStatusApi(returnId, "COMPLETED");

      // Reload persisted data so the displayed status matches the database.
      await loadData();

      window.dispatchEvent(new Event("returns-updated"));
      window.dispatchEvent(new Event("sales-updated"));

      toast.dismiss(loadingToast);
      toast.success("Refund marked as completed.");
    } catch (err) {
      console.error("Failed to complete refund:", err);

      toast.dismiss(loadingToast);
      toast.error(
        getApiError(err, "Unable to update the refund status.")
      );
    } finally {
      setUpdatingReturnId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-500">
        Loading sales, inventory, and saved returns...
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Return Items
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Record returns against original sales and review saved return history.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          aria-label="Back to settings"
          title="Back to settings"
        >
          <X size={20} />
        </button>
      </div>

      {pageError && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{pageError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadData()
                .catch((err) => {
                  setPageError(
                    getApiError(err, "Unable to reload return data.")
                  );
                })
                .finally(() => setLoading(false));
            }}
            className="shrink-0 rounded-lg border border-red-200 px-3 py-2 font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-950"
          >
            Retry
          </button>
        </div>
      )}

      {/* DATE FILTER AND ADD BUTTON */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <CalendarDays size={17} />
            Filter by recorded date
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setRefundStatus("PENDING");
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Return Item
        </button>
      </div>

      {/* POPUP FORM */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) resetForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-5 dark:border-slate-700 dark:bg-slate-800">
              <div>
                <h3
                  id="return-form-title"
                  className="font-semibold text-slate-900 dark:text-white"
                >
                  Record Returned Item
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Select the original sale and product.
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700"
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            {error && (
              <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 sm:mx-5">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              {/* SEARCH SALE */}
              <div className="relative sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Search original sale by order number
                </label>

                <div className="relative">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={saleSearch}
                    onChange={(e) => {
                      setSaleSearch(e.target.value);
                      setSelectedSaleId("");
                      setSelectedProductId("");
                      setQuantity("");
                      setError("");
                      setShowSaleSuggestions(true);
                    }}
                    onFocus={() => setShowSaleSuggestions(true)}
                    onBlur={() =>
                      window.setTimeout(
                        () => setShowSaleSuggestions(false),
                        150
                      )
                    }
                    placeholder="Type an order number..."
                    autoComplete="off"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {showSaleSuggestions && saleSearch.trim() && (
                  <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {filteredSales.length > 0 ? (
                      filteredSales.map((sale) => (
                        <button
                          key={sale.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSaleChange(sale)}
                          className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-b-0 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-800 dark:text-white">
                              Order #{sale.order_id}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                              {sale.date ?? sale.created_at ?? "Date unavailable"} ·{" "}
                              {sale.items.length} product line(s)
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {money(Number(sale.total))}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                        No matching sales found.
                      </p>
                    )}
                  </div>
                )}

                {selectedSale && (
                  <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
                    <p className="font-semibold text-blue-800 dark:text-blue-200">
                      Order #{selectedSale.order_id}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      Sale date: {selectedSale.date ?? selectedSale.created_at ?? "Unavailable"} · Sale total:{" "}
                      {money(Number(selectedSale.total))}
                    </p>
                  </div>
                )}
              </div>

              {/* ORIGINAL SALE ITEM */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Product from original sale
                </label>

                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setQuantity("");
                    setError("");
                  }}
                  disabled={!selectedSale}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">
                    {selectedSale
                      ? "Select a purchased product"
                      : "Select an original sale first"}
                  </option>

                  {selectedSale &&
                    Array.from(
                      new Map(
                        selectedSale.items.map((item) => [
                          String(getSaleProductId(item) ?? ""),
                          item,
                        ])
                      ).values()
                    ).map((item) => {
                      const productId = getSaleProductId(item);
                      const alreadyReturned = returnedQuantityForProduct(
                        selectedSale.id,
                        String(productId)
                      );
                      const sold = soldQuantityForProduct(
                        selectedSale,
                        String(productId)
                      );
                      const remaining = Math.max(
                        0,
                        sold - alreadyReturned
                      );

                      return (
                        <option
                          key={String(productId)}
                          value={String(productId)}
                          disabled={!productId || remaining === 0}
                        >
                          {item.name} · Sold: {sold} · Remaining: {remaining}
                        </option>
                      );
                    })}
                </select>

                {selectedSaleItem && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Original unit price: {money(Number(selectedSaleItem.price))}{" "}
                    · Quantity remaining: {remainingQuantity}
                  </p>
                )}

                {selectedSaleItem && (
                  <p
                    className={`mt-2 text-xs ${
                      selectedInventoryProduct
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {selectedInventoryProduct
                      ? `Inventory matched: ${selectedInventoryProduct.name} · Current stock: ${selectedInventoryProduct.stock}`
                      : "No matching inventory product was found. This return cannot be submitted."}
                  </p>
                )}
              </div>

              {/* QUANTITY */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Return Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max={remainingQuantity}
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={!selectedSaleItem}
                  placeholder="Enter quantity"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              {/* CONDITION */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Item Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) =>
                    setCondition(e.target.value as RestockCondition)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Resellable">
                    Resellable — restock item
                  </option>
                  <option value="Damaged">
                    Damaged — do not restock
                  </option>
                </select>
              </div>

              {/* REFUND ESTIMATE */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Estimated Refund
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
                  {money(refundEstimate)}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Final refund is calculated and saved by the server, including applicable sale tax.
                </p>
              </div>

              {/* REASON */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Reason for Return
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Select return reason</option>
                  <option value="Damaged item">Damaged item</option>
                  <option value="Wrong product">Wrong product</option>
                  <option value="Defective product">Defective product</option>
                  <option value="Customer changed mind">
                    Customer changed mind
                  </option>
                  <option value="Expired item">Expired item</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* REFUND STATUS */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Refund Status
                </label>
                <select
                  value={refundStatus}
                  onChange={(e) =>
                    setRefundStatus(e.target.value as RefundStatus)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {/* STOCK PREVIEW */}
              {selectedInventoryProduct &&
                Number.isInteger(Number(quantity)) &&
                Number(quantity) > 0 && (
                  <div className="sm:col-span-2 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        Inventory stock after return
                      </span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300">
                        {condition === "Damaged"
                          ? selectedInventoryProduct.stock
                          : selectedInventoryProduct.stock + Number(quantity)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      This is a preview. The backend validates and updates stock when you submit.
                    </p>
                  </div>
                )}
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-4 sm:flex-row sm:justify-end dark:border-slate-700">
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReturn}
                disabled={saving || Boolean(pageError)}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={17} />
                {saving ? "Saving Return..." : "Record Return"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATABASE-BACKED RETURN HISTORY */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 p-4 sm:p-5 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Returned Items
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Saved return records loaded from the database.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadData()
                  .then(() => toast.success("Return history refreshed."))
                  .catch((err) =>
                    toast.error(
                      getApiError(err, "Unable to refresh return history.")
                    )
                  );
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {filteredReturns.map((item) => {
            const expanded = expandedId === item.id;
            const isPending =
              item.refund_status?.toUpperCase() === "PENDING";
            const isUpdating = updatingReturnId === item.return_id;

            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expanded ? null : item.id)
                  }
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/40 sm:px-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Package size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                      {item.product_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Order #{item.order_id} · Qty: {item.quantity} ·{" "}
                      {item.date}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {money(item.refund_amount)}
                    </p>
                    <ChevronDown
                      size={17}
                      className={`ml-auto mt-1 text-slate-400 transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {expanded && (
                  <div className="grid grid-cols-1 gap-3 bg-slate-50 px-4 py-4 sm:grid-cols-2 sm:px-5 dark:bg-slate-900/40">
                    <div>
                      <p className="text-xs text-slate-500">Return Record</p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        #{item.return_id}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Original Order</p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        #{item.order_id}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Recorded Date</p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        {item.date}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Quantity Returned</p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        {item.quantity}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Original Unit Price</p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        {money(item.unit_price)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Item Refund</p>
                      <p className="mt-1 text-sm font-semibold text-blue-600">
                        {money(item.refund_amount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Restock Condition</p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        {item.condition}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Inventory</p>
                      <p
                        className={`mt-1 text-sm font-medium ${
                          item.restocked
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        {item.restocked
                          ? "Restocked"
                          : "Not restocked"}
                      </p>
                    </div>

                    {/* REFUND STATUS AND COMPLETE ACTION */}
                    <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-slate-500">
                            Refund Status
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isPending
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                            }`}
                          >
                            {item.refund_status || "PENDING"}
                          </span>
                        </div>

                        {isPending && (
                          <button
                            type="button"
                            onClick={() => void handleCompleteRefund(item)}
                            disabled={updatingReturnId !== null}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircle2 size={17} />
                            {isUpdating ? "Updating..." : "Complete"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-500">Reason</p>
                      <p className="mt-1 text-sm text-slate-800 dark:text-white">
                        {item.reason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredReturns.length === 0 && (
            <div className="px-4 py-12 text-center">
              <RotateCcw
                size={30}
                className="mx-auto mb-3 text-slate-400"
              />
              <p className="text-sm font-medium text-slate-700 dark:text-white">
                No returned items for this date
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select another date or record a new return.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
