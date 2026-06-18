import { useState } from "react";
import { LayoutDashboard, ShoppingCart, Users, Truck, Package, ChartBar as BarChart3, ArrowLeft, FileText, Menu, X } from "lucide-react";
import { OrdersSection } from "./OrdersSection";
import { CustomersSection } from "./CustomersSection";
import { VehiclesSection } from "./VehiclesSection";
import { InventorySection } from "./InventorySection";
import { AnalyticsSection } from "./AnalyticsSection";
import { ContractsSection } from "./ContractsSection";
import { useAuth } from "../../contexts/AuthContext";

const CONTRACTS_EMAIL = "yobaboba80@gmail.com";

type Section = "orders" | "customers" | "vehicles" | "inventory" | "analytics" | "contracts";

interface AdminDashboardProps {
    onNavigate?: (page: string) => void;
}

interface NewCustomerData {
    name?: string;
    phone?: string;
}

const ADMIN_SECTION_KEY = "paving_admin_section";

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
    const { user } = useAuth();
    const canViewContracts = user?.email === CONTRACTS_EMAIL;

    const [activeSection, setActiveSection] = useState<Section>(() => {
        const stored = localStorage.getItem(ADMIN_SECTION_KEY) as Section | null;
        if (stored === "contracts" && !canViewContracts) return "orders";
        return stored || "orders";
    });
    const [newCustomerInitial, setNewCustomerInitial] = useState<NewCustomerData | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const changeSection = (section: Section) => {
        setActiveSection(section);
        localStorage.setItem(ADMIN_SECTION_KEY, section);
        setMobileSidebarOpen(false);
    };

    const allMenuItems = [
        { id: "orders" as Section, label: "Заказы", icon: ShoppingCart },
        { id: "customers" as Section, label: "Клиенты", icon: Users },
        { id: "vehicles" as Section, label: "Транспорт", icon: Truck },
        { id: "inventory" as Section, label: "Склад", icon: Package },
        { id: "analytics" as Section, label: "Аналитика", icon: BarChart3 },
        { id: "contracts" as Section, label: "Договоры", icon: FileText },
    ];

    const menuItems = canViewContracts
        ? allMenuItems
        : allMenuItems.filter((item) => item.id !== "contracts");

    function handleNavigateToAddCustomer(data?: NewCustomerData) {
        setNewCustomerInitial(data || null);
        changeSection("customers");
    }

    function handleCustomerCreated(customerId: string) {
        setSelectedCustomerId(customerId);
        setNewCustomerInitial(null);
        changeSection("orders");
    }

    const activeItem = menuItems.find((i) => i.id === activeSection);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile top bar */}
            <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onNavigate?.("home")}
                        className="p-1.5 text-gray-500 hover:text-gray-800"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-semibold text-gray-900 text-base">
                        {activeItem?.label || "CRM"}
                    </span>
                </div>
                <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className="p-1.5 text-gray-500 hover:text-gray-800"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            {/* Mobile sidebar overlay */}
            {mobileSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col">
                        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <LayoutDashboard className="h-5 w-5 text-yellow-600" />
                                <span className="font-bold text-gray-900">CRM</span>
                            </div>
                            <button onClick={() => setMobileSidebarOpen(false)} className="p-1 text-gray-500">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <button
                            onClick={() => { onNavigate?.("home"); setMobileSidebarOpen(false); }}
                            className="flex items-center space-x-3 px-4 py-3 mx-3 mt-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span>На портал</span>
                        </button>
                        <nav className="flex-1 overflow-y-auto p-3">
                            <ul className="space-y-1">
                                {menuItems.map((item) => (
                                    <li key={item.id}>
                                        <button
                                            onClick={() => { changeSection(item.id); setNewCustomerInitial(null); }}
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
                    </div>
                </div>
            )}

            <div className="flex">
                {/* Desktop sidebar */}
                <aside className="hidden md:block w-64 bg-white shadow-lg min-h-screen flex-shrink-0">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                            <LayoutDashboard className="h-6 w-6 text-yellow-600" />
                            <h2 className="text-xl font-bold text-gray-900"></h2>
                        </div>
                    </div>
                    <button
                        onClick={() => onNavigate?.("home")}
                        className="w-full flex items-center space-x-3 px-4 py-3 m-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        style={{ width: "calc(100% - 2rem)" }}
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span>На портал</span>
                    </button>
                    <nav className="p-4">
                        <ul className="space-y-2">
                            {menuItems.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => {
                                            changeSection(item.id);
                                            setNewCustomerInitial(null);
                                        }}
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

                <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8">
                    {activeSection === "orders" && (
                        <OrdersSection
                            onNavigateToAddCustomer={handleNavigateToAddCustomer}
                            selectedCustomerId={selectedCustomerId}
                            onCustomerSelected={() => setSelectedCustomerId(null)}
                        />
                    )}
                    {activeSection === "customers" && (
                        <CustomersSection
                            initialData={newCustomerInitial}
                            onCustomerCreated={(customerId) => {
                                handleCustomerCreated(customerId);
                                setNewCustomerInitial(null);
                            }}
                        />
                    )}
                    {activeSection === "vehicles" && <VehiclesSection />}
                    {activeSection === "inventory" && <InventorySection />}
                    {activeSection === "analytics" && <AnalyticsSection />}
                    {activeSection === "contracts" && <ContractsSection />}
                </main>
            </div>
        </div>
    );
}
