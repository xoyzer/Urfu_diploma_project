import { useState, useEffect } from "react";
import { Plus, Trash2, Eye, CreditCard as Edit2, Check, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Modal } from "../../components/Modal";
import { Database } from "../../types/database";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"] & { product?: Product };

interface EditableItem {
    id?: string;
    product_id: string;
    quantity: number;
    price_per_sqm: number;
    subtotal: number;
}

const ORDER_STATUSES = ["Новый", "В обработке", "Согласован", "Доставляется", "Выполнен", "Отменен"];

export function OrdersSection() {
    const [orders, setOrders] = useState<(Order & { customer: Customer })[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [showAddOrder, setShowAddOrder] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // View/edit modal
    const [selectedOrder, setSelectedOrder] = useState<(Order & { customer: Customer }) | null>(null);
    const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItem[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editItems, setEditItems] = useState<EditableItem[]>([]);
    const [editDelivery, setEditDelivery] = useState({
        delivery_type: "манипулятор",
        delivery_address: "",
        delivery_cost: 0,
    });
    const [editSaving, setEditSaving] = useState(false);

    const [formData, setFormData] = useState({
        customer_id: "",
        product_id: "",
        quantity: 0,
        delivery_type: "манипулятор",
        delivery_address: "",
        source: "phone",
    });

    useEffect(() => {
        loadOrders();
        loadCustomersAndProducts();
    }, []);

    async function loadCustomersAndProducts() {
        try {
            const { data: customersData } = await supabase.from("customers").select("*");
            const { data: productsData } = await supabase.from("products").select("*").eq("is_active", true);
            setCustomers(customersData || []);
            setProducts(productsData || []);
        } catch (error) {
            console.error("Error loading data:", error);
        }
    }

    async function loadOrders() {
        try {
            const { data, error } = await supabase
                .from("orders")
                .select("*, customer:customers(*)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setOrders(data as (Order & { customer: Customer })[]);
        } catch (error) {
            console.error("Error loading orders:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddOrder(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const selectedProduct = products.find((p) => p.id === formData.product_id);
            if (!selectedProduct) throw new Error("Product not found");

            const productCost = selectedProduct.price_per_sqm * formData.quantity;
            const deliveryCost = Math.round((50 * (formData.delivery_type === "манипулятор" ? 150 : 120)) / 1000);
            const totalCost = productCost + deliveryCost;

            const { data: order, error: orderError } = await supabase
                .from("orders")
                .insert({
                    customer_id: formData.customer_id,
                    status: "Новый",
                    total_amount: totalCost,
                    delivery_cost: deliveryCost,
                    delivery_type: formData.delivery_type,
                    delivery_address: formData.delivery_address,
                    source: formData.source,
                })
                .select()
                .single();
            if (orderError) throw orderError;

            await supabase.from("order_items").insert({
                order_id: order.id,
                product_id: formData.product_id,
                quantity: formData.quantity,
                price_per_sqm: selectedProduct.price_per_sqm,
                subtotal: productCost,
            });

            await supabase.from("order_history").insert({
                order_id: order.id,
                action_type: "status_change",
                new_status: "Новый",
                comment: "Заказ создан вручную",
            });

            setFormData({
                customer_id: "",
                product_id: "",
                quantity: 0,
                delivery_type: "манипулятор",
                delivery_address: "",
                source: "phone",
            });
            setShowAddOrder(false);
            loadOrders();
        } catch (error) {
            console.error("Error adding order:", error);
            alert("Ошибка при создании заказа");
        } finally {
            setSubmitting(false);
        }
    }

    async function updateOrderStatus(orderId: string, newStatus: string) {
        try {
            const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
            if (error) throw error;
            await supabase.from("order_history").insert({
                order_id: orderId,
                action_type: "status_change",
                new_status: newStatus,
                comment: `Статус изменен на: ${newStatus}`,
            });
            loadOrders();
        } catch (error) {
            console.error("Error updating order:", error);
        }
    }

    async function openOrderDetails(order: Order & { customer: Customer }) {
        setSelectedOrder(order);
        setEditMode(false);
        setLoadingDetails(true);
        try {
            const { data } = await supabase
                .from("order_items")
                .select("*, product:products(*)")
                .eq("order_id", order.id);
            const items = (data as OrderItem[]) || [];
            setSelectedOrderItems(items);
            setEditItems(
                items.map((item) => ({
                    id: item.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_per_sqm: item.price_per_sqm,
                    subtotal: item.subtotal,
                })),
            );
            setEditDelivery({
                delivery_type: order.delivery_type || "манипулятор",
                delivery_address: order.delivery_address || "",
                delivery_cost: order.delivery_cost,
            });
        } catch (error) {
            console.error("Error loading order items:", error);
            setSelectedOrderItems([]);
        } finally {
            setLoadingDetails(false);
        }
    }

    function updateEditItem(index: number, field: keyof EditableItem, value: string | number) {
        setEditItems((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            if (field === "quantity" || field === "price_per_sqm") {
                updated[index].subtotal = updated[index].quantity * updated[index].price_per_sqm;
            }
            return updated;
        });
    }

    async function saveOrderChanges() {
        if (!selectedOrder) return;
        if (editItems.length === 0) {
            alert("Добавьте хотя бы один товар");
            return;
        }
        if (editItems.some((i) => !i.product_id)) {
            alert("Выберите товар для всех позиций");
            return;
        }

        setEditSaving(true);
        try {
            const productTotal = editItems.reduce((sum, i) => sum + i.subtotal, 0);
            const totalAmount = productTotal + editDelivery.delivery_cost;

            await supabase.from("order_items").delete().eq("order_id", selectedOrder.id);

            const { error: itemsError } = await supabase.from("order_items").insert(
                editItems.map((item) => ({
                    order_id: selectedOrder.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_per_sqm: item.price_per_sqm,
                    subtotal: item.subtotal,
                })),
            );
            if (itemsError) throw itemsError;

            const { error: orderError } = await supabase
                .from("orders")
                .update({
                    delivery_type: editDelivery.delivery_type,
                    delivery_address: editDelivery.delivery_address,
                    delivery_cost: editDelivery.delivery_cost,
                    total_amount: totalAmount,
                })
                .eq("id", selectedOrder.id);
            if (orderError) throw orderError;

            await supabase.from("order_history").insert({
                order_id: selectedOrder.id,
                action_type: "order_updated",
                comment: "Заказ отредактирован вручную",
            });

            setEditMode(false);
            const updatedOrder = {
                ...selectedOrder,
                delivery_type: editDelivery.delivery_type,
                delivery_address: editDelivery.delivery_address,
                delivery_cost: editDelivery.delivery_cost,
                total_amount: totalAmount,
            };
            setSelectedOrder(updatedOrder as Order & { customer: Customer });
            await openOrderDetails(updatedOrder as Order & { customer: Customer });
            loadOrders();
        } catch (error) {
            console.error("Error saving order:", error);
            alert("Ошибка при сохранении изменений");
        } finally {
            setEditSaving(false);
        }
    }

    async function deleteOrder(orderId: string) {
        if (!confirm("Удалить заказ? Это действие необратимо.")) return;
        try {
            const { error } = await supabase.from("orders").delete().eq("id", orderId);
            if (error) throw error;
            loadOrders();
        } catch (error) {
            console.error("Error deleting order:", error);
            alert("Ошибка при удалении заказа");
        }
    }

    const filteredOrders = selectedStatus === "all" ? orders : orders.filter((o) => o.status === selectedStatus);

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            Новый: "bg-blue-100 text-blue-800",
            "В обработке": "bg-yellow-100 text-yellow-800",
            Согласован: "bg-green-100 text-green-800",
            Доставляется: "bg-purple-100 text-purple-800",
            Выполнен: "bg-gray-100 text-gray-800",
            Отменен: "bg-red-100 text-red-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const editTotal = editItems.reduce((sum, i) => sum + i.subtotal, 0) + editDelivery.delivery_cost;

    if (loading) {
        return <div className="text-center py-12">Загрузка заказов...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Управление заказами</h1>
                    <p className="text-gray-600 mt-2">Все заказы с сайта и по телефону</p>
                </div>
                <button
                    onClick={() => setShowAddOrder(true)}
                    className="flex items-center space-x-2 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    <span>Добавить заказ</span>
                </button>
            </div>

            {/* Create order modal */}
            <Modal isOpen={showAddOrder} title="Создать заказ" onClose={() => setShowAddOrder(false)}>
                <form onSubmit={handleAddOrder} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Клиент <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={formData.customer_id}
                            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        >
                            <option value="">Выберите клиента</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.phone})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Товар <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={formData.product_id}
                            onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        >
                            <option value="">Выберите товар</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} - {p.price_per_sqm} ₽/{p.unit}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Количество <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            required
                            step="0.1"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Тип доставки</label>
                        <select
                            value={formData.delivery_type}
                            onChange={(e) => setFormData({ ...formData, delivery_type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        >
                            <option value="манипулятор">Манипулятор</option>
                            <option value="фура">Фура</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Адрес доставки</label>
                        <input
                            type="text"
                            value={formData.delivery_address}
                            onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Источник</label>
                        <select
                            value={formData.source}
                            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        >
                            <option value="phone">Телефон</option>
                            <option value="website">Сайт</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 transition-colors font-semibold"
                    >
                        {submitting ? "Создание..." : "Создать заказ"}
                    </button>
                </form>
            </Modal>

            {/* Status filter */}
            <div className="mb-6 flex space-x-2 overflow-x-auto">
                <button
                    onClick={() => setSelectedStatus("all")}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap ${selectedStatus === "all" ? "bg-yellow-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                    Все ({orders.length})
                </button>
                {ORDER_STATUSES.map((status) => (
                    <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap ${selectedStatus === status ? "bg-yellow-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                    >
                        {status} ({orders.filter((o) => o.status === status).length})
                    </button>
                ))}
            </div>

            {/* Order detail/edit modal */}
            <Modal
                isOpen={!!selectedOrder}
                title={selectedOrder ? `Заказ №${selectedOrder.order_number}` : ""}
                onClose={() => {
                    setSelectedOrder(null);
                    setSelectedOrderItems([]);
                    setEditMode(false);
                }}
            >
                {selectedOrder && (
                    <div className="space-y-5">
                        {/* Edit toggle button */}
                        {!editMode && (
                            <button
                                onClick={() => setEditMode(true)}
                                className="w-full flex items-center justify-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                            >
                                <Edit2 className="h-4 w-4" />
                                <span>Редактировать заказ</span>
                            </button>
                        )}

                        {/* Customer info (read-only) */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Клиент</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-gray-500">Имя</div>
                                    <div className="font-semibold text-gray-900">
                                        {selectedOrder.customer?.name || "—"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Телефон</div>
                                    <div className="font-semibold text-gray-900">
                                        {selectedOrder.customer?.phone || "—"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Email</div>
                                    <div className="font-semibold text-gray-900 break-all">
                                        {selectedOrder.customer?.email || "—"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Компания</div>
                                    <div className="font-semibold text-gray-900">
                                        {selectedOrder.customer?.company_name || "—"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Delivery */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Доставка</h3>
                            {editMode ? (
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <label className="text-gray-600">Тип доставки</label>
                                        <select
                                            value={editDelivery.delivery_type}
                                            onChange={(e) =>
                                                setEditDelivery({ ...editDelivery, delivery_type: e.target.value })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="манипулятор">Манипулятор</option>
                                            <option value="фура">Фура</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-600">Адрес доставки</label>
                                        <input
                                            type="text"
                                            value={editDelivery.delivery_address}
                                            onChange={(e) =>
                                                setEditDelivery({ ...editDelivery, delivery_address: e.target.value })
                                            }
                                            placeholder="Оставьте пустым для самовывоза"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-600">Стоимость доставки, ₽</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={editDelivery.delivery_cost}
                                            onChange={(e) =>
                                                setEditDelivery({
                                                    ...editDelivery,
                                                    delivery_cost: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <div className="text-gray-500">Тип</div>
                                        <div className="font-semibold text-gray-900">
                                            {selectedOrder.delivery_type || "—"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Стоимость доставки</div>
                                        <div className="font-semibold text-gray-900">
                                            {selectedOrder.delivery_cost.toLocaleString("ru-RU")} ₽
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="text-gray-500">Адрес</div>
                                        <div className="font-semibold text-gray-900">
                                            {selectedOrder.delivery_address || "— (самовывоз)"}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Items */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase">Товары</h3>
                                {editMode && (
                                    <button
                                        onClick={() =>
                                            setEditItems((prev) => [
                                                ...prev,
                                                { product_id: "", quantity: 1, price_per_sqm: 0, subtotal: 0 },
                                            ])
                                        }
                                        className="text-xs bg-yellow-100 text-yellow-800 text-white px-3 py-1 rounded hover:bg-yellow-200 transition-colors flex items-center space-x-1"
                                    >
                                        <Plus className="h-3 w-3" />
                                        <span>Добавить</span>
                                    </button>
                                )}
                            </div>

                            {loadingDetails ? (
                                <div className="text-sm text-gray-500">Загрузка...</div>
                            ) : editMode ? (
                                <div className="space-y-3">
                                    {editItems.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                                            <div>
                                                <label className="text-gray-600">Товар</label>
                                                <select
                                                    value={item.product_id}
                                                    onChange={(e) => {
                                                        const prod = products.find((p) => p.id === e.target.value);
                                                        const price = prod ? prod.price_per_sqm : item.price_per_sqm;
                                                        setEditItems((prev) => {
                                                            const updated = [...prev];
                                                            updated[idx] = {
                                                                ...updated[idx],
                                                                product_id: e.target.value,
                                                                price_per_sqm: price,
                                                                subtotal: updated[idx].quantity * price,
                                                            };
                                                            return updated;
                                                        });
                                                    }}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded"
                                                >
                                                    <option value="">Выберите товар</option>
                                                    {products.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} - {p.price_per_sqm} ₽/{p.unit}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-gray-600">Кол-во</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={item.quantity}
                                                        onChange={(e) =>
                                                            updateEditItem(
                                                                idx,
                                                                "quantity",
                                                                parseInt(e.target.value) || 0,
                                                            )
                                                        }
                                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-gray-600">Цена, ₽</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.price_per_sqm}
                                                        onChange={(e) =>
                                                            updateEditItem(
                                                                idx,
                                                                "price_per_sqm",
                                                                parseFloat(e.target.value) || 0,
                                                            )
                                                        }
                                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-gray-600">Сумма</label>
                                                    <div className="px-2 py-1 bg-white border border-gray-200 rounded text-center font-semibold">
                                                        {item.subtotal.toLocaleString("ru-RU")} ₽
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setEditItems((prev) => prev.filter((_, i) => i !== idx))}
                                                className="text-xs text-red-600 hover:text-red-800 flex items-center space-x-1"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                <span>Удалить позицию</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : selectedOrderItems.length === 0 ? (
                                <div className="text-sm text-gray-500">Нет позиций</div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedOrderItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div>
                                                <div className="font-semibold text-gray-900">
                                                    {item.product?.name || "Товар"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {item.quantity} {item.product?.unit || ""} × {item.price_per_sqm} ₽
                                                </div>
                                            </div>
                                            <div className="font-semibold text-gray-900">
                                                {item.subtotal.toLocaleString("ru-RU")} ₽
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedOrder.notes && !editMode && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Комментарий</h3>
                                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                                    {selectedOrder.notes}
                                </div>
                            </div>
                        )}

                        {/* Footer: meta + totals + save buttons */}
                        <div className="border-t pt-4">
                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                <div>
                                    <div className="text-gray-500">Источник</div>
                                    <div className="font-semibold text-gray-900">
                                        {selectedOrder.source === "website" ? "Сайт" : "Телефон"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Дата создания</div>
                                    <div className="font-semibold text-gray-900">
                                        {new Date(selectedOrder.created_at).toLocaleString("ru-RU")}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Статус</div>
                                    <div
                                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedOrder.status)}`}
                                    >
                                        {selectedOrder.status}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Итого</div>
                                    <div className="font-bold text-lg text-yellow-600">
                                        {(editMode ? editTotal : selectedOrder.total_amount).toLocaleString("ru-RU")} ₽
                                    </div>
                                </div>
                            </div>

                            {editMode && (
                                <div className="flex space-x-3">
                                    <button
                                        onClick={saveOrderChanges}
                                        disabled={editSaving}
                                        className="flex-1 flex items-center justify-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 transition-colors font-semibold"
                                    >
                                        <Check className="h-4 w-4" />
                                        <span>{editSaving ? "Сохранение..." : "Сохранить"}</span>
                                    </button>
                                    <button
                                        onClick={() => setEditMode(false)}
                                        disabled={editSaving}
                                        className="flex-1 flex items-center justify-center space-x-2 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 disabled:bg-gray-300 transition-colors font-semibold"
                                    >
                                        <X className="h-4 w-4" />
                                        <span>Отменить</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Orders table */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Номер</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Клиент
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Телефон
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Сумма</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Источник
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Статус
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Дата</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                Действия
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.map((order) => (
                            <tr
                                key={order.id}
                                className="hover:bg-yellow-50 cursor-pointer transition-colors"
                                onClick={() => openOrderDetails(order)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {order.order_number}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {order.customer?.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {order.customer?.phone}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                    {order.total_amount.toLocaleString("ru-RU")} ₽
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    <span
                                        className={`px-2 py-1 rounded ${order.source === "website" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}
                                    >
                                        {order.source === "website" ? "Сайт" : "Телефон"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                    <select
                                        value={order.status}
                                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}
                                    >
                                        {ORDER_STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {new Date(order.created_at).toLocaleDateString("ru-RU")}
                                </td>
                                <td
                                    className="px-6 py-4 whitespace-nowrap text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => openOrderDetails(order)}
                                            className="text-blue-600 hover:text-blue-800"
                                            title="Подробнее"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteOrder(order.id)}
                                            className="text-red-600 hover:text-red-800"
                                            title="Удалить"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
