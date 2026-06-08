import { useState } from "react";
import { User, LogOut, Phone } from "lucide-react";
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

    function handleCategoryClick(categoryId: string) {
        onNavigate("catalog", false, { category: categoryId });
        setShowCatalogDropdown(false);
    }

    return (
        <header className="bg-white shadow-md border-b-2 border-yellow-600">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3">
                    <div
                        className="flex items-center space-x-3 cursor-pointer transition-transform duration-300 hover:scale-105"
                        onClick={() => onNavigate("home")}
                    >
                        <img
                            src="/Фабрика Плитки (лого 2).png"
                            alt="Фабрика Плитки"
                            className="h-14 w-14 object-contain"
                        />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">Фабрика Плитки</h1>
                            <p className="text-xs text-yellow-600 font-medium">Тротуарная плитка и бордюры</p>
                        </div>
                    </div>

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
                                        <div className="border-t border-gray-100 my-1"></div>
                                        <button
                                            onClick={() => {
                                                onNavigate("catalog");
                                                setShowCatalogDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-gray-500 hover:bg-yellow-50 hover:text-yellow-600 transition-colors text-sm"
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

                    <div className="flex items-center space-x-2 text-gray-700 hover:text-yellow-600 transition-colors font-medium ">
                        <Phone className="h-4 w-4" />
                        <a href="tel:+79126719311">+7 (912) 671-93-11</a>
                    </div>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <button
                                    onClick={() => onNavigate("admin")}
                                    className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors shadow-sm"
                                >
                                    <User className="h-5 w-5" />
                                    <span>CRM</span>
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
                </div>
            </div>
        </header>
    );
}
