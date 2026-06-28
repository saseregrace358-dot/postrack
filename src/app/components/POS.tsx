import { useState, useEffect} from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, X } from "lucide-react";
import { getProducts } from "../../api/products";
import { createSaleApi } from "../../api/sales";
 import toast from "react-hot-toast";
/* ✅ MOVE TYPES TO TOP (IMPORTANT FIX) */
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


export function POS() {
  /* ✅ NOW TYPES WORK PROPERLY */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const paidAmount = Number(amountPaid) || 0;

  const [products, setProducts] = useState<Product[]>([]);

/* PRODUCTS */
useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await getProducts();
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  fetchData();
}, []);

const categories = [
  "All",
  ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
];


  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;

    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.id !== id));
    } else {
      setCart(
        cart.map((item) =>
          item.id === id ? { ...item, quantity } : item
        )
      );
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
const [taxEnabled, setTaxEnabled] = useState(false);
      const TAX_ENABLED = false; // true = tax on, false = tax off
    const TAX_RATE = 0.075;

    const tax = TAX_ENABLED ? subtotal * TAX_RATE : 0;
    const total = subtotal + tax;
 const balance = total - paidAmount;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => setShowCheckout(true);

  const completeCheckout = async (paymentMethod: string) => {
  const loading = toast.loading("Processing payment...");

  try {
    const saleRes = await createSaleApi({
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      tax,
      total,
      amountPaid: paidAmount,
      balance,
      paymentMethod,
    });

    toast.dismiss(loading);

    const createdSale = saleRes.data;

    // Refresh products
    const res = await getProducts();
    setProducts(res.data);

    // Clear cart
    setCart([]);
    setAmountPaid("");
    setShowCheckout(false);
    setShowCart(false);

    if (createdSale.status === "PAID") {
      toast.success(
        `Payment Successful!\nOrder #${createdSale.order_id}`
      );
    } else {
      toast(
        `Debt Recorded\nCustomer owes ₦${createdSale.balance.toLocaleString()}`,
        {
          icon: "⚠️",
        }
      );
    }
  } catch (err: any) {
    toast.dismiss(loading);

    if (
      err.response?.data?.detail?.includes("Insufficient stock")
    ) {
      toast.error("Out of Stock");
      return;
    }

    toast.error("Payment Failed");
  }
};
   return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Point of Sale</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Scan or select products</p>
        </div>
        <button
          onClick={() => setShowCart(true)}
          className="relative bg-blue-600 text-white p-3 rounded-xl shadow-lg"
        >
          <ShoppingCart className="size-6" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 size-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
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

      {/* Products Grid */}
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
  {filteredProducts.map((product) => (
    <button
      key={product.id}
      onClick={() => addToCart(product)}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 hover:shadow-md hover:border-blue-500 transition text-left flex flex-col"
    >
      
      {/* NAME */}
      <h3 className="text-xs font-medium text-slate-900 dark:text-white line-clamp-3">
        {product.name}
      </h3>

      {/* PRICE */}
      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
        ₦{product.price.toLocaleString()}
      </p>

      {/* STOCK */}
      <p className="text-[10px] text-slate-500">
        Stock: {product.stock}
      </p>
    </button>
  ))}
</div>
      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCart(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cart Header */}
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

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="size-16 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Your cart is empty</p>
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
                        ₦{item.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="size-8 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="w-8 text-center font-semibold text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="size-8 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300"
                      >
                        <Plus className="size-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="size-8 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <span>Apply Tax (7.5%)</span>

                  <button
                    onClick={() => setTaxEnabled(!taxEnabled)}
                    className={`px-3 py-1 rounded ${
                      taxEnabled
                        ? "bg-green-600 text-white"
                        : "bg-gray-300 text-black"
                    }`}
                  >
                    {taxEnabled ? "ON" : "OFF"}
                  </button>
                </div>
                  <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>Total</span>
                    <span>₦{total.toFixed(2)}</span>
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
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                  >
                    Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Complete Payment
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  ₦{total.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
  {/* Amount Paid Input */}
  <div>
    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
      Amount Paid
    </p>
    <input
      type="number"
      value={amountPaid}
      onChange={(e) => setAmountPaid(e.target.value)}
      className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
      placeholder="Enter amount paid"
    />
  </div>

  {/* Balance Display */}
  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
    <p className="text-sm text-slate-500">Balance</p>
    <p
      className={`text-xl font-bold ${
        balance >= 0 ? "text-green-600" : "text-red-600"
      }`}
    >
      ₦{Math.abs(balance).toLocaleString()}
    </p>

    <p className="text-xs mt-1">
  {balance > 0 ? "DEBT (Owing)" : "Fully Paid"}
</p>
  </div>
</div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Select payment method:</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => completeCheckout("Cash")}
                className="py-4 bg-green-50 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-700 rounded-xl font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
              >
                💵 Cash
              </button>
              <button
                onClick={() => completeCheckout("Card")}
                className="py-4 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-700 rounded-xl font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                💳 Card
              </button>
              <button
                onClick={() => completeCheckout("Transfer")}
                className="py-4 bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-500 dark:border-purple-700 rounded-xl font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
              >
                🏦 Transfer
              </button>
              <button
                onClick={() => completeCheckout("Mobile Money")}
                className="py-4 bg-orange-50 dark:bg-orange-900/30 border-2 border-orange-500 dark:border-orange-700 rounded-xl font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
              >
                📱 Mobile
              </button>
            </div>
            <button
              onClick={() => setShowCheckout(false)}
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
