import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Eye, CreditCard as Edit2, Check, X, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Modal } from "../../components/Modal";
import { Database } from "../../types/database";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"] & { product?: Product };
type DeliveryTrip = Database["public"]["Tables"]["order_delivery_trips"]["Row"];

interface EditableItem {
    id?: string;
    product_id: string;
    quantity: number;
    price_per_sqm: number;
    subtotal: number;
}

interface EditableTrip {
    id?: string;
    vehicle_type: string;
    trip_count: number;
    cost_per_trip: number;
}

const VEHICLE_TYPES = ["манипулятор 5т", "манипулятор 8т", "манипулятор 10т", "фура 20т"];

const ORDER_STATUSES = ["Новый", "В обработке", "Согласован", "Доставляется", "Выполнен", "Отменен"];

interface OrdersSectionProps {
    onNavigateToAddCustomer?: (data?: { name?: string; phone?: string }) => void;
    selectedCustomerId?: string | null;
    onCustomerSelected?: () => void;
}

export function OrdersSection({ onNavigateToAddCustomer, selectedCustomerId, onCustomerSelected }: OrdersSectionProps) {
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
    const [selectedTrips, setSelectedTrips] = useState<DeliveryTrip[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editItems, setEditItems] = useState<EditableItem[]>([]);
    const [editTrips, setEditTrips] = useState<EditableTrip[]>([]);
    const [editDeliveryAddress, setEditDeliveryAddress] = useState("");
    const [editIsPickup, setEditIsPickup] = useState(false);
    const [editSaving, setEditSaving] = useState(false);

    const [formData, setFormData] = useState({
        customer_id: "",
        delivery_address: "",
        source: "phone",
        is_pickup: false,
    });
    const [newItems, setNewItems] = useState<EditableItem[]>([]);
    const [newItemProductId, setNewItemProductId] = useState("");
    const [newItemQty, setNewItemQty] = useState(0);
    const [newTrips, setNewTrips] = useState<EditableTrip[]>([
        { vehicle_type: "манипулятор 5т", trip_count: 1, cost_per_trip: 0 },
    ]);

    // Customer search state
    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerSearchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadOrders();
        loadCustomersAndProducts();
    }, []);

    useEffect(() => {
        if (selectedCustomerId && customers.length > 0) {
            const customer = customers.find((c) => c.id === selectedCustomerId);
            if (customer) {
                setFormData((prev) => ({ ...prev, customer_id: customer.id }));
                setCustomerSearch(customer.name);
                setShowAddOrder(true);
                onCustomerSelected?.();
            }
        }
    }, [selectedCustomerId, customers]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
                setShowCustomerDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCustomers = customers.filter((c) => {
        if (!customerSearch) return true;
        const search = customerSearch.toLowerCase();
        return (
            c.name.toLowerCase().includes(search) ||
            c.phone.toLowerCase().includes(search) ||
            (c.company_name && c.company_name.toLowerCase().includes(search))
        );
    });

    function selectCustomer(customer: Customer) {
        setFormData({ ...formData, customer_id: customer.id });
        setCustomerSearch(customer.name);
        setShowCustomerDropdown(false);
    }

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

    function addNewItem() {
        if (!newItemProductId || newItemQty <= 0) return;
        const prod = products.find((p) => p.id === newItemProductId);
        if (!prod) return;
        const existing = newItems.findIndex((i) => i.product_id === newItemProductId);
        if (existing >= 0) {
            setNewItems((prev) =>
                prev.map((item, idx) =>
                    idx === existing
                        ? {
                              ...item,
                              quantity: item.quantity + newItemQty,
                              subtotal: (item.quantity + newItemQty) * item.price_per_sqm,
                          }
                        : item,
                ),
            );
        } else {
            setNewItems((prev) => [
                ...prev,
                {
                    product_id: newItemProductId,
                    quantity: newItemQty,
                    price_per_sqm: prod.price_per_sqm,
                    subtotal: newItemQty * prod.price_per_sqm,
                },
            ]);
        }
        setNewItemProductId("");
        setNewItemQty(0);
    }

    async function handleAddOrder(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.customer_id) {
            alert("Выберите клиента");
            return;
        }
        if (newItems.length === 0) {
            alert("Добавьте хотя бы один товар");
            return;
        }
        if (newItems.some((i) => !i.product_id)) {
            alert("Выберите товар для всех позиций");
            return;
        }

        setSubmitting(true);
        try {
            const productTotal = newItems.reduce((sum, i) => sum + i.subtotal, 0);
            const deliveryCost = formData.is_pickup
                ? 0
                : newTrips.reduce((sum, t) => sum + t.trip_count * t.cost_per_trip, 0);
            const totalCost = productTotal + deliveryCost;
            const deliveryType = formData.is_pickup
                ? "Самовывоз"
                : newTrips
                      .filter((t) => t.vehicle_type)
                      .map((t) => `${t.trip_count} × ${t.vehicle_type}`)
                      .join(", ") || "—";

            const { data: order, error: orderError } = await supabase
                .from("orders")
                .insert({
                    customer_id: formData.customer_id,
                    status: "Новый",
                    total_amount: totalCost,
                    delivery_cost: deliveryCost,
                    delivery_type: deliveryType,
                    delivery_address: formData.is_pickup ? "" : formData.delivery_address,
                    source: formData.source,
                })
                .select()
                .single();
            if (orderError) throw orderError;

            await supabase.from("order_items").insert(
                newItems.map((item) => ({
                    order_id: order.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_per_sqm: item.price_per_sqm,
                    subtotal: item.subtotal,
                })),
            );

            if (!formData.is_pickup) {
                const tripsToInsert = newTrips.filter((t) => t.vehicle_type && t.trip_count > 0);
                if (tripsToInsert.length > 0) {
                    await supabase.from("order_delivery_trips").insert(
                        tripsToInsert.map((t) => ({
                            order_id: order.id,
                            vehicle_type: t.vehicle_type,
                            trip_count: t.trip_count,
                            cost_per_trip: t.cost_per_trip,
                        })),
                    );
                }
            }

            await supabase.from("order_history").insert({
                order_id: order.id,
                action_type: "status_change",
                new_status: "Новый",
                comment: "Заказ создан вручную",
            });

            setFormData({ customer_id: "", delivery_address: "", source: "phone", is_pickup: false });
            setNewItems([]);
            setNewItemProductId("");
            setNewItemQty(0);
            setNewTrips([{ vehicle_type: "манипулятор 5т", trip_count: 1, cost_per_trip: 0 }]);
            setCustomerSearch("");
            setShowCustomerDropdown(false);
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

            if (newStatus === "Выполнен") {
                const now = new Date().toISOString();
                const today = now.split("T")[0];
                // Mark active deliveries for this order as completed
                const { data: activeDeliveries } = await supabase
                    .from("deliveries")
                    .select("id, vehicle_id")
                    .eq("order_id", orderId)
                    .neq("status", "Выполнена");
                if (activeDeliveries && activeDeliveries.length > 0) {
                    await supabase.from("deliveries").update({
                        status: "Выполнена",
                        completed_at: now,
                        actual_date: today,
                    }).eq("order_id", orderId).neq("status", "Выполнена");
                    // Free up the vehicles
                    for (const d of activeDeliveries) {
                        if (d.vehicle_id) {
                            await supabase.from("vehicles").update({
                                operational_status: "active",
                                is_active: true,
                            }).eq("id", d.vehicle_id);
                        }
                    }
                }
            }

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
            const [itemsRes, tripsRes] = await Promise.all([
                supabase.from("order_items").select("*, product:products(*)").eq("order_id", order.id),
                supabase.from("order_delivery_trips").select("*").eq("order_id", order.id).order("created_at"),
            ]);
            const items = (itemsRes.data as OrderItem[]) || [];
            const trips = (tripsRes.data as DeliveryTrip[]) || [];
            setSelectedOrderItems(items);
            setSelectedTrips(trips);
            setEditItems(
                items.map((item) => ({
                    id: item.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_per_sqm: item.price_per_sqm,
                    subtotal: item.subtotal,
                })),
            );
            setEditTrips(
                trips.length > 0
                    ? trips.map((t) => ({
                          id: t.id,
                          vehicle_type: t.vehicle_type,
                          trip_count: t.trip_count,
                          cost_per_trip: t.cost_per_trip,
                      }))
                    : [{ vehicle_type: "манипулятор 5т", trip_count: 1, cost_per_trip: 0 }],
            );
            setEditDeliveryAddress(order.delivery_address || "");
            setEditIsPickup(order.delivery_type === "Самовывоз");
        } catch (error) {
            console.error("Error loading order items:", error);
            setSelectedOrderItems([]);
            setSelectedTrips([]);
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
        if (!editIsPickup && editTrips.some((t) => !t.vehicle_type)) {
            alert("Выберите тип транспорта для всех рейсов");
            return;
        }

        setEditSaving(true);
        try {
            const productTotal = editItems.reduce((sum, i) => sum + i.subtotal, 0);
            const deliveryCost = editIsPickup ? 0 : editTrips.reduce((sum, t) => sum + t.trip_count * t.cost_per_trip, 0);
            const totalAmount = productTotal + deliveryCost;
            const deliveryType = editIsPickup
                ? "Самовывоз"
                : editTrips.map((t) => `${t.trip_count} × ${t.vehicle_type}`).join(", ") || "—";

            // Update order items
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

            // Update delivery trips
            await supabase.from("order_delivery_trips").delete().eq("order_id", selectedOrder.id);
            if (!editIsPickup && editTrips.length > 0) {
                const { error: tripsError } = await supabase.from("order_delivery_trips").insert(
                    editTrips.map((t) => ({
                        order_id: selectedOrder.id,
                        vehicle_type: t.vehicle_type,
                        trip_count: t.trip_count,
                        cost_per_trip: t.cost_per_trip,
                    })),
                );
                if (tripsError) throw tripsError;
            }

            const { error: orderError } = await supabase
                .from("orders")
                .update({
                    delivery_type: deliveryType,
                    delivery_address: editIsPickup ? "" : editDeliveryAddress,
                    delivery_cost: deliveryCost,
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
                delivery_type: deliveryType,
                delivery_address: editIsPickup ? "" : editDeliveryAddress,
                delivery_cost: deliveryCost,
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

    const editDeliveryCost = editIsPickup ? 0 : editTrips.reduce((sum, t) => sum + t.trip_count * t.cost_per_trip, 0);
    const editTotal = editItems.reduce((sum, i) => sum + i.subtotal, 0) + editDeliveryCost;

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
            <Modal
                isOpen={showAddOrder}
                title="Создать заказ"
                onClose={() => {
                    setShowAddOrder(false);
                    setNewItems([]);
                    setNewItemProductId("");
                    setNewItemQty(0);
                    setNewTrips([{ vehicle_type: "манипулятор 5т", trip_count: 1, cost_per_trip: 0 }]);
                    setFormData({ customer_id: "", delivery_address: "", source: "phone", is_pickup: false });
                    setCustomerSearch("");
                    setShowCustomerDropdown(false);
                }}
            >
                <form onSubmit={handleAddOrder} className="space-y-5">
                    {/* Клиент и источник */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Клиент <span className="text-red-500">*</span>
                            </label>
                            <div className="relative" ref={customerSearchRef}>
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Введите имя или телефон..."
                                    value={customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        setFormData({ ...formData, customer_id: "" });
                                        setShowCustomerDropdown(true);
                                    }}
                                    onFocus={() => setShowCustomerDropdown(true)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                />
                                {showCustomerDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredCustomers.length === 0 ? (
                                            <div className="px-4 py-3">
                                                <div className="text-gray-500 text-sm mb-2">Клиент не найден</div>
                                                {onNavigateToAddCustomer && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowAddOrder(false);
                                                            onNavigateToAddCustomer({
                                                                name: customerSearch,
                                                                phone: customerSearch.match(/\d+/g)?.join("") || "",
                                                            });
                                                        }}
                                                        className="text-sm text-yellow-600 hover:text-yellow-700 font-medium flex items-center space-x-1"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        <span>Добавить нового клиента</span>
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            filteredCustomers.map((c) => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => selectCustomer(c)}
                                                    className={`w-full text-left px-4 py-2 hover:bg-yellow-50 transition-colors ${
                                                        formData.customer_id === c.id ? "bg-yellow-100" : ""
                                                    }`}
                                                >
                                                    <div className="font-semibold text-gray-900">{c.name}</div>
                                                    <div className="text-sm text-gray-600">
                                                        {c.phone}
                                                        {c.company_name && <span className="ml-2">({c.company_name})</span>}
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            {formData.customer_id && (
                                <div className="mt-1 text-sm text-green-600">
                                    <Check className="inline h-4 w-4 mr-1" />
                                    Клиент выбран
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Источник</label>
                            <select
                                value={formData.source}
                                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 appearance-none"
                            >
                                <option value="phone">Телефон</option>
                                <option value="website">Сайт</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Способ получения</label>
                            <select
                                value={formData.is_pickup ? "pickup" : "delivery"}
                                onChange={(e) => setFormData({ ...formData, is_pickup: e.target.value === "pickup" })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 appearance-none"
                            >
                                <option value="delivery">Доставка</option>
                                <option value="pickup">Самовывоз</option>
                            </select>
                        </div>
                    </div>

                    {/* Адрес доставки - только если не самовывоз */}
                    {!formData.is_pickup && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Адрес доставки</label>
                            <input
                                type="text"
                                value={formData.delivery_address}
                                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                                placeholder="г. Москва, ул. Примерная, д. 1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                            />
                        </div>
                    )}

                    {/* Добавление товаров */}
                    <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700">Товары</h3>
                        <div className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-7">
                                <label className="block text-xs text-gray-600 mb-1">Товар</label>
                                <select
                                    value={newItemProductId}
                                    onChange={(e) => setNewItemProductId(e.target.value)}
                                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-sm appearance-none"
                                >
                                    <option value="">Выберите товар</option>
                                    {Object.entries(
                                        products.reduce<Record<string, Product[]>>((acc, p) => {
                                            (acc[p.category] = acc[p.category] || []).push(p);
                                            return acc;
                                        }, {}),
                                    ).map(([cat, list]) => (
                                        <optgroup key={cat} label={cat}>
                                            {list.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} — {p.price_per_sqm} ₽/{p.unit}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-3">
                                <label className="block text-xs text-gray-600 mb-1">
                                    Кол-во ({products.find((p) => p.id === newItemProductId)?.unit || "шт/м²"})
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={newItemQty || ""}
                                    onChange={(e) => setNewItemQty(parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-sm"
                                    placeholder="0"
                                />
                            </div>
                            <div className="col-span-2">
                                <button
                                    type="button"
                                    onClick={addNewItem}
                                    disabled={!newItemProductId || newItemQty <= 0}
                                    className="w-full flex items-center justify-center bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {newItems.length > 0 && (
                            <div className="space-y-1 mt-2">
                                {newItems.map((item, idx) => {
                                    const prod = products.find((p) => p.id === item.product_id);
                                    return (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                                        >
                                            <span className="text-gray-800 flex-1 mr-2 truncate">
                                                {prod?.name || "Товар"}
                                            </span>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const qty = parseFloat(e.target.value) || 0;
                                                        setNewItems((prev) =>
                                                            prev.map((it, i) =>
                                                                i === idx
                                                                    ? {
                                                                          ...it,
                                                                          quantity: qty,
                                                                          subtotal: qty * it.price_per_sqm,
                                                                      }
                                                                    : it,
                                                            ),
                                                        );
                                                    }}
                                                    className="w-16 px-1 py-1 border border-gray-300 rounded text-center"
                                                />
                                                <span className="text-gray-500 text-xs w-6">{prod?.unit}</span>
                                                <span className="font-semibold w-24 text-right">
                                                    {item.subtotal.toLocaleString("ru-RU")} ₽
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setNewItems((prev) => prev.filter((_, i) => i !== idx))
                                                    }
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="text-right text-sm font-semibold text-gray-700 pt-1">
                                    Товары: {newItems.reduce((s, i) => s + i.subtotal, 0).toLocaleString("ru-RU")} ₽
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Рейсы доставки - только если не самовывоз */}
                    {!formData.is_pickup && (
                        <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-gray-700">Доставка (рейсы)</h3>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setNewTrips((prev) => [
                                            ...prev,
                                            { vehicle_type: "манипулятор 5т", trip_count: 1, cost_per_trip: 0 },
                                        ])
                                    }
                                    className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-500 transition-colors flex items-center space-x-1"
                                >
                                    <Plus className="h-3 w-3" />
                                    <span>Добавить рейс</span>
                                </button>
                            </div>
                            <div className="space-y-2">
                                {newTrips.map((trip, idx) => (
                                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                                        <div className="grid grid-cols-3 gap-2 mb-1">
                                            <div className="col-span-3">
                                                <label className="text-xs text-gray-500">Тип транспорта</label>
                                                <select
                                                    value={trip.vehicle_type}
                                                    onChange={(e) =>
                                                        setNewTrips((prev) => {
                                                            const u = [...prev];
                                                            u[idx] = { ...u[idx], vehicle_type: e.target.value };
                                                            return u;
                                                        })
                                                    }
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-yellow-500 appearance-none"
                                                >
                                                    {VEHICLE_TYPES.map((vt) => (
                                                        <option key={vt} value={vt}>
                                                            {vt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Кол-во рейсов</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={trip.trip_count}
                                                    onChange={(e) =>
                                                        setNewTrips((prev) => {
                                                            const u = [...prev];
                                                            u[idx] = {
                                                                ...u[idx],
                                                                trip_count: parseInt(e.target.value) || 1,
                                                            };
                                                            return u;
                                                        })
                                                    }
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Стоим. рейса, ₽</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={trip.cost_per_trip || ""}
                                                    onChange={(e) =>
                                                        setNewTrips((prev) => {
                                                            const u = [...prev];
                                                            u[idx] = {
                                                                ...u[idx],
                                                                cost_per_trip: parseFloat(e.target.value) || 0,
                                                            };
                                                            return u;
                                                        })
                                                    }
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Итого</label>
                                                <div className="px-2 py-1 bg-white border border-gray-200 rounded text-center text-sm font-semibold">
                                                    {(trip.trip_count * trip.cost_per_trip).toLocaleString("ru-RU")} ₽
                                                </div>
                                            </div>
                                        </div>
                                        {newTrips.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setNewTrips((prev) => prev.filter((_, i) => i !== idx))}
                                                className="text-xs text-red-600 hover:text-red-800 flex items-center space-x-1 mt-1"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                <span>Удалить рейс</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="text-right text-sm font-semibold text-gray-700">
                                Доставка:{" "}
                                {newTrips
                                    .reduce((s, t) => s + t.trip_count * t.cost_per_trip, 0)
                                    .toLocaleString("ru-RU")}{" "}
                                ₽
                            </div>
                        </div>
                    )}

                    {/* Итого */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">
                            {formData.is_pickup ? "Итого (самовывоз):" : "Итого:"}
                        </span>
                        <span className="text-lg font-bold text-yellow-700">
                            {(
                                newItems.reduce((s, i) => s + i.subtotal, 0) +
                                (formData.is_pickup
                                    ? 0
                                    : newTrips.reduce((s, t) => s + t.trip_count * t.cost_per_trip, 0))
                            ).toLocaleString("ru-RU")}{" "}
                            ₽
                        </span>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || newItems.length === 0}
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
                                        <label className="text-gray-600">Способ получения</label>
                                        <select
                                            value={editIsPickup ? "pickup" : "delivery"}
                                            onChange={(e) => setEditIsPickup(e.target.value === "pickup")}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 appearance-none"
                                        >
                                            <option value="delivery">Доставка</option>
                                            <option value="pickup">Самовывоз</option>
                                        </select>
                                    </div>

                                    {!editIsPickup && (
                                        <>
                                            <div>
                                                <label className="text-gray-600">Адрес доставки</label>
                                                <input
                                                    type="text"
                                                    value={editDeliveryAddress}
                                                    onChange={(e) => setEditDeliveryAddress(e.target.value)}
                                                    placeholder=""
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-gray-600 font-medium">Рейсы</label>
                                                    <button
                                                        onClick={() =>
                                                            setEditTrips((prev) => [
                                                                ...prev,
                                                                {
                                                                    vehicle_type: "манипулятор 5т",
                                                                    trip_count: 1,
                                                                    cost_per_trip: 0,
                                                                },
                                                            ])
                                                        }
                                                        className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-500 transition-colors flex items-center space-x-1"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        <span>Добавить рейс</span>
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {editTrips.map((trip, idx) => (
                                                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                                                            <div className="grid grid-cols-3 gap-2 mb-2">
                                                                <div className="col-span-3">
                                                                    <label className="text-gray-500 text-xs">
                                                                        Тип транспорта
                                                                    </label>
                                                                    <select
                                                                        value={trip.vehicle_type}
                                                                        onChange={(e) =>
                                                                            setEditTrips((prev) => {
                                                                                const u = [...prev];
                                                                                u[idx] = {
                                                                                    ...u[idx],
                                                                                    vehicle_type: e.target.value,
                                                                                };
                                                                                return u;
                                                                            })
                                                                        }
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 appearance-none"
                                                                    >
                                                                        {VEHICLE_TYPES.map((vt) => (
                                                                            <option key={vt} value={vt}>
                                                                                {vt}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-gray-500 text-xs">
                                                                        Кол-во рейсов
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        step="1"
                                                                        value={trip.trip_count}
                                                                        onChange={(e) =>
                                                                            setEditTrips((prev) => {
                                                                                const u = [...prev];
                                                                                u[idx] = {
                                                                                    ...u[idx],
                                                                                    trip_count: parseInt(e.target.value) || 1,
                                                                                };
                                                                                return u;
                                                                            })
                                                                        }
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-gray-500 text-xs">
                                                                        Стоим. рейса, ₽
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="1"
                                                                        value={trip.cost_per_trip}
                                                                        onChange={(e) =>
                                                                            setEditTrips((prev) => {
                                                                                const u = [...prev];
                                                                                u[idx] = {
                                                                                    ...u[idx],
                                                                                    cost_per_trip:
                                                                                        parseFloat(e.target.value) || 0,
                                                                                };
                                                                                return u;
                                                                            })
                                                                        }
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-gray-500 text-xs">Итого</label>
                                                                    <div className="px-2 py-1 bg-white border border-gray-200 rounded text-center font-semibold">
                                                                        {(trip.trip_count * trip.cost_per_trip).toLocaleString(
                                                                            "ru-RU",
                                                                        )}{" "}
                                                                        ₽
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {editTrips.length > 1 && (
                                                                <button
                                                                    onClick={() =>
                                                                        setEditTrips((prev) => prev.filter((_, i) => i !== idx))
                                                                    }
                                                                    className="text-xs text-red-600 hover:text-red-800 flex items-center space-x-1"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                    <span>Удалить рейс</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-2 text-right text-sm font-semibold text-gray-700">
                                                    Итого за доставку: {editDeliveryCost.toLocaleString("ru-RU")} ₽
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {editIsPickup && (
                                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                            Самовывоз — доставка не требуется
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3 text-sm">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-gray-500">Итого за доставку</div>
                                            <div className="font-semibold text-gray-900">
                                                {selectedOrder.delivery_cost.toLocaleString("ru-RU")} ₽
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500">Адрес</div>
                                            <div className="font-semibold text-gray-900">
                                                {selectedOrder.delivery_address || "— (самовывоз)"}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedTrips.length > 0 ? (
                                        <div className="space-y-1">
                                            {selectedTrips.map((t) => (
                                                <div
                                                    key={t.id}
                                                    className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs"
                                                >
                                                    <span className="text-gray-700">
                                                        {t.trip_count} рейс(а) — {t.vehicle_type}
                                                    </span>
                                                    <span className="font-semibold">
                                                        {t.total_cost.toLocaleString("ru-RU")} ₽
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : selectedOrder.delivery_type ? (
                                        <div className="text-gray-700">{selectedOrder.delivery_type}</div>
                                    ) : null}
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
                                        className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-500 transition-colors flex items-center space-x-1"
                                    >
                                        <Plus className="h-3 w-3" />
                                        <span>Добавить товар</span>
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
                                                    className="w-full px-2 py-1 border border-gray-300 rounded appearance-none"
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

                        <div className="">
                            {!editMode && (
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="w-full flex items-center justify-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    <span>Редактировать заказ</span>
                                </button>
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
