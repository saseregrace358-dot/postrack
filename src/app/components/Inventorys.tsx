import { useState, useEffect } from "react";
import { Search, Plus, Package, X } from "lucide-react";
import {
  getProducts,
  createProduct,
  updateProductApi
} from "../../api/products";
import { Html5QrcodeScanner } from "html5-qrcode";
import axios from "axios";
import { supabase } from "../../lib/supabase";
type Product = {
  id: number;
  name: string;
  cost: number;
  price: number;
  category: string;
  stock: number;
  image: string
  barcode?: string;
 created_at: string;
 updated_at: string;
 
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
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [imagePreview, setImagePreview] = useState<string>("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [scanning, setScanning] = useState(false);
 const [viewerOpen, setViewerOpen] = useState(false);
const [activeImage, setActiveImage] = useState<string>("");
const [gallery, setGallery] = useState<string[]>([]);
const openViewer = (image: string, images: string[]) => {
  setActiveImage(image);
  setGallery(images);
  setViewerOpen(true);
};
 // ✅ STATES INSIDE COMPONENT
  
   const [newProduct, setNewProduct] = useState<NewProduct>({
    name: "",
    cost: "",
    price: "",
    category: "",
    stock: "",
     image: null,
    barcode: "",
  });

  // =========================
  // INIT LOAD
  // =========================
 const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await getProducts();

      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
  // =========================
  // IMAGE UPLOAD
  // =========================
  const handleImageUpload = (file: File) => {
  // Only show preview locally
  const previewUrl = URL.createObjectURL(file);

  setImagePreview(previewUrl);

  // Store FILE (NOT base64)
  setNewProduct((prev) => ({
    ...prev,
    image: file,
  }));
};
  // =========================
  // BARCODE SCANNER
  // =========================
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
        // ✅ SAVE BARCODE
        setNewProduct((prev) => ({
          ...prev,
          barcode: decodedText,
        }));

        // ✅ STOP SCANNER IMMEDIATELY
        scanner.clear().then(() => {
          setScanning(false);
        });
      },
      (error) => {
        // ignore scan noise
      }
    );
  }, 300);
};
useEffect(() => {
  if (!scanning) return;

  return () => {
    const reader = document.getElementById("reader");
    if (reader) reader.innerHTML = "";
  };
}, [scanning]);
  // =========================
  // ADD PRODUCT
  // =========================
 const addProduct = async () => {
  try {
    let imageUrl = "";

    // Upload image to Supabase
   if (newProduct.image) {
  const fileName = `${Date.now()}-${newProduct.image.name}`;

 const { data } = supabase.storage
  .from("products")
  .getPublicUrl(fileName);

imageUrl = data.publicUrl;
}
    // Save product in FastAPI database
    const res = await createProduct({
      name: newProduct.name,
      cost: Number(newProduct.cost),
      price: Number(newProduct.price),
      category: newProduct.category,
      stock: Number(newProduct.stock),
      barcode: newProduct.barcode,
      image: imageUrl,
    });

    setProducts((prev) => [...prev, res.data]);

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
  } catch (err) {
    console.error(err);
  }
};
 // =========================
  // UPDATE PRODUCT
  // =========================
  const handleUpdateProduct = async () => {
  if (!editProduct) return;

  try {
   const payload = {
  name: editProduct.name,
  cost: Number(editProduct.cost),
  price: Number(editProduct.price),
  category: editProduct.category,
  stock: Number(editProduct.stock),
  image: editProduct.image,
  barcode: editProduct.barcode,
};
await updateProductApi(editProduct.id, payload);
    
    setEditProduct(null);
    setShowEditModal(false); // close modal
  } catch (err) {
    console.error(err);
  }
};

  // =========================
  // FILTER
  // =========================
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProducts = products.length;

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

  const inventoryValue = products.reduce((sum, p) => {
  const cost = Number(p.cost || 0);
  const stock = Number(p.stock || 0);

  return sum + cost * stock;
}, 0);

  const lowStock = products.filter((p) => p.stock <= 20).length;
