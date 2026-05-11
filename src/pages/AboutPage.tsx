import { Award, Users, TrendingUp, Clock } from "lucide-react";

export function AboutPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <section className="bg-gradient-to-br from-stone-600 via-neutral-900 to-stone-800 text-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-5xl font-bold mb-6">О компании</h1>
                    <p className="text-xl text-amber-100 max-w-3xl">
                        Надежный поставщик тротуарной плитки и бордюров с многолетним опытом работы
                    </p>
                </div>
            </section>

            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-6">
                                Фабрика Плитки - ваш надежный партнер
                            </h2>
                            <div className="space-y-4 text-gray-700 leading-relaxed">
                                <p>
                                    Компания Фабрика Плитки специализируется на поставках качественной тротуарной
                                    плитки, брусчатки и бордюров для частных и коммерческих проектов любого масштаба.
                                </p>
                                <p>
                                    Мы работаем только с проверенными производителями и гарантируем высокое качество
                                    всей продукции. Наш ассортимент включает более 100 наименований изделий различных
                                    форм, размеров и цветов.
                                </p>
                                <p>
                                    Собственный парк транспорта позволяет нам обеспечивать быструю и надежную доставку
                                    по всему региону. Мы осуществляем доставку как манипуляторами, так и большегрузными
                                    автомобилями в зависимости от объема заказа.
                                </p>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg h-96"></div>
                    </div>
                </div>
            </section>

            <section className="bg-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Наши преимущества</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <Award className="h-8 w-8 text-amber-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Качество</h3>
                            <p className="text-gray-600">Вся продукция сертифицирована и соответствует ГОСТу</p>
                        </div>

                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <Clock className="h-8 w-8 text-amber-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Оперативность</h3>
                            <p className="text-gray-600">Быстрая обработка заказов и доставка в срок</p>
                        </div>

                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <Users className="h-8 w-8 text-amber-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Клиентоориентированность</h3>
                            <p className="text-gray-600">Индивидуальный подход к каждому клиенту</p>
                        </div>

                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <TrendingUp className="h-8 w-8 text-amber-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Опыт</h3>
                            <p className="text-gray-600">Более 10 лет успешной работы на рынке</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-br from-amber-700 to-stone-800 rounded-lg p-12 text-center text-white">
                        <h2 className="text-3xl font-bold mb-4">Работаем с частными лицами и организациями</h2>
                        <p className="text-xl text-amber-100 mb-8 max-w-2xl mx-auto">
                            Предоставляем гибкие условия оплаты, скидки при больших объемах и консультации по выбору
                            материалов
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                            <div>
                                <div className="text-4xl font-bold mb-2">10+</div>
                                <div className="text-amber-100">лет на рынке</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold mb-2">1000+</div>
                                <div className="text-amber-100">довольных клиентов</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold mb-2">100+</div>
                                <div className="text-amber-100">видов продукции</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
