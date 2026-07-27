import { useState, useEffect } from "react";
import { Calculator, Truck, MapPin, ShoppingCart, Plus, Trash2, Search, Loader as Loader2, Info, TriangleAlert as AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Database } from "../types/database";
import { YandexMapPicker } from "../components/YandexMapPicker";

type Product = Database["public"]["Tables"]["products"]["Row"];

export interface CartItem {
    product: Product;
    quantity: number;
    subtotal: number;
    weight: number;
}

export interface FleetVehicleResult {
    vehicleType: string;
    label: string;
    tripCount: number;
    costPerTrip: number;
    totalCost: number;
}

export interface CalculatorResult {
    items: CartItem[];
    deliveryType: string;
    vehicleType: string;
    fleet: FleetVehicleResult[];
    deliveryAddress: string;
    distance: number;
    totalWeight: number;
    productCost: number;
    deliveryCost: number;
    totalCost: number;
    isPickup: boolean;
}

interface CalculatorPageProps {
    onNavigate: (result: CalculatorResult) => void;
}

function getWeightPerUnit(product: Product): number {
    const name = product.name.toLowerCase();
    if (product.category === "Бордюры") return 10;
    if (product.category === "Смеси") return 50;
    if (name.includes("40мм")) return 100;
    if (name.includes("60мм")) return 125;
    return 100;
}

interface Transport {
    name: string;
    capacityKg: number;
    baseCost: number;
    perKmRate: number;
    vehicleType: string;
    label: string;
    billsFromMkad: boolean;
}

const TRANSPORT_OPTIONS: Transport[] = [
    {
        name: "manipulator_5t",
        capacityKg: 5000,
        baseCost: 6000,
        perKmRate: 100,
        vehicleType: "манипулятор 5т",
        label: "Манипулятор 5т",
        billsFromMkad: false,
    },
    {
        name: "manipulator_8t",
        capacityKg: 8000,
        baseCost: 9000,
        perKmRate: 100,
        vehicleType: "манипулятор 8т",
        label: "Манипулятор 8т",
        billsFromMkad: false,
    },
    {
        name: "manipulator_10t",
        capacityKg: 11000,
        baseCost: 19000,
        perKmRate: 140,
        vehicleType: "манипулятор 10т",
        label: "Манипулятор 10т",
        billsFromMkad: true,
    },
    {
        name: "truck_20t",
        capacityKg: 20000,
        baseCost: 25000,
        perKmRate: 160,
        vehicleType: "фура 20т",
        label: "Фура 20т",
        billsFromMkad: true,
    },
];

interface FleetVehicle {
    transport: Transport;
    tripCount: number;
    costPerTrip: number;
    totalCost: number;
}

function billedKmFor(transport: Transport, distanceKm: number): number {
    return transport.billsFromMkad ? Math.max(0, distanceKm - BASE_TO_MKAD_KM) : distanceKm;
}

function tripCostFor(transport: Transport, distanceKm: number): number {
    if (distanceKm === 0) return 0;
    return transport.baseCost + billedKmFor(transport, distanceKm) * transport.perKmRate;
}

function computeFleet(totalWeightKg: number, distanceKm: number): FleetVehicle[] {
    if (totalWeightKg <= 0) return [];
    const largest = TRANSPORT_OPTIONS[TRANSPORT_OPTIONS.length - 1];
    if (totalWeightKg <= largest.capacityKg) {
        const transport = pickTransport(totalWeightKg);
        const cost = tripCostFor(transport, distanceKm);
        return [{ transport, tripCount: 1, costPerTrip: cost, totalCost: cost }];
    }
    const fleet: FleetVehicle[] = [];
    let remaining = totalWeightKg;
    while (remaining > 0) {
        if (remaining <= largest.capacityKg) {
            const t = pickTransport(remaining);
            const cost = tripCostFor(t, distanceKm);
            fleet.push({ transport: t, tripCount: 1, costPerTrip: cost, totalCost: cost });
            remaining = 0;
        } else {
            const cost = tripCostFor(largest, distanceKm);
            fleet.push({ transport: largest, tripCount: 1, costPerTrip: cost, totalCost: cost });
            remaining -= largest.capacityKg;
        }
    }
    const grouped = new Map<string, FleetVehicle>();
    for (const v of fleet) {
        const existing = grouped.get(v.transport.name);
        if (existing) {
            existing.tripCount += 1;
            existing.totalCost += v.costPerTrip;
        } else {
            grouped.set(v.transport.name, { ...v });
        }
    }
    return Array.from(grouped.values());
}

