import { useState, useEffect } from "react";
import { Plus, Calendar, Trash2, Play, CircleCheck as CheckCircle2, Wrench, Circle as XCircle, Truck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Modal } from "../../components/Modal";
import { Database } from "../../types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
type Delivery = Database["public"]["Tables"]["deliveries"]["Row"] & {
    order: { order_number: string; delivery_address: string | null };
};
type Order = Database["public"]["Tables"]["orders"]["Row"] & {
    customer: { name: string; phone: string } | null;
};

const VEHICLE_TYPES = ["Манипулятор 5т", "Манипулятор 8т", "Манипулятор 10т", "Фура 20т"];

const OPERATIONAL_STATUSES: { value: string; label: string; color: string }[] = [
    { value: "active", label: "Активен", color: "bg-green-100 text-green-800" },
    { value: "busy", label: "Занят", color: "bg-yellow-100 text-yellow-800" },
    { value: "repair", label: "В ремонте", color: "bg-orange-100 text-orange-800" },
    { value: "inactive", label: "Не активен", color: "bg-gray-100 text-gray-600" },
];

function getStatusInfo(status: string) {
    return OPERATIONAL_STATUSES.find((s) => s.value === status) ?? OPERATIONAL_STATUSES[0];
}

function getDeliveryStatusBadge(status: string) {
    if (status === "Доставлен" || status === "Выполнена") return "bg-green-100 text-green-800";
    if (status === "Доставляется" || status === "В пути") return "bg-blue-100 text-blue-800";
    return "bg-yellow-100 text-yellow-800";
}

const TODAY = new Date().toISOString().split("T")[0];

