import { useState, useEffect, useRef } from "react";
import {
    Plus,
    Package,
    TrendingDown,
    TrendingUp,
    Trash2,
    Send,
    Pencil,
    ImagePlus,
    X,
    Layers,
    ToggleLeft,
    ToggleRight,
    Search,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { getCached, setCached, invalidateCache } from "../../lib/queryCache";
import { Modal } from "../../components/Modal";
import { Database } from "../../types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type InventoryTransaction = Database["public"]["Tables"]["inventory_transactions"]["Row"] & {
    product: { name: string; unit: string };
};

interface OrderOption {
    id: string;
    order_number: string;
    status: string;
    customer: { name: string } | null;
    items: {
        id: string;
        product_id: string;
        quantity: number;
        product: { name: string; unit: string };
    }[];
}

interface ShipmentLine {
    product_id: string;
    quantity: number;
}

type Tab = "stock" | "products";

const UNITS = ["м²", "шт", "пог.м", "кг", "т"];
const SHAPES = ["Прямоугольная", "Квадратная", "Волна", "Катушка", "Ромб", "Звезда", "Другая"];
const PURPOSES = ["Пешеходная зона", "Дорожное покрытие", "Площадь", "Парковка", "Дворовая территория"];

interface ProductFormData {
    name: string;
    category: string;
    subcategory: string;
    description: string;
    price_per_sqm: string;
    stock_quantity: string;
    unit: string;
    shape: string;
    color: string;
    purpose: string;
    is_active: boolean;
    photo_url: string;
}

const EMPTY_FORM: ProductFormData = {
    name: "",
    category: "",
    subcategory: "",
    description: "",
    price_per_sqm: "",
    stock_quantity: "0",
    unit: "м²",
    shape: "",
    color: "",
    purpose: "",
    is_active: true,
    photo_url: "",
};

function productToForm(p: Product): ProductFormData {
    return {
        name: p.name,
        category: p.category,
        subcategory: p.subcategory || "",
        description: p.description,
        price_per_sqm: String(p.price_per_sqm),
        stock_quantity: String(p.stock_quantity),
        unit: p.unit,
        shape: p.shape || "",
        color: p.color || "",
        purpose: p.purpose || "",
        is_active: p.is_active,
        photo_url: p.photo_url || "",
    };
}

