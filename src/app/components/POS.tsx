
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
} from "lucide-react";

import {
  createSaleApi,
  quoteSaleApi,
} from "../../api/sales";

import {
  useProducts,
  productQueryKey,
} from "../hooks/useProducts";

import { useBusinessSettings } from "../context/BusinessSettingsContext";
import toast from "react-hot-toast";

type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
  image: string;
};

type CartItem = Product & {
  quantity: number;
};

type SaleQuote = {
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
};

type PaymentMethod = "Transfer" | "Card" | "Cash";

const getNumber = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
};

const roundMoney = (
  amount: number,
  currency: string
): number => {
  const digits = currency === "JPY" ? 0 : 2;
  const factor = 10 ** digits;

  return Math.round(
    (amount + Number.EPSILON) * factor
  ) / factor;
};

const getQuoteFromResponse = (
  response: any,
  activeCurrency: string
): SaleQuote => {
  const data = response?.data ?? response;
  const quote = data?.quote ?? data;

  const subtotal = getNumber(
    quote?.subtotal ??
    quote?.subtotal_amount
  );

  const tax = getNumber(
    quote?.tax ??
    quote?.tax_amount
  );

  const total = getNumber(
    quote?.total ??
    quote?.total_amount
  );

  const currency =
    quote?.currency ??
    quote?.active_currency ??
    activeCurrency;

  if (
    !Number.isFinite(subtotal) ||
    !Number.isFinite(tax) ||
    !Number.isFinite(total) ||
    !currency
  ) {
    throw new Error(
      "The server returned an incomplete sales quote."
    );
  }

  return {
    subtotal,
    tax,
    total,
    currency,
  };
};

