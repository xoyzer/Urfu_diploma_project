import { useState } from "react";
import { LayoutDashboard, ShoppingCart, Users, Truck, Package, BarChart3, ArrowLeft } from "lucide-react";
import { OrdersSection } from "./OrdersSection";
import { CustomersSection } from "./CustomersSection";
import { VehiclesSection } from "./VehiclesSection";
import { InventorySection } from "./InventorySection";
import { AnalyticsSection } from "./AnalyticsSection";

type Section = "orders" | "customers" | "vehicles" | "inventory" | "analytics";

interface AdminDashboardProps {
    onNavigate?: (page: string) => void;
}

const ADMIN_SECTION_KEY = "paving_admin_section";

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
    const [activeSection, setActiveSection] = useState<Section>(() => {
        const stored = localStorage.getItem(ADMIN_SECTION_KEY) as Section | null;
        return stored || "orders";
    });

    const changeSection = (section: Section) => {
        setActiveSection(section);
        localStorage.setItem(ADMIN_SECTION_KEY, section);
    };

    const menuItems = [
        { id: "orders" as Section, label: "Заказы", icon: ShoppingCart },
        { id: "customers" as Section, label: "Клиенты", icon: Users },
        { id: "vehicles" as Section, label: "Транспорт", icon: Truck },
        { id: "inventory" as Section, label: "Склад", icon: Package },
        { id: "analytics" as Section, label: "Аналитика", icon: BarChart3 },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <aside className="w-64 bg-white shadow-lg min-h-screen">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                            <LayoutDashboard className="h-6 w-6 text-yellow-600" />
                            <h2 className="text-xl font-bold text-gray-900">CRM Панель</h2>
                        </div>
                    </div>
                    <button
                        onClick={() => onNavigate?.("home")}
                        className="w-full flex items-center space-x-3 px-4 py-3 m-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span>На портал</span>
                    </button>
                    <nav className="p-4">
                        <ul className="space-y-2">
                            {menuItems.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => changeSection(item.id)}
                                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                            activeSection === item.id
                                                ? "bg-amber-50 text-amber-600 font-semibold"
                                                : "text-gray-700 hover:bg-gray-50"
                                        }`}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                <main className="flex-1 p-8">
                    {activeSection === "orders" && <OrdersSection />}
                    {activeSection === "customers" && <CustomersSection />}
                    {activeSection === "vehicles" && <VehiclesSection />}
                    {activeSection === "inventory" && <InventorySection />}
                    {activeSection === "analytics" && <AnalyticsSection />}
                </main>
            </div>
        </div>
    );
}