// Approximate road distance from the base to MKAD (Щёлковское шоссе)
const BASE_TO_MKAD_KM = 22;

const ORIGIN = {
    address: "Московская обл., Щёлковский р-н, д. Долгое Ледово, ул. Академическая, 5",
    lat: 55.899,
    lon: 37.949,
};

const DELIVERY_REGIONS = [
    "Москва",
    "Московская область",
    "Тверская область",
    "Тульская область",
    "Владимирская область",
    "Ярославская область",
    "Калужская область",
];

interface Geocoded {
    lat: number;
    lon: number;
    displayName: string;
}

async function geocodeAddress(address: string): Promise<Geocoded | null> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ru&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { "Accept-Language": "ru" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name,
    };
}

async function routeDistanceKm(
    origin: { lat: number; lon: number },
    dest: { lat: number; lon: number },
): Promise<number | null> {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance;
    if (typeof meters !== "number") return null;
    return Math.round(meters / 1000);
}

function pickTransport(totalWeightKg: number): Transport {
    for (const t of TRANSPORT_OPTIONS) {
        if (totalWeightKg <= t.capacityKg) return t;
    }
    return TRANSPORT_OPTIONS[TRANSPORT_OPTIONS.length - 1];
}

export function CalculatorPage({ onNavigate }: CalculatorPageProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [items, setItems] = useState<CartItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [newQuantity, setNewQuantity] = useState<number>(0);
    const [distance, setDistance] = useState<number>(0);
    const [isPickup, setIsPickup] = useState<boolean>(false);
    const [destAddress, setDestAddress] = useState<string>("");
    const [resolvedAddress, setResolvedAddress] = useState<string>("");
    const [geocoding, setGeocoding] = useState<boolean>(false);
    const [geocodeError, setGeocodeError] = useState<string>("");

    const CALCULATOR_STORAGE_KEY = "calculator_state";

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (products.length > 0) {
            restoreCalculatorState();
            const preselect = localStorage.getItem("calculator_preselect_product");
            if (preselect) {
                setSelectedProductId(preselect);
                localStorage.removeItem("calculator_preselect_product");
            }
        }
    }, [products]);

    function saveCalculatorState() {
        const state = {
            itemIds: items.map((i) => ({
                productId: i.product.id,
                quantity: i.quantity,
                subtotal: i.subtotal,
                weight: i.weight,
            })),
            distance,
            isPickup,
            destAddress,
        };
        localStorage.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify(state));
    }

    function restoreCalculatorState() {
        try {
            const saved = localStorage.getItem(CALCULATOR_STORAGE_KEY);
            if (saved) {
                const state = JSON.parse(saved);
                setDistance(state.distance || 0);
                setIsPickup(state.isPickup || false);
                setDestAddress(state.destAddress || "");
                if (state.itemIds && products.length > 0) {
                    const restoredItems: CartItem[] = [];
                    for (const savedItem of state.itemIds) {
                        const prod = products.find((p) => p.id === savedItem.productId);
                        if (prod) {
                            restoredItems.push({
                                product: prod,
                                quantity: savedItem.quantity,
                                subtotal: savedItem.subtotal,
                                weight: savedItem.weight,
                            });
                        }
                    }
                    setItems(restoredItems);
                }
            }
        } catch (error) {
            console.error("Failed to restore calculator state:", error);
        }
    }

    useEffect(() => {
        if (items.length > 0 || distance || isPickup || destAddress) {
            saveCalculatorState();
        }
    }, [items, distance, isPickup, destAddress]);

    async function loadProducts() {
        const { data } = await supabase
            .from("products")
            .select("*")
            .eq("is_active", true)
            .order("category")
            .order("name");
        setProducts(data || []);
    }

    const productsByCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
        (acc[p.category] = acc[p.category] || []).push(p);
        return acc;
    }, {});

    const addItem = () => {
        if (!selectedProductId || newQuantity <= 0) return;
        const product = products.find((p) => p.id === selectedProductId);
        if (!product) return;

        const existing = items.find((i) => i.product.id === product.id);
        if (existing) {
            setItems(
                items.map((i) =>
                    i.product.id === product.id
                        ? {
                              ...i,
                              quantity: i.quantity + newQuantity,
                              subtotal: (i.quantity + newQuantity) * product.price_per_sqm,
                              weight: (i.quantity + newQuantity) * getWeightPerUnit(product),
                          }
                        : i,
                ),
            );
        } else {
            setItems([
                ...items,
                {
                    product,
                    quantity: newQuantity,
                    subtotal: newQuantity * product.price_per_sqm,
                    weight: newQuantity * getWeightPerUnit(product),
                },
            ]);
        }
        setSelectedProductId("");
        setNewQuantity(0);
    };

    const removeItem = (productId: string) => {
        setItems(items.filter((i) => i.product.id !== productId));
    };

    const updateItemQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeItem(productId);
            return;
        }
        setItems(
            items.map((i) =>
                i.product.id === productId
                    ? {
                          ...i,
                          quantity,
                          subtotal: quantity * i.product.price_per_sqm,
                          weight: quantity * getWeightPerUnit(i.product),
                      }
                    : i,
            ),
        );
    };

    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    const productCost = items.reduce((sum, i) => sum + i.subtotal, 0);
    const fleet = isPickup || items.length === 0 ? [] : computeFleet(totalWeight, distance);
    const deliveryCost = fleet.reduce((sum, v) => sum + v.totalCost, 0);

    const totalCost = productCost + deliveryCost;
    const handleCalculateDistance = async () => {
        if (!destAddress.trim()) return;
        setGeocoding(true);
        setGeocodeError("");
        setResolvedAddress("");
        try {
            const geo = await geocodeAddress(destAddress.trim());
            if (!geo) {
                setGeocodeError("Не удалось найти адрес. Попробуйте уточнить (город, улица, дом).");
                return;
            }
            setResolvedAddress(geo.displayName);
            const km = await routeDistanceKm({ lat: ORIGIN.lat, lon: ORIGIN.lon }, { lat: geo.lat, lon: geo.lon });
            if (km == null) {
                setGeocodeError("Не удалось рассчитать расстояние. Введите значение вручную.");
                return;
            }
            setDistance(km);
        } catch (error) {
            console.error(error);
            setGeocodeError("Ошибка при расчёте. Попробуйте позже или введите расстояние вручную.");
        } finally {
            setGeocoding(false);
        }
    };

    const handleMapAddressSelect = async (address: string, coords: { lat: number; lon: number }) => {
        setDestAddress(address);
        setResolvedAddress(address);
        setGeocodeError("");
        setGeocoding(true);
        try {
            const km = await routeDistanceKm({ lat: ORIGIN.lat, lon: ORIGIN.lon }, coords);
            if (km == null) {
                setGeocodeError("Не удалось рассчитать расстояние. Введите значение вручную.");
                return;
            }
            setDistance(km);
        } catch {
            setGeocodeError("Ошибка при расчёте. Попробуйте позже или введите расстояние вручную.");
        } finally {
            setGeocoding(false);
        }
    };

    const stockOverflowItems = items.filter((item) => item.product.stock_quantity > 0 && item.quantity > item.product.stock_quantity);

    const handleOrder = () => {
        if (items.length === 0) return;
        if (stockOverflowItems.length > 0) return;
        saveCalculatorState();
        const fleetResult: FleetVehicleResult[] = fleet.map((v) => ({
            vehicleType: v.transport.vehicleType,
            label: v.transport.label,
            tripCount: v.tripCount,
            costPerTrip: v.costPerTrip,
            totalCost: v.totalCost,
        }));
        onNavigate({
            items,
            deliveryType: isPickup
                ? "Самовывоз"
                : fleet.length === 1
                    ? fleet[0].transport.label
                    : `${fleet.length} транспорта`,
            vehicleType: isPickup ? "" : fleet.map((v) => v.transport.vehicleType).join(", "),
            fleet: isPickup ? [] : fleetResult,
            deliveryAddress: isPickup ? "" : destAddress,
            distance: isPickup ? 0 : distance,
            totalWeight,
            productCost,
            deliveryCost,
            totalCost,
            isPickup,
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-lg p-5 sm:p-8">
                    <div className="flex items-center mb-6 sm:mb-8">
                        <Calculator className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-600 mr-3 flex-shrink-0" />
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Калькулятор стоимости</h1>
                    </div>

                    <div className="space-y-6 sm:space-y-8">
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Добавить товар</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-end">
                                <div className="sm:col-span-7">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Продукт</label>
                                    <select
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white pr-10"
                                    >
                                        <option value="">-- Выберите продукт --</option>
                                        {Object.entries(productsByCategory).map(([cat, list]) => (
                                            <optgroup key={cat} label={cat}>
                                                {list.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} — {p.price_per_sqm} ₽/{p.unit}
                                                        {p.stock_quantity > 0
                                                            ? ` (в наличии: ${p.stock_quantity} ${p.unit})`
                                                            : " (на заказ)"}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                                <div className="sm:col-span-3">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Количество (
                                        {(() => {
                                            const p = products.find((p) => p.id === selectedProductId);
                                            return p ? p.unit : "шт/м²";
                                        })()}
                                        )
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newQuantity || ""}
                                        onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-600 focus:border-transparent"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <button
                                        onClick={addItem}
                                        disabled={!selectedProductId || newQuantity <= 0}
                                        className="w-full flex items-center justify-center space-x-2 bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                                    >
                                        <Plus className="h-5 w-5" />
                                        <span>Добавить</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {items.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Корзина ({items.length})</h2>
                                <div className="space-y-3">
                                    {items.map((item) => (
                                        <div
                                            key={item.product.id}
                                            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-gray-900 text-sm sm:text-base leading-snug">
                                                        {item.product.name}
                                                    </div>
                                                    <div className="text-xs sm:text-sm text-gray-600 mt-0.5">
                                                        {item.product.category} · {item.product.price_per_sqm} ₽/
                                                        {item.product.unit}
                                                    </div>
                                                    <span
                                                        className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            item.product.stock_quantity > 0
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-orange-100 text-orange-700"
                                                        }`}
                                                    >
                                                        {item.product.stock_quantity > 0
                                                            ? `В наличии: ${item.product.stock_quantity} ${item.product.unit}`
                                                            : "На заказ"}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.product.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step={item.product.unit === "шт" ? "1" : "0.1"}
                                                        value={item.quantity}
                                                        onChange={(e) =>
                                                            updateItemQuantity(
                                                                item.product.id,
                                                                parseFloat(e.target.value) || 0,
                                                            )
                                                        }
                                                        className="w-20 sm:w-24 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm"
                                                    />
                                                    <span className="text-sm text-gray-600">{item.product.unit}</span>
                                                </div>
                                                <div className="font-semibold text-gray-900 text-sm sm:text-base">
                                                    {item.subtotal.toLocaleString("ru-RU")} ₽
                                                </div>
                                            </div>
                                            {item.product.stock_quantity > 0 &&
                                                item.quantity > item.product.stock_quantity && (
                                                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                        Доступно только {item.product.stock_quantity}{" "}
                                                        {item.product.unit}
                                                    </p>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <input
                                id="pickup-checkbox"
                                type="checkbox"
                                checked={isPickup}
                                onChange={(e) => setIsPickup(e.target.checked)}
                                className="h-5 w-5 text-yellow-600 rounded border-gray-300 focus:ring-yellow-600 accent-yellow-300"
                            />
                            <label
                                htmlFor="pickup-checkbox"
                                className="ml-3 text-sm font-semibold text-gray-700 cursor-pointer"
                            >
                                Самовывоз (без доставки)
                            </label>
                        </div>

                        {!isPickup && (
                            <div className="space-y-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <Info className="h-5 w-5 text-slate-500 mt-0.5 mr-2 flex-shrink-0" />
                                        <div className="text-sm text-slate-700">
                                            <div className="mb-1">
                                                <span className="font-semibold">Доставка с адреса:</span>{" "}
                                                {ORIGIN.address}
                                            </div>
                                            <div>
                                                <span className="font-semibold">Регионы доставки:</span>{" "}
                                                {DELIVERY_REGIONS.join(", ")}. Дальше — по согласованию.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <MapPin className="inline h-4 w-4 mr-1" />
                                        Адрес доставки
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="text"
                                            value={destAddress}
                                            onChange={(e) => setDestAddress(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleCalculateDistance();
                                                }
                                            }}
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-600 focus:border-transparent"
                                            placeholder="Например: Москва, Тверская улица, 1"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCalculateDistance}
                                            disabled={geocoding || !destAddress.trim()}
                                            className="flex items-center justify-center space-x-2 bg-yellow-600 text-white px-4 py-3 rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold whitespace-nowrap"
                                        >
                                            {geocoding ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Search className="h-5 w-5" />
                                            )}
                                            <span>Рассчитать</span>
                                        </button>
                                    </div>
                                    {resolvedAddress && (
                                        <p className="text-xs text-green-700 mt-2">Найдено: {resolvedAddress}</p>
                                    )}
                                    {geocodeError && <p className="text-xs text-red-600 mt-2">{geocodeError}</p>}
                                    <div className="mt-3">
                                        <YandexMapPicker
                                            apiKey={import.meta.env.VITE_YANDEX_MAPS_API_KEY}
                                            initialAddress={destAddress}
                                            center={[ORIGIN.lat, ORIGIN.lon]}
                                            onAddressSelect={handleMapAddressSelect}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Расстояние (км)
                                    </label>
                                    <input
                                        type="number"
                                        readOnly
                                        value={distance || ""}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-default"
                                        placeholder="Будет рассчитано автоматически"
                                    />
                                </div>
                            </div>
                        )}

                        {!isPickup && items.length > 0 && (
                            <div className="bg-yellow-0 border-2 border-yellow-10 rounded-lg p-4 sm:p-6">
                                <div className="flex items-center mb-3">
                                    <Truck className="h-6 w-6 text-yellow-600 mr-2 flex-shrink-0" />
                                    <h3 className="text-lg font-semibold text-gray-900">Рекомендованный транспорт</h3>
                                </div>
                                {fleet.length === 0 ? (
                                    <p className="text-sm text-gray-600">Самовывоз</p>
                                ) : fleet.length === 1 ? (
                                    <div>
                                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                                            <span className="text-xl font-bold text-yellow-700">{fleet[0].transport.label}</span>
                                            <span className="text-sm text-gray-600">
                                                Подача {fleet[0].transport.baseCost.toLocaleString("ru-RU")} ₽ +{" "}
                                                {fleet[0].transport.perKmRate} ₽/км
                                                {fleet[0].transport.billsFromMkad && " от МКАД"}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm text-gray-600">
                                            Общий вес груза:{" "}
                                            <span className="font-semibold">{totalWeight.toLocaleString("ru-RU")} кг</span>
                                        </div>
                                        {fleet[0].transport.billsFromMkad && distance > 0 && (
                                            <div className="mt-1 text-sm text-gray-500">
                                                Км от МКАД: <span className="font-semibold">{billedKmFor(fleet[0].transport, distance)} км</span> (маршрут{" "}
                                                {distance} км − {BASE_TO_MKAD_KM} км до МКАД)
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-sm text-gray-600 mb-2">
                                            Вес груза <span className="font-semibold">{totalWeight.toLocaleString("ru-RU")} кг</span> превышает вместимость одной фуры ({(20000).toLocaleString("ru-RU")} кг) — потребуется несколько транспортов:
                                        </div>
                                        <div className="space-y-2">
                                            {fleet.map((v, idx) => (
                                                <div key={idx} className="flex items-baseline justify-between bg-white rounded-lg p-3 border border-yellow-500">
                                                    <div>
                                                        <div className="font-semibold text-gray-900">
                                                            {v.transport.label}
                                                            {v.tripCount > 1 && <span className="text-amber-600 ml-1">× {v.tripCount} рейс(а)</span>}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {v.transport.baseCost.toLocaleString("ru-RU")} ₽ подача + {v.transport.perKmRate} ₽/км{v.transport.billsFromMkad ? " от МКАД" : ""}
                                                        </div>
                                                    </div>
                                                    <div className="font-semibold text-yellow-700 text-sm whitespace-nowrap">
                                                        {v.totalCost.toLocaleString("ru-RU")} ₽
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-2 text-sm text-gray-600">
                                            Итого доставка: <span className="font-semibold text-yellow-700">{deliveryCost.toLocaleString("ru-RU")} ₽</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-yellow-50/50 p-4 sm:p-6 rounded-lg border-2 border-yellow-600/30">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900">Расчет стоимости</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-gray-700">
                                    <span>Стоимость материалов:</span>
                                    <span className="font-semibold">{productCost.toLocaleString("ru-RU")} ₽</span>
                                </div>
                                <div className="flex justify-between text-gray-700">
                                    <span>Стоимость доставки:</span>
                                    <span className="font-semibold">{deliveryCost.toLocaleString("ru-RU")} ₽</span>
                                </div>
                                <div className="border-t-2 border-yellow-600/30 pt-2 mt-2 flex justify-between text-xl font-bold text-yellow-700">
                                    <span>Итого:</span>
                                    <span>{totalCost.toLocaleString("ru-RU")} ₽</span>
                                </div>
                            </div>
                        </div>

                        {stockOverflowItems.length > 0 && (
                            <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Недостаточно товара на складе:</p>
                                    <ul className="mt-1 space-y-0.5">
                                        {stockOverflowItems.map((item) => (
                                            <li key={item.product.id}>
                                                {item.product.name} — в наличии {item.product.stock_quantity}{" "}
                                                {item.product.unit}, в заказе {item.quantity} {item.product.unit}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-1.5 text-red-600">Уменьшите количество или оформите товар «на заказ».</p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleOrder}
                            disabled={items.length === 0 || stockOverflowItems.length > 0}
                            className="w-full flex items-center justify-center space-x-2 bg-yellow-600 text-white py-4 rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-lg font-semibold"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            <span>Оформить заявку</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