if (loading) {
  return (
    <div className="flex justify-center items-center h-40">
      <p className="text-gray-500">Loading inventory...</p>
    </div>
  );
}
  return (
    <div className="p-1 space-y-4">

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-xl sm:text-2xl font-bold">Inventory</h2>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
          <p className="text-sm text-gray-500">Products</p>
          <p className="text-xl font-bold">{totalProducts}</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
          <p className="text-sm text-gray-500">Stock Units</p>
          <p className="text-xl font-bold text-green-600">{totalStock}</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
          <p className="text-sm text-gray-500">Low Stock</p>
          <p className="text-xl font-bold text-red-600">{lowStock}</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
          <p className="text-sm text-gray-500">Inventory Value</p>
          <p className="text-xl font-bold text-blue-600">
            ₦{inventoryValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" />
        <input
          className="w-full pl-10 p-2 border rounded"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {filteredProducts.map((product) => (
          <div key={product.id} className="border p-3 rounded">

            <div
              className="flex justify-between cursor-pointer"
              onClick={() =>
                setExpandedId(expandedId === product.id ? null : product.id)
              }
            >
              <div>
  <p className="font-semibold text-lg text-gray-800">
    {product.name}
  </p>

  <p className="text-gray-500 text-xs">Stock Status</p>
              
        {product.stock <= 0 ? (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
            Out of Stock
          </span>
        ) : product.stock <= 10 ? (
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
                ₦{product.price}
              </p>
            </div>

            {expandedId === product.id && (
  <div className="mt-4 border-t pt-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      <div className="flex justify-center">
  <img
  src={product.image}
  alt={product.name}
  className="w-32 h-32 object-cover rounded-lg border cursor-pointer"
 onClick={() =>
  openViewer(
    product.image,
    products
      .filter(p => p.category === product.category)
      .map(p => p.image)
  )
}/>
</div>
      {/* Product Details */}
      <div className="space-y-2 text-sm">
        <p>
          <span className="font-semibold text-gray-600">Category:</span>{" "}
          {product.category}
        </p>

        <p>
          <span className="font-semibold text-gray-600">Cost Price:</span>{" "}
          ₦{Number(product.cost).toLocaleString()}
        </p>

        <p>
          <span className="font-semibold text-gray-600">Selling Price:</span>{" "}
          ₦{Number(product.price).toLocaleString()}
        </p>

        <p>
          <span className="font-semibold text-gray-600">Stock:</span>{" "}
          {product.stock}
        </p>

        <p>
          <span className="font-semibold text-gray-600">Created:</span>{" "}
          {product.created_at
            ? new Date(product.created_at).toLocaleString()
            : "N/A"}
        </p>

        {product.updated_at && (
          <p>
            <span className="font-semibold text-gray-600">Updated:</span>{" "}
            {new Date(product.updated_at).toLocaleString()}
          </p>

          
        )}

         <div>
        <p className="text-gray-500">Stock Status</p>

        {product.stock <= 0 ? (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
            Out of Stock
          </span>
        ) : product.stock <= 10 ? (
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
      

      {/* Barcode Section */}
      <div className="flex flex-col items-center justify-center">
        <div className="border rounded-lg p-3 bg-white">
          <img
            src={`https://barcode.tec-it.com/barcode.ashx?data=${product.barcode || product.id}&code=Code128`}
            alt="barcode"
            className="h-16"
          />
        </div>

        <p className="mt-2 text-xs text-gray-500">
          {product.barcode || product.id}
        </p>

        <button
          onClick={() => {
            setEditProduct(product);
            setShowEditModal(true);
          }}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Edit Product
        </button>
      </div>

    </div>
  </div>
)}          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-10">
          <Package className="mx-auto text-gray-400" />
          <p>No products found</p>
        </div>
      )}

      {showAddModal && (
  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">

    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-3">
        <h2 className="text-xl font-bold">Add New Product</h2>

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
      

      {/* FORM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div>
          <label className="text-xs text-gray-500">Product Name</label>
          <input
            className="w-full p-2 border rounded"
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct({ ...newProduct, name: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Category</label>
          <input
            className="w-full p-2 border rounded"
            value={newProduct.category}
            onChange={(e) =>
              setNewProduct({ ...newProduct, category: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Cost Price</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={newProduct.cost}
            onChange={(e) =>
              setNewProduct({ ...newProduct, cost: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Selling Price</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={newProduct.price}
            onChange={(e) =>
              setNewProduct({ ...newProduct, price: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Stock</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={newProduct.stock}
            onChange={(e) =>
              setNewProduct({ ...newProduct, stock: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Barcode</label>
          <input
            className="w-full p-2 border rounded"
            value={newProduct.barcode}
            onChange={(e) =>
              setNewProduct({ ...newProduct, barcode: e.target.value })
            }
          />
          <button
            onClick={startScanner}
            className="px-3 py-2 bg-black text-white rounded"
          >
            Scan Barcode
          </button>
            {scanning && (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            <div id="reader" className="w-full max-w-sm bg-white rounded" />
          </div>

        )}
        </div>
      </div>

           {/* ACTIONS */}
      <div className="flex justify-end gap-3 pt-4 border-t">

        <button
          onClick={() => setShowAddModal(false)}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>

        <button
          onClick={addProduct}
          className="px-6 py-2 bg-blue-600 text-white rounded"
        >
          Save Product
        </button>
      </div>

    </div>
  </div>
)}  
{showEditModal && editProduct && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">

    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-3">
        <h2 className="text-xl font-bold">Edit Product</h2>

        <button onClick={() => setShowEditModal(false)}>
          <X />
        </button>
      </div>

      {/* FORM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div>
          <label className="text-xs text-gray-500">Product Name</label>
          <input
            className="w-full p-2 border rounded"
            value={editProduct.name}
            onChange={(e) =>
              setEditProduct({ ...editProduct, name: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Category</label>
          <input
            className="w-full p-2 border rounded"
            value={editProduct.category}
            onChange={(e) =>
              setEditProduct({ ...editProduct, category: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Cost Price</label>
          <input
            type="number"
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
          <label className="text-xs text-gray-500">Selling Price</label>
          <input
            type="number"
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
          <label className="text-xs text-gray-500">Stock</label>
          <input
            type="number"
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

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 pt-4 border-t">

        <button
          onClick={() => setShowEditModal(false)}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>

        <button
          onClick={handleUpdateProduct}
          className="px-6 py-2 bg-green-600 text-white rounded"
        >
          Update Product
        </button>
      </div>
    </div>
    
  </div>

)} 
{viewerOpen && (
  <div className="fixed inset-0 z-[999] bg-black/90 flex flex-col items-center justify-center">

    {/* CLOSE */}
    <button
      className="absolute top-5 right-5 text-white text-2xl"
      onClick={() => setViewerOpen(false)}
    >
      ✕
    </button>

    {/* MAIN IMAGE */}
    <img
      src={activeImage}
      className="max-h-[75vh] max-w-[90vw] rounded-lg shadow-lg mb-4"
    />

    {/* THUMBNAILS */}
    <div className="flex gap-3 overflow-x-auto px-4">
      {gallery.map((img, i) => (
        <img
          key={i}
          src={img}
          onClick={() => setActiveImage(img)}
          className={`h-16 w-16 object-cover rounded cursor-pointer border-2 ${
            activeImage === img ? "border-blue-500" : "border-transparent"
          }`}
        />
      ))}
    </div>
  </div>
)}
</div>
  );
  
}
