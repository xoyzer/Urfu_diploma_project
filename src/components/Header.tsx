import { useState } from "react";
import { User, LogOut, Phone, Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface HeaderProps {
    onNavigate: (page: string, clearOrder?: boolean, options?: { category?: string }) => void;
}

const CATEGORIES = [
    { id: "Брусчатка", name: "Брусчатка" },
    { id: "Бордюры", name: "Бордюры" },
    { id: "Смеси", name: "Смеси" },
];

export function Header({ onNavigate }: HeaderProps) {
    const { user, signOut } = useAuth();
    const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);

    function handleCategoryClick(categoryId: string) {
        onNavigate("catalog", false, { category: categoryId });
        setShowCatalogDropdown(false);
        setMobileMenuOpen(false);
        setMobileCatalogOpen(false);
    }

    function handleNav(page: string) {
        onNavigate(page);
        setMobileMenuOpen(false);
    }

    return (
        <header className="bg-white shadow-md border-b-2 border-yellow-600 relative z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3">
                    {/* Logo */}
                    <div
                        className="flex items-center space-x-3 cursor-pointer transition-transform duration-300 hover:scale-105 flex-shrink-0"
                        onClick={() => handleNav("home")}
                    >
                        <img
                            src="/Фабрика Плитки (лого 2).png"
                            alt="Фабрика Плитки"
                            className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
                        />
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Фабрика Плитки</h1>
                            <p className="text-xs text-yellow-600 font-medium hidden sm:block">Тротуарная плитка и бордюры</p>
                        </div>
                    </div>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex space-x-8">
                        <div
                            className="relative"
                            onMouseEnter={() => setShowCatalogDropdown(true)}
                            onMouseLeave={() => setShowCatalogDropdown(false)}
                        >
                            <button
                                onClick={() => onNavigate("catalog")}
                                className="text-gray-700 hover:text-yellow-600 transition-colors font-medium"
                            >
                                Каталог
                            </button>
                            {showCatalogDropdown && (
                                <div className="absolute top-full left-0 pt-2 z-50">
                                    <div className="w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                                        {CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => handleCategoryClick(cat.id)}
                                                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                        <div className="border-t border-gray-300 my-1"></div>
                                        <button
                                            onClick={() => {
                                                onNavigate("catalog");
                                                setShowCatalogDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
                                        >
                                            Все товары
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => onNavigate("calculator")}
                            className="text-gray-700 hover:text-yellow-600 transition-colors font-medium"
                        >
                            Калькулятор
                        </button>
                        <button
                            onClick={() => onNavigate("about")}
                            className="text-gray-700 hover:text-yellow-600 transition-colors font-medium"
                        >
                            О компании
                        </button>
                        <button
                            onClick={() => onNavigate("contacts")}
                            className="text-gray-700 hover:text-yellow-600 transition-colors font-medium"
                        >
                            Контакты
                        </button>
                    </nav>

                    {/* Desktop right side */}
                    <div className="hidden md:flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-gray-700 hover:text-yellow-600 transition-colors font-medium">
                            <Phone className="h-4 w-4" />
                            <a href="tel:+79126719311">+7 (912) 671-93-11</a>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center space-x-4">
                        {user ? (
                            <>
                                <button
                                    onClick={() => onNavigate("admin")}
                                    className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors shadow-sm"
                                >
                                    <User className="h-5 w-5" />
                                    <span>Кабинет</span>
                                </button>
                                <button
                                    onClick={() => signOut()}
                                    className="flex items-center space-x-2 text-gray-700 hover:text-amber-700 transition-colors"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => onNavigate("login")}
                                className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors shadow-sm"
                            >
                                <User className="h-5 w-5" />
                                <span>Вход</span>
                            </button>
                        )}
                    </div>

                    {/* Mobile right: phone + burger */}
                    <div className="flex md:hidden items-center space-x-3">
                        <a
                            href="tel:+79126719311"
                            className="flex items-center justify-center w-9 h-9 bg-yellow-50 rounded-full text-yellow-600"
                        >
                            <Phone className="h-4 w-4" />
                        </a>
                        <button
                            onClick={() => setMobileMenuOpen((v) => !v)}
                            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                            aria-label="Открыть меню"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu drawer */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
                    <nav className="px-4 py-3 space-y-1">
                        {/* Catalog with expand */}
                        <div>
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => handleNav("catalog")}
                                    className="flex-1 text-left py-3 text-gray-800 font-medium text-base"
                                >
                                    Каталог
                                </button>
                                <button
                                    onClick={() => setMobileCatalogOpen((v) => !v)}
                                    className="p-2 text-gray-500"
                                >
                                    <ChevronDown className={`h-4 w-4 transition-transform ${mobileCatalogOpen ? "rotate-180" : ""}`} />
                                </button>
                            </div>
                            {mobileCatalogOpen && (
                                <div className="pl-4 pb-2 space-y-1">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategoryClick(cat.id)}
                                            className="w-full text-left py-2 text-gray-600 text-sm"
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="border-t border-gray-100" />
                        <button
                            onClick={() => handleNav("calculator")}
                            className="w-full text-left py-3 text-gray-800 font-medium text-base"
                        >
                            Калькулятор
                        </button>
                        <div className="border-t border-gray-100" />
                        <button
                            onClick={() => handleNav("about")}
                            className="w-full text-left py-3 text-gray-800 font-medium text-base"
                        >
                            О компании
                        </button>
                        <div className="border-t border-gray-100" />
                        <button
                            onClick={() => handleNav("contacts")}
                            className="w-full text-left py-3 text-gray-800 font-medium text-base"
                        >
                            Контакты
                        </button>
                        <div className="border-t border-gray-100 pt-3 pb-1">
                            {user ? (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => { onNavigate("admin"); setMobileMenuOpen(false); }}
                                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-yellow-600 text-white rounded-lg font-semibold"
                                    >
                                        <User className="h-4 w-4" />
                                        <span>Кабинет</span>
                                    </button>
                                    <button
                                        onClick={() => { signOut(); setMobileMenuOpen(false); }}
                                        className="p-2.5 text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleNav("login")}
                                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-yellow-600 text-white rounded-lg font-semibold"
                                >
                                    <User className="h-4 w-4" />
                                    <span>Вход</span>
                                </button>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
