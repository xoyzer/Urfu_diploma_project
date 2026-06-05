import { useState, useEffect } from "react";
import { Plus, Calendar, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Modal } from "../../components/Modal";
import { Database } from "../../types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
type Delivery = Database["public"]["Tables"]["deliveries"]["Row"] & { order: { order_number: string } };
type Order = Database["public"]["Tables"]["orders"]["Row"];

export function VehiclesSection() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [showAddDelivery, setShowAddDelivery] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [vehicleForm, setVehicleForm] = useState({
        name: "",
        type: "манипулятор",
        capacity: 0,
        license_plate: "",
        is_active: true,
    });
    const [deliveryForm, setDeliveryForm] = useState({
        order_id: "",
        vehicle_id: "",
        scheduled_date: new Date().toISOString().split("T")[0],
        driver_notes: "",
    });

    useEffect(() => {
        loadVehicles();
        loadDeliveries();
        loadOrders();
    }, [selectedDate]);

    async function loadOrders() {
        try {
            const { data, error } = await supabase.from("orders").select("*").eq("status", "Согласован");
            if (error) throw error;
            setOrders(data || []);
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

    async function loadDeliveries() {
        try {
            const { data, error } = await supabase
                .from("deliveries")
                .select(
                    `
          *,
          order:orders(order_number)
        `,
                )
                .eq("scheduled_date", selectedDate)
                .order("scheduled_date");

            if (error) throw error;
            setDeliveries(data as Delivery[]);
        } catch (error) {
            console.error("Error loading deliveries:", error);
        }
    }

    async function handleAddVehicle(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { error } = await supabase.from("vehicles").insert([vehicleForm]);
            if (error) throw error;
            setVehicleForm({ name: "", type: "манипулятор", capacity: 0, license_plate: "", is_active: true });
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

    async function handleAddDelivery(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { error } = await supabase.from("deliveries").insert({
                order_id: deliveryForm.order_id,
                vehicle_id: deliveryForm.vehicle_id,
                scheduled_date: deliveryForm.scheduled_date,
                status: "Запланирована",
                driver_notes: deliveryForm.driver_notes,
            });

            if (error) throw error;

            await supabase.from("orders").update({ status: "Доставляется" }).eq("id", deliveryForm.order_id);

            setDeliveryForm({
                order_id: "",
                vehicle_id: "",
                scheduled_date: new Date().toISOString().split("T")[0],
                driver_notes: "",
            });
            setShowAddDelivery(false);
            loadDeliveries();
            loadOrders();
        } catch (error) {
            console.error("Error adding delivery:", error);
            alert("Ошибка при создании доставки");
        } finally {
            setSubmitting(false);
        }
    }

    async function deleteDelivery(id: string) {
        if (!confirm("Удалить доставку?")) return;
        try {
            const { error } = await supabase.from("deliveries").delete().eq("id", id);
            if (error) throw error;
            loadDeliveries();
        } catch (error) {
            console.error("Error deleting delivery:", error);
            alert("Ошибка при удалении доставки");
        }
    }

    if (loading) {
        return <div className="text-center py-12">Загрузка транспорта...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Управление транспортом</h1>
                    <p className="text-gray-600 mt-2">Автопарк и график доставок</p>
                </div>
                <button
                    onClick={() => setShowAddVehicle(true)}
                    className="flex items-center space-x-2 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    <span>Добавить транспорт</span>
                </button>
            </div>

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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="манипулятор">Манипулятор</option>
                            <option value="фура">Фура</option>
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
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={vehicleForm.is_active}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, is_active: e.target.checked })}
                            className="rounded"
                        />
                        <span className="text-sm font-semibold text-gray-700">Активен</span>
                    </label>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors font-semibold"
                    >
                        {submitting ? "Добавление..." : "Добавить транспорт"}
                    </button>
                </form>
            </Modal>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Автопарк</h2>
                    <div className="space-y-4">
                        {vehicles.map((vehicle) => (
                            <div
                                key={vehicle.id}
                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-amber-300 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
                                        <span
                                            className={`px-2 py-1 text-xs rounded ${
                                                vehicle.is_active
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                            }`}
                                        >
                                            {vehicle.is_active ? "Активен" : "Неактивен"}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {vehicle.type} • {vehicle.license_plate} • Грузоподъемность: {vehicle.capacity}т
                                    </p>
                                </div>
                                <button
                                    onClick={() => deleteVehicle(vehicle.id)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">График доставок</h2>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setShowAddDelivery(true)}
                                className="flex items-center space-x-1 bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Запланировать доставку</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                                title="Переключить на сегодняшнюю дату"
                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                                <Calendar className="h-5 w-5" />
                            </button>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="">Выберите заказ</option>
                                    {orders.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            Заказ #{o.order_number} - {o.delivery_address || "Адрес не указан"}
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="">Выберите транспорт</option>
                                    {vehicles
                                        .filter((v) => v.is_active)
                                        .map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.name} ({v.license_plate})
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
                        <div className="text-center py-8 text-gray-600">
                            Нет запланированных доставок на выбранную дату
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {deliveries.map((delivery) => {
                                const vehicle = vehicles.find((v) => v.id === delivery.vehicle_id);
                                return (
                                    <div key={delivery.id} className="p-4 border border-gray-200 rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    Заказ: {delivery.order?.order_number}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    Транспорт: {vehicle?.name || "Не назначен"}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span
                                                    className={`px-2 py-1 text-xs rounded ${
                                                        delivery.status === "Выполнена"
                                                            ? "bg-green-100 text-green-800"
                                                            : delivery.status === "В пути"
                                                              ? "bg-blue-100 text-blue-800"
                                                              : "bg-yellow-100 text-yellow-800"
                                                    }`}
                                                >
                                                    {delivery.status}
                                                </span>
                                                <button
                                                    onClick={() => deleteDelivery(delivery.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {delivery.driver_notes && (
                                            <p className="text-sm text-gray-600 mt-2">{delivery.driver_notes}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Статистика использования транспорта</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                        <div className="text-3xl font-bold text-amber-600">
                            {vehicles.filter((v) => v.is_active).length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Активных единиц</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600">
                            {deliveries.filter((d) => d.status === "В пути").length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Доставок в пути</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-3xl font-bold text-green-600">
                            {deliveries.filter((d) => d.status === "Выполнена").length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Выполнено сегодня</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
