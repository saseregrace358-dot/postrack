
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Package,
  X,
  Boxes,
  AlertTriangle,
} from "lucide-react";

import {
  createProduct,
  updateProductApi,
} from "../../api/products";

import {
  useProducts,
  productQueryKey,
} from "../hooks/useProducts";

import { useBusinessSettings } from "../context/BusinessSettingsContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Metric } from "./ui/Metric";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

type Product = {
  id: number;
  name: string;
  cost: number;
  price: number;
  category: string;
  stock: number;
  image: string;
  barcode?: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  created_by_name: string;
  business_id: string;
};

type NewProduct = {
  name: string;
  cost: string;
  price: string;
  category: string;
  stock: string;
  image: File | null;
  barcode: string;
};

export function Inventory() {
  const queryClient = useQueryClient();

  const {
    settings,
    currency: activeCurrency,
    loading: currencyLoading,
    error: currencySettingsError,
    refreshSettings,
  } = useBusinessSettings();

  // Shared products query: used by POS and Inventory.
  const {
    data: products = [],
    isLoading: loading,
    isError: productsError,
    refetch: refetchProducts,
  } = useProducts() as {
    data: Product[];
    isLoading: boolean;
    isError: boolean;
    refetch: () => Promise<unknown>;
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [imagePreview, setImagePreview] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeImage, setActiveImage] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);

  const currencyError = !settings && !!currencySettingsError;

  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: "",
    cost: "",
    price: "",
    category: "",
    stock: "",
    image: null,
    barcode: "",
  });

  const categories = [
    "Beverages",
    "Food",
    "Snacks",
    "Dairy",
    "Electronics",
    "Stationery",
    "Clothing",
    "Health & Beauty",
    "Household",
    "Frozen Foods",
    "Bakery",
    "Pharmacy",
    "Drinks",
    "Accessories",
  ];

  const LOW_STOCK_THRESHOLD = 5;

  // Format money using the active business currency.
  // en-NG displays the naira symbol when the active currency is NGN.
  const formatMoney = (amount: number) => {
    if (!activeCurrency) {
      return "Currency unavailable";
    }

    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: activeCurrency,
        currencyDisplay: "narrowSymbol",
      }).format(Number(amount) || 0);
    } catch {
      return "Currency unavailable";
    }
  };

  // Retry loading business settings.
  const retrySettings = async () => {
    try {
      await refreshSettings();
      toast.success("Business settings refreshed");
    } catch {
      toast.error("Unable to load business settings");
    }
  };

  // Refresh the shared product cache.
  const refreshProducts = async () => {
    try {
      await refetchProducts();
    } catch {
      toast.error("Unable to refresh products");
    }
  };

  // Image upload preview.
  const handleImageUpload = (file: File) => {
    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);

    setNewProduct((prev) => ({
      ...prev,
      image: file,
    }));
  };

  // Barcode scanner.
  const startScanner = () => {
    setScanning(true);

    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: 250 },
        false
      );

      scanner.render(
        (decodedText) => {
          setNewProduct((prev) => ({
            ...prev,
            barcode: decodedText,
          }));

          scanner.clear().then(() => {
            setScanning(false);
          });
        },
        () => {
          // Ignore scan noise.
        }
      );
    }, 300);
  };

  useEffect(() => {
    if (!scanning) return;

    return () => {
      const reader = document.getElementById("reader");

      if (reader) {
        reader.innerHTML = "";
      }
    };
  }, [scanning]);

  // Add product.
  const addProduct = async () => {
    if (saving) return;

    if (
      !settings ||
      !activeCurrency ||
      currencyLoading ||
      currencyError
    ) {
      toast.error("Business currency is unavailable");
      return;
    }

    if (!newProduct.name.trim()) {
      toast.error("Enter a product name");
      return;
    }

    if (
      newProduct.cost === "" ||
      newProduct.price === "" ||
      newProduct.stock === ""
    ) {
      toast.error("Complete all required product fields");
      return;
    }

    const cost = Number(newProduct.cost);
    const price = Number(newProduct.price);
    const stock = Number(newProduct.stock);

    if (
      !Number.isFinite(cost) ||
      !Number.isFinite(price) ||
      !Number.isFinite(stock) ||
      cost < 0 ||
      price < 0 ||
      stock < 0
    ) {
      toast.error("Enter valid non-negative product values");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = "";

      if (newProduct.image) {
        const fileName = `${Date.now()}-${newProduct.image.name}`;

        const { data } = supabase.storage
          .from("products")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      await createProduct({
        name: newProduct.name,
        cost,
        price,
        category: newProduct.category,
        stock,
        barcode: newProduct.barcode,
        image: imageUrl,
      });

      // Update the shared product cache.
      await queryClient.invalidateQueries({
        queryKey: productQueryKey,
      });

      setNewProduct({
        name: "",
        cost: "",
        price: "",
        category: "",
        stock: "",
        image: null,
        barcode: "",
      });

      setImagePreview("");
      setShowAddModal(false);

      toast.success("Product saved successfully");
    } catch (err: any) {
      console.error(err);

      toast.error(
        err.response?.data?.detail || "Failed to save product"
      );
    } finally {
      setSaving(false);
    }
  };

  // Update product.
  const handleUpdateProduct = async () => {
    if (!editProduct || saving) return;

    if (
      !settings ||
      !activeCurrency ||
      currencyLoading ||
      currencyError
    ) {
      toast.error("Business currency is unavailable");
      return;
    }

    const cost = Number(editProduct.cost);
    const price = Number(editProduct.price);
    const stock = Number(editProduct.stock);

    if (
      !Number.isFinite(cost) ||
      !Number.isFinite(price) ||
      !Number.isFinite(stock) ||
      cost < 0 ||
      price < 0 ||
      stock < 0
    ) {
      toast.error("Enter valid non-negative product values");
      return;
    }

    try {
      setSaving(true);

      await updateProductApi(editProduct.id, {
        name: editProduct.name,
        cost,
        price,
        category: editProduct.category,
        stock,
        image: editProduct.image,
        barcode: editProduct.barcode,
      });

      // Refresh the shared cache after the update.
      await queryClient.invalidateQueries({
        queryKey: productQueryKey,
      });

      setEditProduct(null);
      setShowEditModal(false);

      toast.success("Product updated successfully");
    } catch (err: any) {
      console.error(err);

      toast.error(
        err.response?.data?.detail || "Failed to update product"
      );
    } finally {
      setSaving(false);
    }
  };

  // Filter products.
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (sum, product) => sum + product.stock,
    0
  );

  const lowStock = products.filter(
    (product) =>
      product.stock > 0 &&
      product.stock <= LOW_STOCK_THRESHOLD
  ).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-gray-500">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="p-1 space-y-4">

      {/* Currency loading */}
      {currencyLoading && !settings && (
        <div className="border border-blue-200 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Loading business currency...
          </p>
        </div>
      )}

      {/* Currency warning */}
      {currencyError && (
        <div className="border border-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Business currency unavailable
          </p>

          <p className="text-xs text-red-600 dark:text-red-300">
            Check your business currency settings before adding or
            editing products. No default currency has been applied.
          </p>

          <button
            onClick={retrySettings}
            className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg"
          >
            Retry Settings
          </button>
        </div>
      )}

      {/* Settings refresh warning */}
      {settings && currencySettingsError && (
        <div className="border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Unable to refresh settings. Previously loaded business
            settings are still being used.
          </p>
        </div>
      )}

      {/* Product loading error */}
      {productsError && (
        <div className="border border-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 space-y-2">
          <p className="text-sm text-red-700 dark:text-red-400">
            Unable to load products.
          </p>

          <button
            onClick={refreshProducts}
            className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg"
          >
            Retry Products
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <button
          onClick={() => setShowAddModal(true)}
          disabled={
            !settings ||
            currencyLoading ||
            currencyError ||
            !activeCurrency
          }
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {/* Active currency */}
      {activeCurrency && (
        <p className="text-xs text-gray-500">
          Product prices displayed in {activeCurrency}
        </p>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="col-span-2 lg:col-span-1">
          <Metric
            title="Products"
            value={totalProducts}
            icon={Package}
          />
        </div>

        <Metric
          title="Stock Units"
          value={totalStock}
          icon={Boxes}
        />

        <Metric
          title="Low Stock"
          value={lowStock}
          icon={AlertTriangle}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" />

        <input
          className="w-full pl-10 p-2 border rounded"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Product list */}
      <div className="space-y-3">
        {filteredProducts.map((product) => (
          <div key={product.id} className="border p-3 rounded">

            <div
              className="flex justify-between cursor-pointer"
              onClick={() =>
                setExpandedId(
                  expandedId === product.id ? null : product.id
                )
              }
            >
              <div>
                <p className="font-semibold text-lg text-gray-800">
                  {product.name}
                </p>

                <p className="text-gray-500 text-xs">
                  Stock Status
                </p>

                {product.stock <= 0 ? (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                    Out of Stock
                  </span>
                ) : product.stock <= LOW_STOCK_THRESHOLD ? (
                  <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                    Low Stock
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                    In Stock
                  </span>
                )}
              </div>

              <p className="font-semibold text-blue-600">
                {formatMoney(product.price)}
              </p>
            </div>

            {expandedId === product.id && (
              <div className="mt-4 border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Product Details */}
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-semibold text-gray-600">
                        Category:
                      </span>{" "}
                      {product.category}
                    </p>

                    <p>
                      <span className="font-semibold text-gray-600">
                        Cost Price:
                      </span>{" "}
                      {formatMoney(Number(product.cost))}
                    </p>

                    <p>
                      <span className="font-semibold text-gray-600">
                        Selling Price:
                      </span>{" "}
                      {formatMoney(Number(product.price))}
                    </p>

                    <p>
                      <span className="font-semibold text-gray-600">
                        Stock:
                      </span>{" "}
                      {product.stock}
                    </p>

                    <p>
                      <span className="font-semibold text-gray-600">
                        Created:
                      </span>{" "}
                      {product.created_at
                        ? new Date(product.created_at).toLocaleString()
                        : "N/A"}
                    </p>

                    {product.updated_at && (
                      <p>
                        <span className="font-semibold text-gray-600">
                          Updated:
                        </span>{" "}
                        {new Date(product.updated_at).toLocaleString()}
                      </p>
                    )}

                    <div>
                      <p className="text-gray-500">Stock Status</p>

                      {product.stock <= 0 ? (
                        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                          Out of Stock
                        </span>
                      ) : product.stock <= LOW_STOCK_THRESHOLD ? (
                        <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Actions */}
                  <div className="flex flex-col items-center justify-center">
                    <button
                      onClick={() => {
                        setEditProduct(product);
                        setShowEditModal(true);
                      }}
                      disabled={
                        !settings ||
                        currencyError ||
                        !activeCurrency
                      }
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Edit Product
                    </button>

                    <p className="mt-3">
                      <span className="font-semibold text-gray-600">
                        Created By:
                      </span>{" "}
                      {product.created_by_name}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredProducts.length === 0 && !productsError && (
        <div className="text-center py-10">
          <Package className="mx-auto text-gray-400" />
          <p>No products found</p>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl p-6 space-y-6">

            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-bold">
                Add New Product
              </h2>

              <button
                onClick={() => {
                  setShowAddModal(false);
                  setScanning(false);
                  setImagePreview("");
                }}
              >
                <X />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Enter prices in {activeCurrency}.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="text-xs text-gray-500">
                  Product Name
                </label>

                <input
                  className="w-full p-2 border rounded"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">
                  Category
                </label>

                <input
                  list="add-category-list"
                  className="w-full p-2 border rounded"
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      category: e.target.value,
                    })
                  }
                />

                <datalist id="add-category-list">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-xs text-gray-500">
                  Cost Price ({activeCurrency})
                </label>

                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border rounded"
                  value={newProduct.cost}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      cost: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">
                  Selling Price ({activeCurrency})
                </label>

                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border rounded"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      price: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">
                  Stock
                </label>

                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border rounded"
                  value={newProduct.stock}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      stock: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={addProduct}
                disabled={
                  saving ||
                  !settings ||
                  currencyLoading ||
                  currencyError
                }
                className={`px-6 py-2 rounded text-white ${
                  saving || !settings || currencyError
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {saving ? "Saving..." : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl p-6 space-y-6">

            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-bold">
                Edit Product
              </h2>

              <button onClick={() => setShowEditModal(false)}>
                <X />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Product prices are displayed in {activeCurrency}.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="text-xs text-gray-500">
                  Product Name
                </label>

                <input
                  className="w-full p-2 border rounded"
                  value={editProduct.name}
                  onChange={(e) =>
                    setEditProduct({
                      ...editProduct,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">
                  Category
                </label>

                <input
                  list="edit-category-list"
                  className="w-full p-2 border rounded"
                  value={editProduct.category}
                  onChange={(e) =>
                    setEditProduct({
                      ...editProduct,
                      category: e.target.value,
                    })
                  }
                />

                <datalist id="edit-category-list">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-xs text-gray-500">
                  Cost Price ({activeCurrency})
                </label>

                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border rounded"
                  value={editProduct.cost}
                  onChange={(e) =>
                    setEditProduct({
                      ...editProduct,
                      cost: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">
                  Selling Price ({activeCurrency})
                </label>

                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border rounded"
                  value={editProduct.price}
                  onChange={(e) =>
                    setEditProduct({
                      ...editProduct,
                      price: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">
                  Stock
                </label>

                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border rounded"
                  value={editProduct.stock}
                  onChange={(e) =>
                    setEditProduct({
                      ...editProduct,
                      stock: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateProduct}
                disabled={
                  saving ||
                  !settings ||
                  currencyLoading ||
                  currencyError
                }
                className="px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {saving ? "Updating..." : "Update Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {viewerOpen && (
        <div className="fixed inset-0 z-[999] bg-black/90 flex flex-col items-center justify-center">

          <button
            className="absolute top-5 right-5 text-white text-2xl"
            onClick={() => setViewerOpen(false)}
          >
            ✕
          </button>

          <img
            src={activeImage}
            className="max-h-[75vh] max-w-[90vw] rounded-lg shadow-lg mb-4"
            alt="Product"
          />

          <div className="flex gap-3 overflow-x-auto px-4">
            {gallery.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Product image ${i + 1}`}
                onClick={() => setActiveImage(img)}
                className={`h-16 w-16 object-cover rounded cursor-pointer border-2 ${
                  activeImage === img
                    ? "border-blue-500"
                    : "border-transparent"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