export function POS() {
  const queryClient = useQueryClient();

  const {
    settings,
    currency: activeCurrency,
    taxEnabled,
    taxRate,
    debtThreshold,
    loading: currencyLoading,
    error: currencyError,
    refreshSettings,
  } = useBusinessSettings();

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useProducts() as {
    data: Product[];
    isLoading: boolean;
    isError: boolean;
    refetch: () => Promise<unknown>;
  };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const [amountPaid, setAmountPaid] = useState("");
  const [processingPayment, setProcessingPayment] =
    useState(false);

  const [saleQuote, setSaleQuote] =
    useState<SaleQuote | null>(null);

  const [quoteLoading, setQuoteLoading] =
    useState(false);

  const [quoteError, setQuoteError] =
    useState("");

  const quoteRequestId = useRef(0);
  const previousCurrency = useRef(activeCurrency);

  const paidAmount = amountPaid.trim() === ""
    ? 0
    : Number(amountPaid);

  const currencyReady =
    !!settings &&
    !!activeCurrency &&
    !currencyLoading &&
    !currencyError;

  // --------------------------------------------------
  // Currency formatting
  // --------------------------------------------------

  const currencyDigits =
    activeCurrency === "JPY" ? 0 : 2;

  const formatMoney = (amount: number) => {
    if (!activeCurrency) {
      return "Currency unavailable";
    }

    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: activeCurrency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: currencyDigits,
      }).format(Number(amount) || 0);
    } catch {
      return "Currency unavailable";
    }
  };

  // --------------------------------------------------
  // Refresh settings and products after currency change
  // --------------------------------------------------

  useEffect(() => {
    const handleCurrencyUpdated = async () => {
      setCart([]);
      setSaleQuote(null);
      setQuoteError("");
      setAmountPaid("");

      try {
        await refreshSettings();

        await queryClient.invalidateQueries({
          queryKey: productQueryKey,
        });
      } catch (error) {
        console.error(
          "Unable to refresh currency settings:",
          error
        );

        toast.error(
          "Unable to refresh business currency"
        );
      }
    };

    window.addEventListener(
      "currency-updated",
      handleCurrencyUpdated
    );

    return () => {
      window.removeEventListener(
        "currency-updated",
        handleCurrencyUpdated
      );
    };
  }, [refreshSettings, queryClient]);

  // Clear cart if the active currency changes.
  useEffect(() => {
    if (
      previousCurrency.current &&
      activeCurrency &&
      previousCurrency.current !== activeCurrency
    ) {
      setCart([]);
      setSaleQuote(null);
      setQuoteError("");
      setAmountPaid("");
      setShowCheckout(false);
      setShowCart(false);
    }

    previousCurrency.current = activeCurrency;
  }, [activeCurrency]);

  // --------------------------------------------------
  // Product filtering
  // --------------------------------------------------

  const categories = [
    "All",
    ...Array.from(
      new Set(
        products
          .map((product) => product.category)
          .filter(Boolean)
      )
    ),
  ];

  const filteredProducts = products.filter(
    (product) => {
      const matchesCategory =
        selectedCategory === "All" ||
        product.category === selectedCategory;

      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
    }
  );

  // --------------------------------------------------
  // Cart management
  // --------------------------------------------------

  const addToCart = (product: Product) => {
    if (!currencyReady) {
      toast.error(
        "Business currency is unavailable"
      );
      return;
    }

    if (product.stock <= 0) {
      toast.error("This product is out of stock");
      return;
    }

    const existingItem = cart.find(
      (item) => item.id === product.id
    );

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error("Insufficient stock");
        return;
      }

      setCart((currentCart) =>
        currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      );
    } else {
      setCart((currentCart) => [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ]);
    }
  };

  const updateQuantity = (
    id: number,
    quantity: number
  ) => {
    if (quantity <= 0) {
      setCart((currentCart) =>
        currentCart.filter(
          (item) => item.id !== id
        )
      );
      return;
    }

    const product = products.find(
      (item) => item.id === id
    );

    if (product && quantity > product.stock) {
      toast.error("Insufficient stock");
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeFromCart = (id: number) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== id
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setSaleQuote(null);
    setQuoteError("");
    setAmountPaid("");
  };

  const itemCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // --------------------------------------------------
  // Backend sales quote
  // --------------------------------------------------

  useEffect(() => {
    const requestId = ++quoteRequestId.current;

    if (!currencyReady || cart.length === 0) {
      setSaleQuote(null);
      setQuoteLoading(false);
      setQuoteError("");
      return;
    }

    setQuoteLoading(true);
    setQuoteError("");
    setSaleQuote(null);

    const timeout = window.setTimeout(async () => {
      try {
        const quotePayload = {
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),

          // The quote endpoint reuses SaleCreate.
          // These fields satisfy its request schema.
          // The quote endpoint must not record a payment.
          amountPaid: 0,
          paymentMethod: "Cash",
        };

        const response = await quoteSaleApi(
          quotePayload
        );

        const quote = getQuoteFromResponse(
          response,
          activeCurrency!
        );

        if (requestId !== quoteRequestId.current) {
          return;
        }

        if (quote.currency !== activeCurrency) {
          throw new Error(
            "The quote currency does not match your active business currency."
          );
        }

        setSaleQuote(quote);
        setQuoteError("");
      } catch (error: any) {
        if (requestId !== quoteRequestId.current) {
          return;
        }

        console.error(
          "Sales quote failed:",
          error
        );

        setSaleQuote(null);

        setQuoteError(
          error?.response?.data?.detail ||
          error?.message ||
          "Unable to calculate the sale total."
        );
      } finally {
        if (requestId === quoteRequestId.current) {
          setQuoteLoading(false);
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    cart,
    currencyReady,
    activeCurrency,
  ]);

  // --------------------------------------------------
  // Values supplied by the backend quote
  // --------------------------------------------------

  const subtotal = saleQuote?.subtotal ?? 0;
  const tax = saleQuote?.tax ?? 0;
  const total = saleQuote?.total ?? 0;

  const balance = saleQuote
    ? roundMoney(
        total - (Number.isFinite(paidAmount)
          ? paidAmount
          : 0),
        activeCurrency || "NGN"
      )
    : 0;

  const quoteReady =
    !!saleQuote &&
    !quoteLoading &&
    !quoteError &&
    saleQuote.currency === activeCurrency;

  // --------------------------------------------------
  // Checkout validation
  // --------------------------------------------------

  const handleCheckout = () => {
    if (!currencyReady) {
      toast.error(
        "Please check your business currency settings"
      );
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (debtThreshold === null) {
      toast.error(
        "Debt threshold is unavailable"
      );
      return;
    }

    if (quoteLoading) {
      toast.error(
        "Please wait while the sale total is calculated."
      );
      return;
    }

    if (!quoteReady) {
      toast.error(
        quoteError ||
        "The sale total is unavailable. Please try again."
      );
      return;
    }

    setShowCheckout(true);
  };

  // --------------------------------------------------
  // Complete checkout
  // --------------------------------------------------

  const completeCheckout = async (
    paymentMethod: PaymentMethod
  ) => {
    if (processingPayment) return;

    if (!currencyReady) {
      toast.error(
        "Business currency is unavailable"
      );
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    if (debtThreshold === null) {
      toast.error(
        "Debt threshold is unavailable."
      );
      return;
    }

    if (!quoteReady) {
      toast.error(
        "Please wait for a valid sales quote."
      );
      return;
    }

    if (
      !Number.isFinite(paidAmount) ||
      paidAmount < 0
    ) {
      toast.error(
        "Enter a valid payment amount."
      );
      return;
    }

    if (
      paidAmount >
      roundMoney(total, activeCurrency!)
    ) {
      toast.error(
        "Payment cannot exceed the total amount."
      );
      return;
    }

    if (balance > debtThreshold) {
      toast.error(
        `Debt limit exceeded. Maximum allowed is ${formatMoney(
          debtThreshold
        )}`
      );
      return;
    }

    setProcessingPayment(true);

    const loading = toast.loading(
      "Processing payment..."
    );

    try {
      const saleData = {
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),

        amountPaid: paidAmount,
        paymentMethod,
      };

      const saleRes = await createSaleApi(
        saleData
      );

      const createdSale = saleRes.data;

      // Refresh product stock after successful sale.
      try {
        await queryClient.invalidateQueries({
          queryKey: productQueryKey,
        });
      } catch (error) {
        console.error(
          "Sale succeeded, but product refresh failed:",
          error
        );

        toast.error(
          "Sale completed, but product stock could not be refreshed."
        );
      }

      setCart([]);
      setSaleQuote(null);
      setQuoteError("");
      setAmountPaid("");
      setShowCheckout(false);
      setShowCart(false);

      toast.dismiss(loading);

      if (createdSale.status === "PAID") {
        toast.success(
          `Payment Successful!\nOrder #${createdSale.order_id}`
        );
      } else {
        toast(
          `Debt Recorded\nCustomer owes ${formatMoney(
            Number(createdSale.balance)
          )}`,
          {
            icon: "⚠️",
          }
        );
      }
    } catch (error: any) {
      toast.dismiss(loading);

      const errorMessage =
        error?.response?.data?.detail || "";

      if (
        errorMessage.includes(
          "Insufficient stock"
        )
      ) {
        toast.error("Out of Stock");
      } else if (
        errorMessage.includes(
          "Debt limit exceeded"
        )
      ) {
        toast.error("Debt limit exceeded");
      } else if (
        errorMessage.includes("Payment amount")
      ) {
        toast.error(errorMessage);
      } else {
        toast.error("Payment Failed");

        console.error(
          "Sale error:",
          error
        );
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="space-y-4 pb-4">

      {/* Currency loading */}
      {currencyLoading && !settings && (
        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-sm">
          Loading business currency...
        </div>
      )}

      {/* Currency error */}
      {!currencyLoading &&
        !settings &&
        currencyError && (
          <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 p-4 space-y-2">
            <p className="font-semibold text-red-700 dark:text-red-400">
              Business currency unavailable
            </p>

            <p className="text-sm text-red-600 dark:text-red-300">
              Check your currency settings before recording sales.
              No default currency has been applied.
            </p>

            <button
              onClick={() => {
                refreshSettings().catch(() => {
                  toast.error(
                    "Unable to refresh business settings"
                  );
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

      {/* Product error */}
      {productsError && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 p-4 space-y-2">
          <p className="text-sm text-red-600 dark:text-red-300">
            Unable to load products.
          </p>

          <button
            onClick={() => refetchProducts()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Retry Products
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 mr-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />

          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => setShowCart(true)}
          disabled={!currencyReady}
          className="relative bg-blue-600 text-white p-3 rounded-xl shadow-lg disabled:opacity-50"
        >
          <ShoppingCart className="size-6" />

          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 size-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {/* Active currency */}
      {activeCurrency && (
        <p className="text-xs text-slate-500">
          Active currency: {activeCurrency}
        </p>
      )}

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() =>
              setSelectedCategory(category)
            }
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === category
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Products */}
      {productsLoading ? (
        <div className="text-center py-10 text-slate-500">
          Loading products...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={!currencyReady}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 hover:shadow-md hover:border-blue-500 transition text-left flex flex-col disabled:opacity-50"
            >
              <h3 className="text-xs font-medium text-slate-900 dark:text-white line-clamp-3">
                {product.name}
              </h3>

              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {formatMoney(product.price)}
              </p>

              <p className="text-[10px] text-slate-500">
                Stock: {product.stock}
              </p>
            </button>
          ))}

          {filteredProducts.length === 0 && (
            <p className="col-span-full text-center py-8 text-slate-500">
              No products found.
            </p>
          )}
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setShowCart(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Cart header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                Cart ({itemCount} items)
              </h3>

              <button
                onClick={() => setShowCart(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="size-6" />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="size-16 text-slate-300 dark:text-slate-700 mx-auto mb-3" />

                  <p className="text-slate-500 dark:text-slate-400">
                    Your cart is empty
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                        {item.name}
                      </h4>

                      <p className="text-blue-600 dark:text-blue-400 font-semibold">
                        {formatMoney(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.quantity - 1
                          )
                        }
                        className="size-8 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300"
                      >
                        <Minus className="size-4" />
                      </button>

                      <span className="w-8 text-center font-semibold text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.quantity + 1
                          )
                        }
                        className="size-8 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300"
                      >
                        <Plus className="size-4" />
                      </button>

                      <button
                        onClick={() =>
                          removeFromCart(item.id)
                        }
                        className="size-8 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart footer */}
            {cart.length > 0 && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-3">
                {quoteLoading && (
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Calculating sale total...
                  </p>
                )}

                {quoteError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 space-y-2">
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {quoteError}
                    </p>

                    <button
                      onClick={() => {
                        setCart((current) => [
                          ...current,
                        ]);
                      }}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400"
                    >
                      Retry calculation
                    </button>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span>
                      {quoteReady
                        ? formatMoney(subtotal)
                        : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tax</span>
                    <span>
                      {quoteReady
                        ? formatMoney(tax)
                        : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>Total</span>
                    <span>
                      {quoteReady
                        ? formatMoney(total)
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={clearCart}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Clear
                  </button>

                  <button
                    onClick={handleCheckout}
                    disabled={
                      !quoteReady ||
                      quoteLoading
                    }
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {quoteLoading
                      ? "Calculating..."
                      : "Checkout"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Complete Payment
            </h3>

            {!quoteReady ? (
              <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-700 dark:text-yellow-300">
                The sale quote is unavailable. Close checkout and try again.
              </div>
            ) : (
              <>
                {/* Backend-calculated total */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span>
                        {formatMoney(subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Tax</span>
                      <span>
                        {formatMoney(tax)}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 text-center">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                        Total Amount
                      </p>

                      <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        {formatMoney(total)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      Amount Paid ({activeCurrency})
                    </p>

                    <input
                      type="number"
                      min="0"
                      step={
                        currencyDigits === 0
                          ? "1"
                          : "0.01"
                      }
                      value={amountPaid}
                      onChange={(event) =>
                        setAmountPaid(
                          event.target.value
                        )
                      }
                      className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      placeholder="Enter amount paid"
                    />
                  </div>

                  {/* Balance */}
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                    <p className="text-sm text-slate-500">
                      Balance
                    </p>

                    <p
                      className={`text-xl font-bold ${
                        balance >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatMoney(
                        Math.abs(balance)
                      )}
                    </p>

                    <p className="text-xs mt-1">
                      {balance > 0
                        ? "DEBT (Owing)"
                        : "Fully Paid"}
                    </p>
                  </div>

                  {debtThreshold !== null && (
                    <p className="text-xs text-slate-500">
                      Maximum permitted debt:{" "}
                      {formatMoney(debtThreshold)}
                    </p>
                  )}
                </div>
              </>
            )}

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 mt-4">
              Select payment method:
            </p>

            {/* Payment methods */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                disabled={
                  processingPayment ||
                  !quoteReady
                }
                onClick={() =>
                  completeCheckout("Transfer")
                }
                className="py-4 bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-500 dark:border-purple-700 rounded-xl font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingPayment
                  ? "Processing..."
                  : "🏦 Transfer"}
              </button>

              <button
                disabled={
                  processingPayment ||
                  !quoteReady
                }
                onClick={() =>
                  completeCheckout("Card")
                }
                className="py-4 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-700 rounded-xl font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingPayment
                  ? "Processing..."
                  : "💳 Card"}
              </button>

              <button
                disabled={
                  processingPayment ||
                  !quoteReady
                }
                onClick={() =>
                  completeCheckout("Cash")
                }
                className="py-4 bg-green-50 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-700 rounded-xl font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingPayment
                  ? "Processing..."
                  : "💵 Cash"}
              </button>
            </div>

            <button
              disabled={processingPayment}
              onClick={() =>
                setShowCheckout(false)
              }
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processingPayment
                ? "Processing Payment..."
                : "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
