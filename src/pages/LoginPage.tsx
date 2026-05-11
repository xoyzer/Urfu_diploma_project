import { useState } from "react";
import { LogIn, Package } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface LoginPageProps {
    onNavigate: (page: string) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
    const { signIn } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await signIn(email, password);
            onNavigate("admin");
        } catch (err) {
            setError("Неверный email или пароль");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-700 to-stone-800 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-lg shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                            <Package className="h-8 w-8 text-amber-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Фабрика Плитки</h1>
                        <p className="text-gray-600">CRM-система</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                placeholder="manager@fabrikaplitki.ru"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Пароль</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center space-x-2 bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                        >
                            <LogIn className="h-5 w-5" />
                            <span>{loading ? "Вход..." : "Войти в систему"}</span>
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => onNavigate("home")}
                            className="text-amber-600 hover:text-amber-700 text-sm font-semibold"
                        >
                            Вернуться на главную
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