export function InventorySection() {
    const [activeTab, setActiveTab] = useState<Tab>("stock");

    // ---------- inventory state ----------
    const [products, setProducts] = useState<Product[]>([]);
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [orders, setOrders] = useState<OrderOption[]>([]);
    const [loading, setLoading] = useState(true);

    const [showAddReceiving, setShowAddReceiving] = useState(false);
    const [showAddShipment, setShowAddShipment] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [receivingForm, setReceivingForm] = useState({ product_id: "", quantity: 0, notes: "" });

    const [shipmentMode, setShipmentMode] = useState<"manual" | "order">("manual");
    const [selectedOrderId, setSelectedOrderId] = useState("");
    const [shipmentLines, setShipmentLines] = useState<ShipmentLine[]>([{ product_id: "", quantity: 0 }]);
    const [shipmentNotes, setShipmentNotes] = useState("");

    // ---------- product CRUD state ----------
    const [productSearch, setProductSearch] = useState("");
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productForm, setProductForm] = useState<ProductFormData>(EMPTY_FORM);
    const [productSubmitting, setProductSubmitting] = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadInventory();
        loadTransactions();
        loadDeliveryOrders();
    }, []);

    // ---- loaders ----

    async function loadInventory(force = false) {
        const KEY = "inv_products";
        if (!force) {
            const cached = getCached<Product[]>(KEY);
            if (cached) {
                setProducts(cached);
                setLoading(false);
                supabase
                    .from("products")
                    .select("*")
                    .order("name", { ascending: true })
                    .then(({ data }) => {
                        if (data) { setCached(KEY, data); setProducts(data); }
                    });
                return;
            }
        }
        try {
            const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
            if (error) throw error;
            setCached(KEY, data || []);
            setProducts(data || []);
        } catch (err) {
            console.error("Error loading inventory:", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadTransactions(force = false) {
        const KEY = "inv_transactions";
        if (!force) {
            const cached = getCached<InventoryTransaction[]>(KEY);
            if (cached) {
                setTransactions(cached);
                supabase
                    .from("inventory_transactions")
                    .select("*, product:products(name, unit)")
                    .order("created_at", { ascending: false })
                    .limit(20)
                    .then(({ data }) => {
                        if (data) { setCached(KEY, data as InventoryTransaction[]); setTransactions(data as InventoryTransaction[]); }
                    });
                return;
            }
        }
        try {
            const { data, error } = await supabase
                .from("inventory_transactions")
                .select("*, product:products(name, unit)")
                .order("created_at", { ascending: false })
                .limit(20);
            if (error) throw error;
            setCached(KEY, data as InventoryTransaction[]);
            setTransactions(data as InventoryTransaction[]);
        } catch (err) {
            console.error("Error loading transactions:", err);
        }
    }

    async function loadDeliveryOrders(force = false) {
        const KEY = "inv_delivery_orders";
        if (!force) {
            const cached = getCached<OrderOption[]>(KEY);
            if (cached) {
                setOrders(cached);
                supabase
                    .from("orders")
                    .select(`id, order_number, status, customer:customers(name), items:order_items(id, product_id, quantity, product:products(name, unit))`)
                    .in("status", ["Доставляется", "Подтвержден", "В обработке"])
                    .order("created_at", { ascending: false })
                    .then(({ data }) => {
                        if (data) { setCached(KEY, data as unknown as OrderOption[]); setOrders(data as unknown as OrderOption[]); }
                    });
                return;
            }
        }
        try {
            const { data, error } = await supabase
                .from("orders")
                .select(`id, order_number, status, customer:customers(name), items:order_items(id, product_id, quantity, product:products(name, unit))`)
                .in("status", ["Доставляется", "Подтвержден", "В обработке"])
                .order("created_at", { ascending: false });
            if (error) throw error;
            setCached(KEY, (data as unknown as OrderOption[]) || []);
            setOrders((data as unknown as OrderOption[]) || []);
        } catch (err) {
            console.error("Error loading orders:", err);
        }
    }

    // ---- inventory handlers ----

    function handleOrderSelect(orderId: string) {
        setSelectedOrderId(orderId);
        if (!orderId) { setShipmentLines([{ product_id: "", quantity: 0 }]); return; }
        const order = orders.find((o) => o.id === orderId);
        if (order && order.items.length > 0) {
            setShipmentLines(order.items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })));
        }
    }

    function addShipmentLine() { setShipmentLines((prev) => [...prev, { product_id: "", quantity: 0 }]); }
    function removeShipmentLine(index: number) { setShipmentLines((prev) => prev.filter((_, i) => i !== index)); }
    function updateShipmentLine(index: number, field: keyof ShipmentLine, value: string | number) {
        setShipmentLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
    }

    async function handleAddReceiving(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const selectedProduct = products.find((p) => p.id === receivingForm.product_id);
            if (!selectedProduct) throw new Error("Product not found");
            const { error: txErr } = await supabase.from("inventory_transactions").insert({
                product_id: receivingForm.product_id,
                transaction_type: "incoming",
                quantity: receivingForm.quantity,
                notes: receivingForm.notes,
            });
            if (txErr) throw txErr;
            const { error: updErr } = await supabase
                .from("products")
                .update({ stock_quantity: selectedProduct.stock_quantity + receivingForm.quantity })
                .eq("id", receivingForm.product_id);
            if (updErr) throw updErr;
            setReceivingForm({ product_id: "", quantity: 0, notes: "" });
            setShowAddReceiving(false);
            invalidateCache("inv_products", "inv_transactions");
            loadInventory(true);
            loadTransactions(true);
        } catch (err) {
            console.error("Error adding receiving:", err);
            alert("Ошибка при добавлении прихода");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleAddShipment(e: React.FormEvent) {
        e.preventDefault();
        const validLines = shipmentLines.filter((l) => l.product_id && l.quantity > 0);
        if (validLines.length === 0) { alert("Добавьте хотя бы одну позицию с товаром и количеством"); return; }
        for (const line of validLines) {
            const product = products.find((p) => p.id === line.product_id);
            if (!product) continue;
            if (product.stock_quantity < line.quantity) {
                alert(`Недостаточно товара на складе: ${product.name}. Остаток: ${product.stock_quantity} ${product.unit}, требуется: ${line.quantity} ${product.unit}`);
                return;
            }
        }
        setSubmitting(true);
        try {
            const orderRef = shipmentMode === "order" && selectedOrderId ? selectedOrderId : null;
            const notesSuffix = shipmentMode === "order" && selectedOrderId
                ? ` (Заказ ${orders.find((o) => o.id === selectedOrderId)?.order_number || ""})`.trim()
                : "";
            for (const line of validLines) {
                const product = products.find((p) => p.id === line.product_id)!;
                const { error: txErr } = await supabase.from("inventory_transactions").insert({
                    product_id: line.product_id,
                    transaction_type: "outgoing",
                    quantity: -line.quantity,
                    order_id: orderRef,
                    notes: (shipmentNotes + notesSuffix).trim(),
                });
                if (txErr) throw txErr;
                const { error: updErr } = await supabase
                    .from("products")
                    .update({ stock_quantity: product.stock_quantity - line.quantity })
                    .eq("id", line.product_id);
                if (updErr) throw updErr;
            }
            setShipmentLines([{ product_id: "", quantity: 0 }]);
            setShipmentNotes("");
            setSelectedOrderId("");
            setShipmentMode("manual");
            setShowAddShipment(false);
            invalidateCache("inv_products", "inv_transactions");
            loadInventory(true);
            loadTransactions(true);
        } catch (err) {
            console.error("Error adding shipment:", err);
            alert("Ошибка при добавлении отгрузки");
        } finally {
            setSubmitting(false);
        }
    }

    async function deleteTransaction(id: string) {
        if (!confirm("Удалить операцию и вернуть остаток товара в прежнее состояние?")) return;
        try {
            const tx = transactions.find((t) => t.id === id);
            if (!tx) return;
            const { data: freshProduct, error: fetchErr } = await supabase
                .from("products").select("stock_quantity").eq("id", tx.product_id).maybeSingle();
            if (fetchErr) throw fetchErr;
            const { error: delErr } = await supabase.from("inventory_transactions").delete().eq("id", id);
            if (delErr) throw delErr;
            if (freshProduct) {
                const { error: updErr } = await supabase
                    .from("products")
                    .update({ stock_quantity: freshProduct.stock_quantity - tx.quantity })
                    .eq("id", tx.product_id);
                if (updErr) throw updErr;
            }
            invalidateCache("inv_products", "inv_transactions");
            loadInventory(true);
            loadTransactions(true);
        } catch (err) {
            console.error("Error deleting transaction:", err);
            alert("Ошибка при удалении операции");
        }
    }

    // ---- product CRUD handlers ----

    function openCreateProduct() {
        setEditingProduct(null);
        setProductForm(EMPTY_FORM);
        setShowProductModal(true);
    }

    function openEditProduct(product: Product) {
        setEditingProduct(product);
        setProductForm(productToForm(product));
        setShowProductModal(true);
    }

    function closeProductModal() {
        setShowProductModal(false);
        setEditingProduct(null);
        setProductForm(EMPTY_FORM);
    }

    async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoUploading(true);
        try {
            const ext = file.name.split(".").pop();
            const fileName = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const { error: upErr } = await supabase.storage.from("Fabrika-images").upload(fileName, file, { upsert: false });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from("Fabrika-images").getPublicUrl(fileName);
            setProductForm((prev) => ({ ...prev, photo_url: data.publicUrl }));
        } catch (err) {
            console.error("Photo upload error:", err);
            alert("Ошибка загрузки фото");
        } finally {
            setPhotoUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function handleProductSubmit(e: React.FormEvent) {
        e.preventDefault();
        setProductSubmitting(true);
        try {
            const payload = {
                name: productForm.name.trim(),
                category: productForm.category.trim(),
                subcategory: productForm.subcategory.trim() || null,
                description: productForm.description.trim(),
                price_per_sqm: parseFloat(productForm.price_per_sqm) || 0,
                stock_quantity: parseInt(productForm.stock_quantity) || 0,
                unit: productForm.unit,
                shape: productForm.shape || null,
                color: productForm.color.trim() || null,
                purpose: productForm.purpose || null,
                is_active: productForm.is_active,
                photo_url: productForm.photo_url || "",
            };
            if (editingProduct) {
                const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("products").insert(payload);
                if (error) throw error;
            }
            invalidateCache("inv_products", "catalog_products");
            await loadInventory(true);
            closeProductModal();
        } catch (err) {
            console.error("Product save error:", err);
            alert("Ошибка при сохранении товара");
        } finally {
            setProductSubmitting(false);
        }
    }

    async function handleDeleteProduct(product: Product) {
        if (!confirm(`Удалить товар «${product.name}»? Это действие необратимо.`)) return;
        try {
            const { error } = await supabase.from("products").delete().eq("id", product.id);
            if (error) throw error;
            invalidateCache("inv_products", "catalog_products");
            await loadInventory(true);
        } catch (err) {
            console.error("Delete product error:", err);
            alert("Ошибка при удалении товара");
        }
    }

    async function toggleProductActive(product: Product) {
        try {
            const { error } = await supabase.from("products").update({ is_active: !product.is_active }).eq("id", product.id);
            if (error) throw error;
            invalidateCache("inv_products", "catalog_products");
            loadInventory(true);
        } catch (err) {
            console.error("Toggle active error:", err);
        }
    }

    // ---- derived ----
    const lowStockProducts = products.filter((p) => p.stock_quantity < 50);
    const filteredProducts = products.filter((p) => {
        if (!productSearch.trim()) return true;
        const q = productSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    });

    if (loading) return <div className="text-center py-12">Загрузка склада...</div>;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-wrap gap-3 justify-between items-start mb-6">
                <div>
                    <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Складской учет</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Остатки продукции и управление товарами</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === "stock" ? (
                        <>
                            <button
                                onClick={() => setShowAddShipment(true)}
                                className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors font-semibold border border-amber-200 text-sm"
                            >
                                <Send className="h-4 w-4 flex-shrink-0" />
                                <span className="hidden xs:inline">Отгрузка</span>
                                <span className="xs:hidden">Отгрузка</span>
                            </button>
                            <button
                                onClick={() => setShowAddReceiving(true)}
                                className="flex items-center gap-1.5 bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-semibold"
                            >
                                <Plus className="h-4 w-4 flex-shrink-0" />
                                <span className="hidden sm:inline">Добавить приход</span>
                                <span className="sm:hidden">Приход</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={openCreateProduct}
                            className="flex items-center gap-1.5 bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-semibold"
                        >
                            <Plus className="h-4 w-4 flex-shrink-0" />
                            <span className="hidden sm:inline">Новый товар</span>
                            <span className="sm:hidden">Добавить</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-full sm:w-fit">
                <button
                    onClick={() => setActiveTab("stock")}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                        activeTab === "stock" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"
                    }`}
                >
                    <Package className="h-4 w-4" />
                    Склад
                </button>
                <button
                    onClick={() => setActiveTab("products")}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                        activeTab === "products" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"
                    }`}
                >
                    <Layers className="h-4 w-4" />
                    Товары
                    <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">{products.length}</span>
                </button>
            </div>

            {/* ======================== STOCK TAB ======================== */}
            {activeTab === "stock" && (
                <>
                    {lowStockProducts.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center space-x-2 mb-2">
                                <Package className="h-5 w-5 text-yellow-600" />
                                <h3 className="font-semibold text-yellow-900">Товары с низким остатком</h3>
                            </div>
                            <div className="space-y-1">
                                {lowStockProducts.map((product) => (
                                    <p key={product.id} className="text-sm text-yellow-800">
                                        {product.name}: {product.stock_quantity} {product.unit}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                        <div className="bg-white rounded-lg shadow-sm sm:shadow-lg p-4 sm:p-6">
                            <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4">Остатки на складе</h2>
                            <div className="space-y-3">
                                {products.map((product) => (
                                    <div key={product.id} className="flex items-center justify-between p-2.5 sm:p-3 border border-gray-200 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                                            <p className="text-xs text-gray-600">{product.category}</p>
                                        </div>
                                        <div className="text-right ml-4">
                                            <div className={`text-base sm:text-lg font-bold ${
                                                product.stock_quantity < 50 ? "text-red-600"
                                                : product.stock_quantity < 100 ? "text-yellow-600"
                                                : "text-green-600"
                                            }`}>
                                                {product.stock_quantity} {product.unit}
                                            </div>
                                            <div className="text-xs text-gray-500">{product.price_per_sqm} ₽/{product.unit}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm sm:shadow-lg p-4 sm:p-6">
                            <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4">Последние операции</h2>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                {transactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-start space-x-2.5 sm:space-x-3 p-2.5 sm:p-3 border border-gray-200 rounded-lg">
                                        <div className={`mt-1 ${transaction.transaction_type === "incoming" ? "text-green-600" : "text-red-600"}`}>
                                            {transaction.transaction_type === "incoming"
                                                ? <TrendingUp className="h-5 w-5" />
                                                : <TrendingDown className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{transaction.product?.name}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {transaction.transaction_type === "incoming" ? "Приход"
                                                        : transaction.transaction_type === "outgoing" ? "Отгрузка"
                                                        : "Корректировка"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2 ml-2 shrink-0">
                                                    <div className={`text-base sm:text-lg font-bold ${transaction.transaction_type === "incoming" ? "text-green-600" : "text-red-600"}`}>
                                                        {transaction.quantity > 0 ? "+" : ""}{transaction.quantity} {transaction.product?.unit || ""}
                                                    </div>
                                                    <button onClick={() => deleteTransaction(transaction.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{new Date(transaction.created_at).toLocaleString("ru-RU")}</p>
                                            {transaction.notes && <p className="text-sm text-gray-600 mt-1 truncate">{transaction.notes}</p>}
                                        </div>
                                    </div>
                                ))}
                                {transactions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Операций пока нет</p>}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm sm:shadow-lg p-4 sm:p-6">
                        <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4">Статистика склада</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl sm:text-3xl font-bold text-blue-600">{products.length}</div>
                                <div className="text-xs sm:text-sm text-gray-600 mt-1">Наименований</div>
                            </div>
                            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl sm:text-3xl font-bold text-green-600">{products.reduce((s, p) => s + p.stock_quantity, 0).toFixed(0)}</div>
                                <div className="text-xs sm:text-sm text-gray-600 mt-1">Общий остаток</div>
                            </div>
                            <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
                                <div className="text-2xl sm:text-3xl font-bold text-yellow-600">{lowStockProducts.length}</div>
                                <div className="text-xs sm:text-sm text-gray-600 mt-1">Низкий остаток</div>
                            </div>
                            <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
                                <div className="text-xl sm:text-3xl font-bold text-yellow-600">
                                    {products.reduce((s, p) => s + p.stock_quantity * p.price_per_sqm, 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-600 mt-1">Стоимость (₽)</div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ======================== PRODUCTS TAB ======================== */}
            {activeTab === "products" && (
                <div>
                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Поиск по названию или категории..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                    </div>

                    {/* Mobile card list */}
                    <div className="sm:hidden space-y-3">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex gap-3">
                                {/* Photo */}
                                <div className="flex-shrink-0">
                                    {product.photo_url ? (
                                        <img src={product.photo_url} alt={product.name} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                                    ) : (
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <Package className="h-6 w-6 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{product.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{product.category}{product.subcategory ? ` · ${product.subcategory}` : ""}</p>
                                        </div>
                                        <button onClick={() => toggleProductActive(product)} className="flex-shrink-0 mt-0.5">
                                            {product.is_active
                                                ? <ToggleRight className="h-6 w-6 text-green-500" />
                                                : <ToggleLeft className="h-6 w-6 text-gray-300" />}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex gap-3">
                                            <span className="text-xs text-gray-600 font-medium">{product.price_per_sqm.toLocaleString("ru-RU")} ₽/{product.unit}</span>
                                            <span className={`text-xs font-semibold ${
                                                product.stock_quantity === 0 ? "text-orange-600"
                                                : product.stock_quantity < 50 ? "text-red-600"
                                                : "text-green-600"
                                            }`}>
                                                {product.stock_quantity} {product.unit}
                                            </span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => openEditProduct(product)}
                                                className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDeleteProduct(product)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="text-center text-gray-500 py-12 bg-white rounded-xl">
                                {productSearch ? "Ничего не найдено" : "Товаров нет"}
                            </div>
                        )}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block bg-white rounded-lg shadow-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Фото</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Название</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Категория</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Цена</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Остаток</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Видимость</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            {product.photo_url ? (
                                                <img src={product.photo_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                                    <Package className="h-5 w-5 text-gray-400" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-gray-900">{product.name}</div>
                                            {product.subcategory && <div className="text-xs text-gray-500">{product.subcategory}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{product.category}</td>
                                        <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                                            {product.price_per_sqm.toLocaleString("ru-RU")} ₽/{product.unit}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <span className={`font-semibold ${product.stock_quantity === 0 ? "text-orange-600" : product.stock_quantity < 50 ? "text-red-600" : "text-green-600"}`}>
                                                {product.stock_quantity} {product.unit}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => toggleProductActive(product)} title={product.is_active ? "Скрыть в каталоге" : "Показать в каталоге"}>
                                                {product.is_active
                                                    ? <ToggleRight className="h-6 w-6 text-green-500 mx-auto" />
                                                    : <ToggleLeft className="h-6 w-6 text-gray-400 mx-auto" />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button
                                                    onClick={() => openEditProduct(product)}
                                                    className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                                    title="Редактировать"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(product)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Удалить"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center text-gray-500 py-10">
                                            {productSearch ? "Ничего не найдено" : "Товаров нет"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ======================== RECEIVING MODAL ======================== */}
            <Modal isOpen={showAddReceiving} title="Добавить приход товара" onClose={() => setShowAddReceiving(false)}>
                <form onSubmit={handleAddReceiving} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Товар <span className="text-red-500">*</span></label>
                        <select
                            required
                            value={receivingForm.product_id}
                            onChange={(e) => setReceivingForm({ ...receivingForm, product_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 appearance-none"
                        >
                            <option value="">Выберите товар</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} (остаток: {p.stock_quantity} {p.unit})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Количество{receivingForm.product_id ? ` (${products.find((p) => p.id === receivingForm.product_id)?.unit || ""})` : ""} <span className="text-amber-500">*</span>
                        </label>
                        <input
                            type="number" required min="1" step="1"
                            value={receivingForm.quantity || ""}
                            onChange={(e) => setReceivingForm({ ...receivingForm, quantity: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Примечание</label>
                        <textarea
                            value={receivingForm.notes}
                            onChange={(e) => setReceivingForm({ ...receivingForm, notes: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                            placeholder="Накладная №, поставщик, и т.д."
                        />
                    </div>
                    <button type="submit" disabled={submitting}
                        className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 transition-colors font-semibold">
                        {submitting ? "Добавление..." : "Добавить приход"}
                    </button>
                </form>
            </Modal>

            {/* ======================== SHIPMENT MODAL ======================== */}
            <Modal isOpen={showAddShipment} title="Оформить отгрузку" onClose={() => { setShowAddShipment(false); setShipmentLines([{ product_id: "", quantity: 0 }]); setShipmentNotes(""); setSelectedOrderId(""); setShipmentMode("manual"); }}>
                <form onSubmit={handleAddShipment} className="space-y-5">
                    <div className="flex rounded-lg overflow-hidden border border-gray-200">
                        <button type="button" onClick={() => { setShipmentMode("manual"); setSelectedOrderId(""); setShipmentLines([{ product_id: "", quantity: 0 }]); }}
                            className={`flex-1 py-2 text-sm font-semibold transition-colors ${shipmentMode === "manual" ? "bg-amber-100 text-amber-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                            Вручную
                        </button>
                        <button type="button" onClick={() => { setShipmentMode("order"); setShipmentLines([{ product_id: "", quantity: 0 }]); }}
                            className={`flex-1 py-2 text-sm font-semibold transition-colors ${shipmentMode === "order" ? "bg-amber-100 text-amber-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                            По заказу
                        </button>
                    </div>
                    {shipmentMode === "order" && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Заказ <span className="text-red-500">*</span></label>
                            <select value={selectedOrderId} onChange={(e) => handleOrderSelect(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none">
                                <option value="">Выберите заказ</option>
                                {orders.map((o) => (
                                    <option key={o.id} value={o.id}>{o.order_number} — {o.customer?.name || "Без клиента"} [{o.status}]</option>
                                ))}
                            </select>
                            {orders.length === 0 && <p className="text-xs text-gray-500 mt-1">Нет заказов со статусами: Доставляется, Подтвержден, В обработке</p>}
                        </div>
                    )}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-semibold text-gray-700">Позиции отгрузки</label>
                            {shipmentMode === "manual" && (
                                <button type="button" onClick={addShipmentLine} className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center space-x-1">
                                    <Plus className="h-3 w-3" /><span>Добавить строку</span>
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {shipmentLines.map((line, idx) => {
                                const selectedProduct = products.find((p) => p.id === line.product_id);
                                return (
                                    <div key={idx} className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <select required value={line.product_id} disabled={shipmentMode === "order" && !!selectedOrderId}
                                                onChange={(e) => updateShipmentLine(idx, "product_id", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none">
                                                <option value="">Выберите товар</option>
                                                {products.map((p) => <option key={p.id} value={p.id}>{p.name} (склад: {p.stock_quantity} {p.unit})</option>)}
                                            </select>
                                        </div>
                                        <div className="w-32 flex items-center gap-1">
                                            <input type="number" required min="1" step="1"
                                                value={line.quantity || ""}
                                                onChange={(e) => updateShipmentLine(idx, "quantity", parseInt(e.target.value) || 0)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                placeholder="Кол-во" />
                                            {selectedProduct && <span className="text-xs text-gray-500 whitespace-nowrap">{selectedProduct.unit}</span>}
                                        </div>
                                        {shipmentLines.length > 1 && shipmentMode === "manual" && (
                                            <button type="button" onClick={() => removeShipmentLine(idx)} className="text-gray-400 hover:text-red-500 mt-2">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {shipmentLines.some((l) => { const p = products.find((pr) => pr.id === l.product_id); return p && l.quantity > 0 && p.stock_quantity < l.quantity; }) && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm font-semibold text-red-700 mb-1">Недостаточно на складе:</p>
                            {shipmentLines.map((l, idx) => {
                                const p = products.find((pr) => pr.id === l.product_id);
                                if (!p || !l.quantity || p.stock_quantity >= l.quantity) return null;
                                return <p key={idx} className="text-xs text-red-600">{p.name}: нужно {l.quantity} {p.unit}, остаток {p.stock_quantity} {p.unit}</p>;
                            })}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Примечание</label>
                        <textarea value={shipmentNotes} onChange={(e) => setShipmentNotes(e.target.value)} rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Номер накладной, получатель, и т.д." />
                    </div>
                    <button type="submit" disabled={submitting}
                        className="w-full bg-amber-100 text-amber-600 py-2 rounded-lg hover:bg-amber-50 disabled:bg-gray-300 transition-colors font-semibold">
                        {submitting ? "Оформление..." : "Оформить отгрузку"}
                    </button>
                </form>
            </Modal>

            {/* ======================== PRODUCT CREATE/EDIT MODAL ======================== */}
            <Modal
                isOpen={showProductModal}
                title={editingProduct ? "Редактировать товар" : "Новый товар"}
                onClose={closeProductModal}
            >
                <form onSubmit={handleProductSubmit} className="space-y-4">
                    {/* Photo */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Фото товара</label>
                        <div className="flex items-start gap-4">
                            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                                {productForm.photo_url ? (
                                    <img src={productForm.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <ImagePlus className="h-8 w-8 text-gray-300" />
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={photoUploading}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    <ImagePlus className="h-4 w-4" />
                                    {photoUploading ? "Загрузка..." : "Загрузить фото"}
                                </button>
                                {productForm.photo_url && (
                                    <button
                                        type="button"
                                        onClick={() => setProductForm((p) => ({ ...p, photo_url: "" }))}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                        Удалить фото
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Название <span className="text-red-500">*</span></label>
                        <input
                            type="text" required
                            value={productForm.name}
                            onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                            placeholder="Брусчатка Волна 6 см"
                        />
                    </div>

                    {/* Category + Subcategory */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Категория <span className="text-red-500">*</span></label>
                            <input
                                type="text" required
                                value={productForm.category}
                                onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                placeholder="Брусчатка"
                                list="category-suggestions"
                            />
                            <datalist id="category-suggestions">
                                {[...new Set(products.map((p) => p.category))].map((c) => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Подкатегория</label>
                            <input
                                type="text"
                                value={productForm.subcategory}
                                onChange={(e) => setProductForm((p) => ({ ...p, subcategory: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                placeholder="Вибропрессованная"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Описание</label>
                        <textarea
                            value={productForm.description}
                            onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 resize-none"
                            placeholder="Описание товара..."
                        />
                    </div>

                    {/* Price + Unit */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Цена (₽) <span className="text-red-500">*</span></label>
                            <input
                                type="number" required min="0" step="0.01"
                                value={productForm.price_per_sqm}
                                onChange={(e) => setProductForm((p) => ({ ...p, price_per_sqm: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                placeholder="1200"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Единица измерения</label>
                            <select
                                value={productForm.unit}
                                onChange={(e) => setProductForm((p) => ({ ...p, unit: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 appearance-none"
                            >
                                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Stock quantity */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Количество на складе ({productForm.unit})
                        </label>
                        <input
                            type="number" min="0" step="1"
                            value={productForm.stock_quantity}
                            onChange={(e) => setProductForm((p) => ({ ...p, stock_quantity: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                    </div>

                    {/* Shape + Color */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Форма</label>
                            <select
                                value={productForm.shape}
                                onChange={(e) => setProductForm((p) => ({ ...p, shape: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 appearance-none"
                            >
                                <option value="">Не указана</option>
                                {SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Цвет</label>
                            <input
                                type="text"
                                value={productForm.color}
                                onChange={(e) => setProductForm((p) => ({ ...p, color: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                placeholder="Серый"
                                list="color-suggestions"
                            />
                            <datalist id="color-suggestions">
                                {[...new Set(products.map((p) => p.color).filter(Boolean))].map((c) => <option key={c!} value={c!} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* Purpose */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Назначение</label>
                        <select
                            value={productForm.purpose}
                            onChange={(e) => setProductForm((p) => ({ ...p, purpose: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 appearance-none"
                        >
                            <option value="">Не указано</option>
                            {PURPOSES.map((pu) => <option key={pu} value={pu}>{pu}</option>)}
                        </select>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <div className="text-sm font-semibold text-gray-700">Отображать в каталоге</div>
                            <div className="text-xs text-gray-500">Снимите флажок, чтобы скрыть товар с сайта</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setProductForm((p) => ({ ...p, is_active: !p.is_active }))}
                        >
                            {productForm.is_active
                                ? <ToggleRight className="h-8 w-8 text-green-500" />
                                : <ToggleLeft className="h-8 w-8 text-gray-400" />}
                        </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={closeProductModal}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold">
                            Отмена
                        </button>
                        <button type="submit" disabled={productSubmitting || photoUploading}
                            className="flex-1 bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 transition-colors font-semibold">
                            {productSubmitting ? "Сохранение..." : editingProduct ? "Сохранить" : "Создать товар"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
