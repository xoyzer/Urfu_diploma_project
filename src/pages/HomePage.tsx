import { Package, Truck, Calculator, ShieldCheck, HardHat } from "lucide-react";
import { ReviewsWidget } from "../components/ReviewsWidget";

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
                                Изготовление современной высококачественной вибропрессованной тротуарной плитки
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
                            <div className="flex gap-4 justify-center lg:justify-start mt-12">
                                <a
                                    href="https://t.me/aleksey6317"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/20 text-white hover:bg-[#0088cc] hover:border-[#0088cc] transition-all duration-300"
                                    title="Telegram"
                                >
                                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://wa.me/79126719311"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/20 text-white hover:bg-[#25D366] hover:border-[#25D366] transition-all duration-300"
                                    title="WhatsApp"
                                >
                                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.432-9.884 9.884-9.884 2.635.001 5.11 1.028 6.974 2.89a9.825 9.825 0 012.884 6.984c-.003 5.45-4.437 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.89c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://web.max.ru/461311154"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/20 text-white hover:bg-[#505ff3] hover:border-[#505ff3] transition-all duration-300"
                                    title="Max"
                                >
                                    <svg className="w-8 h-8" viewBox="0 0 30 30" fill="currentColor">
                                        <path d="M15.3223 29.9144C12.3782 29.9144 11.01 29.4827 8.63179 27.756C7.12748 29.6985 2.36391 31.2166 2.15615 28.6194C2.15615 26.6697 1.72635 25.0222 1.23924 23.2236C0.659029 21.0077 0 18.54 0 14.9644C0 6.42461 6.97707 0 15.2435 0C23.5171 0 29.9999 6.74117 29.9999 15.0435C30.0277 23.2175 23.4608 29.8708 15.3223 29.9144ZM15.4441 7.38146C11.4183 7.17284 8.28076 9.97147 7.58594 14.3601C7.01287 17.9933 8.03007 22.4178 8.89681 22.648C9.31229 22.7488 10.3581 21.8998 11.01 21.2451C12.0879 21.993 13.3431 22.4422 14.649 22.5473C18.8203 22.7488 22.3846 19.5594 22.6647 15.3745C22.8277 11.1807 19.616 7.62867 15.4441 7.38867V7.38146Z" />
                                    </svg>
                                </a>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                        <div className="text-center p-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <Package className="h-8 w-8 text-yellow-700" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Большой ассортимент</h3>
                            <p className="text-gray-600">Более 50 видов брусчатки/бордюров</p>
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
                                <HardHat className="h-8 w-8 text-yellow-700" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Качественная укладка</h3>
                            <p className="text-gray-600">Опытная бригада монтажников</p>
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

            <section className="bg-stone-50 py-10">
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

            <ReviewsWidget />
            <section className="bg-amber-50/50 text-white py-16 hover:bg-yellow-500/10 transition-colors duration-700 shadow-lg ">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center ">
                    <h2 className="text-3xl text-yellow-700 font-bold mb-4 ">Готовы сделать заказ?</h2>
                    <p className="text-xl mb-8 text-yellow-800">Рассчитайте стоимость и оформите заявку прямо сейчас</p>
                    <button
                        onClick={() => onNavigate("calculator")}
                        className="bg-white text-amber-800 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-yellow-50 transition-colors shadow-lg "
                    >
                        Перейти к калькулятору
                    </button>
                </div>
            </section>
        </div>
    );
}
