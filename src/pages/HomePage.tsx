import { Package, Truck, Calculator, ShieldCheck } from "lucide-react";

interface HomePageProps {
    onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
            <section className="relative bg-gradient-to-br from-stone-900 via-neutral-900 to-stone-800 text-white py-24 overflow-hidden">
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 20% 30%, rgba(217, 164, 64, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(217, 164, 64, 0.3) 0%, transparent 50%)",
                    }}
                ></div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left">
                            <div className="inline-block border border-yellow-500/30 text-yellow-300 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
                                Производство полного цикла
                            </div>
                            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                                <span className="text-white">Тротуарная плитка </span>
                                <span className="text-yellow-500">и бордюры</span>
                            </h1>
                            <p className="text-lg mb-8 text-stone-300 max-w-xl mx-auto lg:mx-0">
                                Широкий ассортимент качественной продукции собственного производства с доставкой по
                                Москве и области
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <button
                                    onClick={() => onNavigate("catalog")}
                                    className="bg-yellow-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-yellow-700 transition-colors shadow-lg"
                                >
                                    Смотреть каталог
                                </button>
                                <button
                                    onClick={() => onNavigate("calculator")}
                                    className="bg-white/10 backdrop-blur text-white border border-white/20 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/20 transition-colors"
                                >
                                    Калькулятор
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-center lg:justify-end">
                            <div className="relative">
                                <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full"></div>
                                <img
                                    src="/Фабрика Плитки (лого 2).png"
                                    alt="Фабрика Плитки"
                                    className="relative w-72 md:w-96 h-auto drop-shadow-2xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="text-center p-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <Package className="h-8 w-8 text-yellow-700" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Большой ассортимент</h3>
                            <p className="text-gray-600">Более 50 видов брусчатки и бордюров</p>
                        </div>

                        <div className="text-center p-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <ShieldCheck className="h-8 w-8 text-yellow-700" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Гарантия качества</h3>
                            <p className="text-gray-600">Вся продукция сертифицирована</p>
                        </div>

                        <div className="text-center p-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <Truck className="h-8 w-8 text-yellow-700" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Быстрая доставка</h3>
                            <p className="text-gray-600">Быстрая доставка товара в срок</p>
                        </div>

                        <div className="text-center p-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <Calculator className="h-8 w-8 text-yellow-700" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Калькулятор расчета</h3>
                            <p className="text-gray-600">Рассчитайте стоимость онлайн</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-stone-50 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Популярные категории</h2>
                        <p className="text-lg text-gray-600">Выберите подходящий вариант для вашего проекта</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div
                            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
                            onClick={() => onNavigate("catalog")}
                        >
                            <div className="h-48 bg-gradient-to-br from-yellow-600 to-stone-800 flex items-center justify-center">
                                <Package className="h-16 w-16 text-amber-300 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-semibold mb-2">Брусчатка</h3>
                                <p className="text-gray-600">Различные формы и цвета для любых задач</p>
                            </div>
                        </div>

                        <div
                            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
                            onClick={() => onNavigate("catalog")}
                        >
                            <div className="h-48 bg-gradient-to-br from-stone-700 to-stone-900 flex items-center justify-center">
                                <Package className="h-16 w-16 text-yellow-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-semibold mb-2">Бордюры</h3>
                                <p className="text-gray-600">Надежное ограждение для дорожек</p>
                            </div>
                        </div>

                        <div
                            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
                            onClick={() => onNavigate("catalog")}
                        >
                            <div className="h-48 bg-gradient-to-br from-yellow-700 to-neutral-900 flex items-center justify-center">
                                <Package className="h-16 w-16 text-amber-200 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-semibold mb-2">Смеси</h3>
                                <p className="text-gray-600">Цемент и строительные смеси</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold mb-4">Готовы сделать заказ?</h2>
                    <p className="text-xl mb-8 text-amber-100">Рассчитайте стоимость и оформите заявку прямо сейчас</p>
                    <button
                        onClick={() => onNavigate("calculator")}
                        className="bg-white text-amber-800 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-amber-50 transition-colors shadow-lg"
                    >
                        Перейти к калькулятору
                    </button>
                </div>
            </section>
        </div>
    );
}
