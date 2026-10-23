
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Package,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { getProducts, updateProductApi } from "../../../api/products";
import { getSalesApi } from "../../../api/sales";

type Product = {
  id: number;
  name: string;
  cost: number;
  price: number;
  category: string;
  stock: number;
  image: string;
  barcode?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  created_by_name?: string;
  business_id?: string;
};

type SaleItem = {
  id: number | string;
  product_id?: number | string;
  name: string;
  price: number;
  quantity: number;
};

type SaleStatus = "PAID" | "PARTIAL" | "DEBT";

type Sale = {
  id: string;
  order_id: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  paymentMethod: string;
  status: SaleStatus;
  payments?: { amount: number; date: string; method: string }[];
  created_by?: number;
  created_by_name?: string;
};

type RestockCondition = "Resellable" | "Damaged";

type ReturnRecord = {
  id: string;
  sale_id: string;
  sale_item_id: string;
  order_id: string;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  reason: string;
  condition: RestockCondition;
  date: string;
  previous_stock: number;
  new_stock: number;
};

type ReturnItemsProps = {
  onBack: () => void;
};

const today = () => {
  const date = new Date();

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

export default function ReturnItems({ onBack }: ReturnItemsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [dateFilter, setDateFilter] = useState(today());

  const [saleSearch, setSaleSearch] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [showSaleSuggestions, setShowSaleSuggestions] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [condition, setCondition] =
    useState<RestockCondition>("Resellable");

  const [returnDate, setReturnDate] = useState(today());
  const [error, setError] = useState("");

  const loadData = async () => {
    const [productResponse, salesResponse] = await Promise.all([
      getProducts(),
      getSalesApi(),
    ]);

    const productData = productResponse.data;
    const salesData = salesResponse.data;

    if (!Array.isArray(productData) || !Array.isArray(salesData)) {
      throw new Error("Invalid sales or inventory response.");
    }

    setProducts(productData);

    setSales(
      (salesData as Sale[]).map((sale) => ({
        ...sale,
        items: Array.isArray(sale.items) ? sale.items : [],
      }))
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadData();
      } catch (err) {
        console.error("Failed to load return data:", err);
        setError(
          "Unable to load sales and inventory. Please refresh and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const selectedSale = sales.find(
    (sale) => String(sale.id) === selectedSaleId
  );

  // The selected ID identifies the sale line.
  // The sale line's product_id identifies the inventory product.
  const selectedSaleItem = selectedSale?.items.find(
    (item) => String(item.id) === selectedProductId
  );

  // Always compare normalized IDs, not number === string.
  const getInventoryProduct = (item: SaleItem): Product | undefined => {
    const productId = item.product_id ?? item.id;

    return products.find(
      (product) => String(product.id) === String(productId)
    );
  };

  const selectedInventoryProduct = selectedSaleItem
    ? getInventoryProduct(selectedSaleItem)
    : undefined;

  const filteredSales = useMemo(() => {
    const search = saleSearch.trim().toLowerCase();

    if (!search) return [];

    return sales.filter((sale) =>
      `${sale.order_id} ${sale.id} ${sale.date ?? ""}`
        .toLowerCase()
        .includes(search)
    );
  }, [sales, saleSearch]);

  const filteredReturns = useMemo(
    () => returns.filter((record) => record.date === dateFilter),
    [returns, dateFilter]
  );

  // Track returns against the original sale line, not the inventory product ID.
  const returnedQuantityForItem = (
    saleId: string,
    saleItemId: string | number
  ) =>
    returns
      .filter(
        (record) =>
          record.sale_id === saleId &&
          record.sale_item_id === String(saleItemId)
      )
      .reduce((sum, record) => sum + record.quantity, 0);

  const remainingQuantity =
    selectedSale && selectedSaleItem
      ? Math.max(
          0,
          Number(selectedSaleItem.quantity) -
            returnedQuantityForItem(
              selectedSale.id,
              selectedSaleItem.id
            )
        )
      : 0;

  const refundAmount =
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
    setReturnDate(today());
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

    const returnedQuantity = Number(quantity);

    if (!Number.isInteger(returnedQuantity) || returnedQuantity <= 0) {
      setError("Enter a valid whole-number return quantity.");
      return;
    }

    if (returnedQuantity > remainingQuantity) {
      setError(
        `You can return up to ${remainingQuantity} more unit(s) from this sale item.`
      );
      return;
    }

    if (!reason.trim()) {
      setError("Select a reason for the return.");
      return;
    }

    if (!returnDate) {
      setError("Select the return date.");
      return;
    }

    if (
      !Number.isFinite(Number(selectedSaleItem.price)) ||
      Number(selectedSaleItem.price) < 0
    ) {
      setError("The original sale price is invalid.");
      return;
    }

    const shouldRestock = condition === "Resellable";
    const inventoryProduct = getInventoryProduct(selectedSaleItem);

    // A resellable item must match inventory before stock can be changed.
    if (shouldRestock && !inventoryProduct) {
      console.error("Inventory product match failed:", {
        saleItem: selectedSaleItem,
        inventoryProductIds: products.map((product) => product.id),
      });

      setError(
        "This sale item could not be matched to inventory. Check the sale item's product_id against the inventory product ID."
      );
      return;
    }

    const previousStock = inventoryProduct?.stock ?? 0;

    const newStock = shouldRestock
      ? previousStock + returnedQuantity
      : previousStock;

    setSaving(true);

    const loadingToast = toast.loading("Processing return...");

    try {
      // Update stock using the actual inventory product ID.
      if (shouldRestock && inventoryProduct) {
        await updateProductApi(inventoryProduct.id, {
          name: inventoryProduct.name,
          cost: inventoryProduct.cost,
          price: inventoryProduct.price,
          category: inventoryProduct.category,
          stock: newStock,
          image: inventoryProduct.image,
          barcode: inventoryProduct.barcode,
        });
      }

      // For a damaged item without an inventory match, keep the sale's
      // product reference. Never use it to update inventory.
      const recordProductId =
        inventoryProduct?.id ??
        Number(selectedSaleItem.product_id ?? selectedSaleItem.id);

      const record: ReturnRecord = {
        id: `${Date.now()}-${selectedSale.id}-${selectedSaleItem.id}`,
        sale_id: String(selectedSale.id),
        sale_item_id: String(selectedSaleItem.id),
        order_id: selectedSale.order_id,
        product_id: recordProductId,
        product_name: selectedSaleItem.name,
        quantity: returnedQuantity,
        unit_price: Number(selectedSaleItem.price),
        refund_amount: refundAmount,
        reason: reason.trim(),
        condition,
        date: returnDate,
        previous_stock: previousStock,
        new_stock: newStock,
      };

      if (shouldRestock) {
        const productResponse = await getProducts();

        if (!Array.isArray(productResponse.data)) {
          throw new Error("Invalid inventory response after restocking.");
        }

        setProducts(productResponse.data);
      }

      setReturns((previous) => [record, ...previous]);
      setDateFilter(returnDate);
      setExpandedId(record.id);

      window.dispatchEvent(new Event("inventory-updated"));

      toast.dismiss(loadingToast);
      resetForm();

      toast.success(
        shouldRestock
          ? "Return recorded and inventory restocked."
          : "Damaged return recorded; inventory was not restocked."
      );
    } catch (err) {
      console.error("Return processing failed:", err);

      toast.dismiss(loadingToast);

      setError(
        "Unable to process the return. Check inventory and try again."
      );

      toast.error("Return failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-500">
        Loading sales and inventory...
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
            Link each return to its original sale, calculate the refund,
            and record the item's condition.
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

      {/* DATE FILTER AND ADD BUTTON */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <CalendarDays size={17} />
            Filter by return date
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
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Return Item
        </button>
      </div>

      {error && !showForm && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

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
                  Choose the original sale and return only items sold in
                  that transaction.
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
                          <span>
                            <span className="block text-sm font-medium text-slate-800 dark:text-white">
                              Order #{sale.order_id}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                              {sale.date} · {sale.items.length} product line(s)
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
                      Sale date: {selectedSale.date} · Sale total:{" "}
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

                  {selectedSale?.items.map((item) => {
                    const alreadyReturned = returnedQuantityForItem(
                      selectedSale.id,
                      item.id
                    );
                    const remaining = Math.max(
                      0,
                      Number(item.quantity) - alreadyReturned
                    );

                    return (
                      <option
                        key={item.id}
                        value={String(item.id)}
                        disabled={remaining === 0}
                      >
                        {item.name} · Sold: {item.quantity} · Remaining
                        returnable: {remaining} · {money(Number(item.price))}
                      </option>
                    );
                  })}
                </select>

                {selectedSaleItem && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Original unit price: {money(Number(selectedSaleItem.price))}{" "}
                    · Quantity remaining to return: {remainingQuantity}
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
                      : `Inventory not matched. Sale item ID: ${String(
                          selectedSaleItem.id
                        )}; product_id: ${String(
                          selectedSaleItem.product_id ?? "not provided"
                        )}`}
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

              {/* DATE */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Return Date
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              {/* CONDITION */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Restock Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) =>
                    setCondition(e.target.value as RestockCondition)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Resellable">
                    Resellable — add back to stock
                  </option>
                  <option value="Damaged">
                    Damaged — do not add to stock
                  </option>
                </select>
              </div>

              {/* REFUND */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Refund Amount
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
                  {money(refundAmount)}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Original sale price × return quantity.
                </p>
              </div>

              {/* REASON */}
              <div className="sm:col-span-2">
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

              {/* SUMMARY */}
              {selectedSaleItem &&
                Number.isInteger(Number(quantity)) &&
                Number(quantity) > 0 && (
                  <div className="sm:col-span-2 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        Refund to record
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {money(refundAmount)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        Inventory stock after return
                      </span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300">
                        {condition === "Damaged"
                          ? "Unchanged (damaged item)"
                          : selectedInventoryProduct
                            ? selectedInventoryProduct.stock +
                              Number(quantity)
                            : "Not matched"}
                      </span>
                    </div>

                    {condition === "Damaged" && (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        Damaged items will not be added to available stock.
                      </p>
                    )}
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
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={17} />
                {saving ? "Processing Return..." : "Record Return"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETURNED ITEMS */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 p-4 sm:p-5 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Returned Items
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Return entries are held in this page session and will disappear
            after a refresh.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {filteredReturns.map((item) => {
            const expanded = expandedId === item.id;

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
                      <p className="text-xs text-slate-500">Original Order</p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        #{item.order_id}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Return Date</p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        {item.date}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Quantity Returned
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        {item.quantity}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Original Unit Price
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        {money(item.unit_price)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Refund Amount</p>
                      <p className="mt-1 text-sm font-semibold text-blue-600">
                        {money(item.refund_amount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Restock Condition
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        {item.condition}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Previous Stock</p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                        {item.previous_stock}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Stock After Return
                      </p>
                      <p className="mt-1 text-sm font-semibold text-emerald-600">
                        {item.new_stock}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-500">
                        Reason for Return
                      </p>
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
