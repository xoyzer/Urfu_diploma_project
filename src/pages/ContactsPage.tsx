import { Phone, Mail, MapPin, Clock } from "lucide-react";

export function ContactsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <section className="relative bg-gradient-to-br from-stone-900 via-neutral-900 to-stone-800 text-white py-24 overflow-hidden">
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 20% 30%, rgba(217, 164, 64, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(217, 164, 64, 0.3) 0%, transparent 50%)",
                    }}
                ></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-5xl font-bold mb-6">Контакты</h1>
                    <p className="text-xl text-amber-100">Свяжитесь с нами любым удобным способом</p>
                </div>
            </section>

            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-8">Свяжитесь с нами</h2>

                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-lg">
                                            <Phone className="h-6 w-6 text-amber-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Телефон</h3>
                                        <p className="text-gray-600">+7 912 671 9311 Алексей</p>
                                        <p className="text-gray-600"></p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-lg">
                                            <Mail className="h-6 w-6 text-amber-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Email</h3>
                                        <p className="text-gray-600"></p>
                                        <p className="text-gray-600"></p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-lg">
                                            <MapPin className="h-6 w-6 text-amber-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Адрес</h3>
                                        <p className="text-gray-600">
                                            Московская область, Щелковский район, д. Долгое Ледово, ул. Академическая 5.
                                        </p>
                                        {/* <p className="text-gray-600">Производственная база и склад</p> */}
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-lg">
                                            <Clock className="h-6 w-6 text-amber-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Режим работы</h3>
                                        <p className="text-gray-600">Пн-Вс: 08:00 - 22:00</p>
                                        {/* <p className="text-gray-600">Сб: 09:00 - 15:00</p>
                                        <p className="text-gray-600">Вс: выходной</p> */}
                                    </div>
                                </div>
                            </div>

                            {/* <div className="mt-12 p-6 bg-amber-50 border border-amber-200 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Как добраться</h3>
                                <p className="text-gray-700 mb-4">
                                    От метро Шоссе Энтузиастов: автобус №254 до остановки "Складская улица", далее 5
                                    минут пешком.
                                </p>
                                <p className="text-gray-700">
                                    На автомобиле: въезд с улицы Складская, есть удобная парковка для легковых
                                    автомобилей и грузового транспорта.
                                </p>
                            </div> */}
                        </div>

                        {/* <div className="bg-white rounded-lg shadow-lg p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Отправить сообщение</h2>
                            <form className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Имя <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        placeholder="Ваше имя"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Телефон <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        placeholder="+7 (999) 123-45-67"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        placeholder="example@mail.ru"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Сообщение <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        rows={5}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        placeholder="Напишите ваше сообщение..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition-colors font-semibold"
                                >
                                    Отправить сообщение
                                </button>
                            </form>
                        </div> */}
                    </div>
                </div>
            </section>

            <section className="py-16 bg-gray-100">
                {/* <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg h-96 flex items-center justify-center">
                        <p className="text-gray-600 text-lg">Карта со схемой проезда</p>
                    </div>
                </div> */}
            </section>
        </div>
    );
}
