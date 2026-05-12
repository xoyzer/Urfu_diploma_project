import { User, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface HeaderProps {
    onNavigate: (page: string) => void;
}

export function Header({ onNavigate }: HeaderProps) {
    const { user, signOut } = useAuth();

    return (
        <header className="bg-white shadow-md border-b-2 border-yellow-600">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate("home")}>
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
                        <button
                            onClick={() => onNavigate("catalog")}
                            className="text-gray-700 hover:text-yellow-600 transition-colors font-medium"
                        >
                            Каталог
                        </button>
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
                                className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-800 transition-colors shadow-sm"
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