function buildCalendar(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

export function VehiclesSection() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [allDeliveries, setAllDeliveries] = useState<Delivery[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [showAddDelivery, setShowAddDelivery] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(TODAY);
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });

    const [vehicleForm, setVehicleForm] = useState({
        name: "",
        type: "манипулятор 5т",
        capacity: 5,
        license_plate: "",
        operational_status: "active",
    });
    const [deliveryForm, setDeliveryForm] = useState({
        order_id: "",
        vehicle_id: "",
        scheduled_date: TODAY,
        driver_notes: "",
    });

    useEffect(() => {
        loadVehicles();
        loadAllDeliveries();
        loadOrders();
    }, []);

    useEffect(() => {
        loadDeliveriesForDate(selectedDate);
    }, [selectedDate, allDeliveries]);

    async function loadOrders() {
        try {
            const { data, error } = await supabase
                .from("orders")
                .select("*, customer:customers(name, phone)")
                .not("status", "in", '("Доставляется","Выполнен","Отменен")');
            if (error) throw error;
            setOrders(data as Order[] || []);
        } catch (error) {
            console.error("Error loading orders:", error);
        }
    }

    async function loadVehicles() {
        try {
            const { data, error } = await supabase.from("vehicles").select("*").order("name");
            if (error) throw error;
            setVehicles(data || []);
        } catch (error) {
            console.error("Error loading vehicles:", error);
        } finally {
            setLoading(false);
        }
    }

    async function loadAllDeliveries() {
        try {
            const { data, error } = await supabase
                .from("deliveries")
                .select("*, order:orders(order_number, delivery_address)")
                .order("scheduled_date");
            if (error) throw error;
            setAllDeliveries(data as Delivery[]);
        } catch (error) {
            console.error("Error loading all deliveries:", error);
        }
    }

    function loadDeliveriesForDate(date: string) {
        const filtered = allDeliveries.filter((d) => d.scheduled_date === date);
        setDeliveries(filtered);
    }

    async function handleAddVehicle(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { error } = await supabase.from("vehicles").insert([
                {
                    ...vehicleForm,
                    is_active: vehicleForm.operational_status === "active" || vehicleForm.operational_status === "busy",
                },
            ]);
            if (error) throw error;
            setVehicleForm({
                name: "",
                type: "манипулятор 5т",
                capacity: 5,
                license_plate: "",
                operational_status: "active",
            });
            setShowAddVehicle(false);
            loadVehicles();
        } catch (error) {
            console.error("Error adding vehicle:", error);
            alert("Ошибка при добавлении транспорта");
        } finally {
            setSubmitting(false);
        }
    }

    async function deleteVehicle(id: string) {
        if (!confirm("Удалить транспорт?")) return;
        try {
            const { error } = await supabase.from("vehicles").delete().eq("id", id);
            if (error) throw error;
            loadVehicles();
        } catch (error) {
            console.error("Error deleting vehicle:", error);
            alert("Ошибка при удалении транспорта");
        }
    }

    async function setVehicleOperationalStatus(id: string, status: string) {
        // Optimistic update
        setVehicles((prev) =>
            prev.map((v) =>
                v.id === id
                    ? { ...v, operational_status: status, is_active: status === "active" || status === "busy" }
                    : v,
            ),
        );
        try {
            await supabase
                .from("vehicles")
                .update({
                    operational_status: status,
                    is_active: status === "active" || status === "busy",
                })
                .eq("id", id);
        } catch (error) {
            console.error("Error updating vehicle status:", error);
            loadVehicles(); // rollback on error
        }
    }

    async function handleAddDelivery(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const isToday = deliveryForm.scheduled_date === TODAY;
            const deliveryStatus = isToday ? "Доставляется" : "Запланирована";

            const { error } = await supabase.from("deliveries").insert({
                order_id: deliveryForm.order_id,
                vehicle_id: deliveryForm.vehicle_id,
                scheduled_date: deliveryForm.scheduled_date,
                status: deliveryStatus,
                driver_notes: deliveryForm.driver_notes,
            });
            if (error) throw error;

            // Mark vehicle as busy
            if (deliveryForm.vehicle_id) {
                await supabase
                    .from("vehicles")
                    .update({
                        operational_status: "busy",
                        is_active: true,
                    })
                    .eq("id", deliveryForm.vehicle_id);
            }

            await supabase.from("orders").update({ status: "Доставляется" }).eq("id", deliveryForm.order_id);

            setDeliveryForm({ order_id: "", vehicle_id: "", scheduled_date: TODAY, driver_notes: "" });
            setShowAddDelivery(false);
            loadVehicles();
            loadAllDeliveries();
            loadOrders();
        } catch (error) {
            console.error("Error adding delivery:", error);
            alert("Ошибка при создании доставки");
        } finally {
            setSubmitting(false);
        }
    }

    async function startDelivery(delivery: Delivery) {
        try {
            await supabase
                .from("deliveries")
                .update({
                    status: "Доставляется",
                    started_at: new Date().toISOString(),
                })
                .eq("id", delivery.id);
            await supabase.from("orders").update({ status: "Доставляется" }).eq("id", delivery.order_id);
            if (delivery.vehicle_id) {
                await supabase
                    .from("vehicles")
                    .update({ operational_status: "busy", is_active: true })
                    .eq("id", delivery.vehicle_id);
            }
            loadAllDeliveries();
            loadVehicles();
        } catch (error) {
            console.error("Error starting delivery:", error);
        }
    }

    async function completeDelivery(delivery: Delivery) {
        try {
            await supabase
                .from("deliveries")
                .update({
                    status: "Выполнена",
                    completed_at: new Date().toISOString(),
                    actual_date: TODAY,
                })
                .eq("id", delivery.id);
            await supabase.from("orders").update({ status: "Выполнен" }).eq("id", delivery.order_id);
            if (delivery.vehicle_id) {
                await supabase
                    .from("vehicles")
                    .update({ operational_status: "active", is_active: true })
                    .eq("id", delivery.vehicle_id);
            }
            loadAllDeliveries();
            loadVehicles();
            loadOrders();
        } catch (error) {
            console.error("Error completing delivery:", error);
        }
    }

    async function deleteDelivery(id: string) {
        if (!confirm("Удалить доставку?")) return;
        try {
            const { error } = await supabase.from("deliveries").delete().eq("id", id);
            if (error) throw error;
            loadAllDeliveries();
        } catch (error) {
            console.error("Error deleting delivery:", error);
            alert("Ошибка при удалении доставки");
        }
    }

    // Calendar helpers
    const daysWithDeliveries = new Set(
        allDeliveries.filter((d) => d.status !== "Выполнена").map((d) => d.scheduled_date),
    );
    const calendarCells = buildCalendar(calendarMonth.year, calendarMonth.month);
    const monthNames = [
        "Январь",
        "Февраль",
        "Март",
        "Апрель",
        "Май",
        "Июнь",
        "Июль",
        "Август",
        "Сентябрь",
        "Октябрь",
        "Ноябрь",
        "Декабрь",
    ];

    function prevMonth() {
        setCalendarMonth((p) => {
            if (p.month === 0) return { year: p.year - 1, month: 11 };
            return { year: p.year, month: p.month - 1 };
        });
    }
    function nextMonth() {
        setCalendarMonth((p) => {
            if (p.month === 11) return { year: p.year + 1, month: 0 };
            return { year: p.year, month: p.month + 1 };
        });
    }

    function padDay(d: number) {
        return String(d).padStart(2, "0");
    }
    function calendarDateStr(d: number) {
        return `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${padDay(d)}`;
    }

    if (loading) {
        return <div className="text-center py-12">Загрузка транспорта...</div>;
    }

    return (
        <div>
            <div className="flex flex-wrap gap-3 justify-between items-start mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Управление транспортом</h1>
                    <p className="text-gray-600 mt-1">Автопарк и график доставок</p>
                </div>
                <button
                    onClick={() => setShowAddVehicle(true)}
                    className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-2.5 rounded-lg hover:bg-yellow-700 transition-colors whitespace-nowrap"
                >
                    <Plus className="h-5 w-5" />
                    <span>Добавить транспорт</span>
                </button>
            </div>

            {/* Add Vehicle Modal */}
            <Modal isOpen={showAddVehicle} title="Добавить транспорт" onClose={() => setShowAddVehicle(false)}>
                <form onSubmit={handleAddVehicle} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Название <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={vehicleForm.name}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            placeholder="Манипулятор №1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Тип</label>
                        <select
                            value={vehicleForm.type}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 appearance-none"
                        >
                            {VEHICLE_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Грузоподъемность (тонн) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            required
                            step="0.1"
                            value={vehicleForm.capacity}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Гос. номер <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={vehicleForm.license_plate}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            placeholder="А001АА77"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Статус</label>
                        <select
                            value={vehicleForm.operational_status}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, operational_status: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 appearance-none"
                        >
                            {OPERATIONAL_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 transition-colors font-semibold"
                    >
                        {submitting ? "Добавление..." : "Добавить транспорт"}
                    </button>
                </form>
            </Modal>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                {/* Fleet */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Автопарк</h2>
                    <div className="space-y-4">
                        {vehicles.map((vehicle) => {
                            const statusInfo = getStatusInfo(vehicle.operational_status || "active");
                            return (
                                <div
                                    key={vehicle.id}
                                    className="p-4 border border-gray-200 rounded-lg hover:border-amber-300 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Truck className="h-4 w-4 text-gray-400" />
                                                <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {vehicle.type} • {vehicle.license_plate} • {vehicle.capacity}т
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => deleteVehicle(vehicle.id)}
                                            className="text-red-400 hover:text-red-600 ml-2"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap mt-2">
                                        <span className={`px-2 py-1 text-xs rounded font-medium ${statusInfo.color}`}>
                                            {statusInfo.label}
                                        </span>
                                        {/* Status action buttons */}
                                        {vehicle.operational_status !== "active" && (
                                            <button
                                                onClick={() => setVehicleOperationalStatus(vehicle.id, "active")}
                                                title="Пометить активным"
                                                className="p-1 rounded text-green-600 hover:bg-green-50 transition-colors"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                            </button>
                                        )}
                                        {vehicle.operational_status !== "repair" && (
                                            <button
                                                onClick={() => setVehicleOperationalStatus(vehicle.id, "repair")}
                                                title="В ремонте"
                                                className="p-1 rounded text-orange-600 hover:bg-orange-50 transition-colors"
                                            >
                                                <Wrench className="h-4 w-4" />
                                            </button>
                                        )}
                                        {vehicle.operational_status !== "inactive" && (
                                            <button
                                                onClick={() => setVehicleOperationalStatus(vehicle.id, "inactive")}
                                                title="Не активен / выведен из строя"
                                                className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {vehicles.length === 0 && (
                            <p className="text-center text-gray-500 py-4">Транспорт не добавлен</p>
                        )}
                    </div>
                </div>

                {/* Delivery schedule */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xl font-semibold">График доставок</h2>
                            <button
                                onClick={() => setShowAddDelivery(true)}
                                className="flex items-center space-x-1 bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Запланировать</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedDate(TODAY)}
                                title="Сегодня"
                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                                <Calendar className="h-5 w-5" />
                            </button>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>

                    <Modal
                        isOpen={showAddDelivery}
                        title="Запланировать доставку"
                        onClose={() => setShowAddDelivery(false)}
                    >
                        <form onSubmit={handleAddDelivery} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Заказ <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={deliveryForm.order_id}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, order_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 appearance-none"
                                >
                                    <option value="">Выберите заказ</option>
                                    {orders.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.customer ? `${o.customer.name} ${o.customer.phone}` : `Заказ #${o.order_number}`} — {o.delivery_address || "Адрес не указан"}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Транспорт <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={deliveryForm.vehicle_id}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, vehicle_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 appearance-none"
                                >
                                    <option value="">Выберите транспорт</option>
                                    {vehicles
                                        .filter((v) => v.operational_status === "active")
                                        .map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.name} ({v.license_plate}) — {v.type}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Дата доставки <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={deliveryForm.scheduled_date}
                                    onChange={(e) =>
                                        setDeliveryForm({ ...deliveryForm, scheduled_date: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Примечания водителя
                                </label>
                                <textarea
                                    value={deliveryForm.driver_notes}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, driver_notes: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                    placeholder="Время доставки, контакты, и т.д."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 transition-colors font-semibold"
                            >
                                {submitting ? "Планирование..." : "Запланировать доставку"}
                            </button>
                        </form>
                    </Modal>

                    {deliveries.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">Нет доставок на выбранную дату</div>
                    ) : (
                        <div className="space-y-3">
                            {deliveries.map((delivery) => {
                                const vehicle = vehicles.find((v) => v.id === delivery.vehicle_id);
                                const isInProgress = delivery.status === "Доставляется";
                                const isDone = delivery.status === "Выполнена" || delivery.status === "Доставлен";
                                return (
                                    <div key={delivery.id} className="p-4 border border-gray-200 rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    Заказ #{delivery.order?.order_number}
                                                </p>
                                                {delivery.order?.delivery_address && (
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {delivery.order.delivery_address}
                                                    </p>
                                                )}
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {vehicle?.name || "Транспорт не назначен"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span
                                                    className={`px-2 py-1 text-xs rounded font-medium ${getDeliveryStatusBadge(delivery.status)}`}
                                                >
                                                    {delivery.status}
                                                </span>
                                                <button
                                                    onClick={() => deleteDelivery(delivery.id)}
                                                    className="text-red-400 hover:text-red-600 ml-1"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {delivery.driver_notes && (
                                            <p className="text-xs text-gray-500 mb-2">{delivery.driver_notes}</p>
                                        )}
                                        {delivery.started_at && !isDone && (
                                            <p className="text-xs text-blue-600 mb-2">
                                                Начало:{" "}
                                                {new Date(delivery.started_at).toLocaleTimeString("ru-RU", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        )}
                                        {!isDone && (
                                            <div className="flex gap-2 mt-2">
                                                {!isInProgress && (
                                                    <button
                                                        onClick={() => startDelivery(delivery)}
                                                        className="flex items-center gap-1 px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 transition-colors"
                                                    >
                                                        <Play className="h-3 w-3" />
                                                        Начать доставку
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => completeDelivery(delivery)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Завершить
                                                </button>
                                            </div>
                                        )}
                                        {isDone && delivery.completed_at && (
                                            <p className="text-xs text-green-600 mt-1">
                                                Завершено:{" "}
                                                {new Date(delivery.completed_at).toLocaleTimeString("ru-RU", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Calendar */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Календарь доставок</h2>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={prevMonth}
                            className="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                            &#8249;
                        </button>
                        <span className="font-semibold text-gray-800 text-sm">
                            {monthNames[calendarMonth.month]} {calendarMonth.year}
                        </span>
                        <button
                            onClick={nextMonth}
                            className="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                            &#8250;
                        </button>
                    </div>
                    <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 mb-1">
                        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
                            <div key={d} className="py-1">
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1">
                        {calendarCells.map((day, idx) => {
                            if (!day) return <div key={idx} />;
                            const dateStr = calendarDateStr(day);
                            const hasDelivery = daysWithDeliveries.has(dateStr);
                            const isToday = dateStr === TODAY;
                            const isSelected = dateStr === selectedDate;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(dateStr)}
                                    className={`relative mx-auto flex flex-col items-center justify-center w-8 h-8 rounded-full text-sm transition-colors
                                        ${isSelected ? "bg-yellow-500 text-white font-bold" : isToday ? "border-2 border-yellow-400 text-yellow-700 font-semibold" : "text-gray-700 hover:bg-gray-100"}
                                    `}
                                >
                                    {day}
                                    {hasDelivery && !isSelected && (
                                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        <span>Есть доставки</span>
                        <span className="ml-3 w-4 h-4 rounded-full border-2 border-yellow-400 inline-block" />
                        <span>Сегодня</span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Статистика транспорта</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-3xl font-bold text-green-600">
                            {vehicles.filter((v) => v.operational_status === "active").length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Активных</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-3xl font-bold text-yellow-600">
                            {vehicles.filter((v) => v.operational_status === "busy").length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Занятых</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-3xl font-bold text-orange-600">
                            {vehicles.filter((v) => v.operational_status === "repair").length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">В ремонте</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600">
                            {allDeliveries.filter((d) => d.status === "Доставляется").length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Доставляется сейчас</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
