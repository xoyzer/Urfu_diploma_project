import { Phone, MapPin, Clock, MessageCircleMore } from "lucide-react";

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
                    <div className="grid grid-cols-2 lg:grid-cols-2 gap-12 items-start">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-8">Свяжитесь с нами</h2>

                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-lg">
                                            <Phone className="h-6 w-6 text-amber-600" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1 ">Телефон</h3>
                                            <a href="tel:tel:+79126719311" className="text-gray-600">
                                                +7 (912) 671-93-11
                                            </a>
                                            <p className="text-gray-1000">Алексей</p>
                                        </div>
                                        <div>
                                            <a href="tel: +79775840445" className="text-gray-600">
                                                +7 (977) 584-04-45
                                            </a>
                                            <p className="text-gray-1000">Диана</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-lg">
                                            <MessageCircleMore className="h-6 w-6 text-amber-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Мессенджеры</h3>
                                        <div className="flex gap-4 justify-center lg:justify-start mt-6 mb-6">
                                            <a
                                                href="https://t.me/aleksey6317"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 border border-gray-400 text-[#0088cc] hover:bg-[#0088cc] hover:text-white hover:border-[#0088cc] transition-all duration-300"
                                                title="Telegram"
                                            >
                                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                                </svg>
                                            </a>

                                            <a
                                                href="https://wa.me/79126719311"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 border border-gray-400 text-[#25D366] hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all duration-300"
                                                title="WhatsApp"
                                            >
                                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.432-9.884 9.884-9.884 2.635.001 5.11 1.028 6.974 2.89a9.825 9.825 0 012.884 6.984c-.003 5.45-4.437 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.89c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                </svg>
                                            </a>

                                            <a
                                                href="https://web.max.ru/461311154"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 border border-gray-400 text-[#505ff3] hover:bg-[#505ff3] hover:text-white hover:border-[#505ff3] transition-all duration-300"
                                                title="Max"
                                            >
                                                <svg className="w-6 h-6" viewBox="0 0 30 30" fill="currentColor">
                                                    <path d="M15.3223 29.9144C12.3782 29.9144 11.01 29.4827 8.63179 27.756C7.12748 29.6985 2.36391 31.2166 2.15615 28.6194C2.15615 26.6697 1.72635 25.0222 1.23924 23.2236C0.659029 21.0077 0 18.54 0 14.9644C0 6.42461 6.97707 0 15.2435 0C23.5171 0 29.9999 6.74117 29.9999 15.0435C30.0277 23.2175 23.4608 29.8708 15.3223 29.9144ZM15.4441 7.38146C11.4183 7.17284 8.28076 9.97147 7.58594 14.3601C7.01287 17.9933 8.03007 22.4178 8.89681 22.648C9.31229 22.7488 10.3581 21.8998 11.01 21.2451C12.0879 21.993 13.3431 22.4422 14.649 22.5473C18.8203 22.7488 22.3846 19.5594 22.6647 15.3745C22.8277 11.1807 19.616 7.62867 15.4441 7.38867V7.38146Z" />
                                                </svg>
                                            </a>
                                        </div>
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
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-8">Наше местоположение</h2>
                            <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 min-h-[360px]">
                                <iframe
                                    src="https://yandex.ru/map-widget/v1/?geocode=%D0%9C%D0%BE%D1%81%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F+%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C%2C+%D0%A9%D0%B5%D0%BB%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9+%D1%80%D0%B0%D0%B9%D0%BE%D0%BD%2C+%D0%94%D0%BE%D0%BB%D0%B3%D0%BE%D0%B5+%D0%9B%D0%B5%D0%B4%D0%BE%D0%B2%D0%BE%2C+%D1%83%D0%BB%D0%B8%D1%86%D0%B0+%D0%90%D0%BA%D0%B0%D0%B4%D0%B5%D0%BC%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F+5&z=16&l=map"
                                    width="100%"
                                    height="100%"
                                    style={{ minHeight: "360px" }}
                                    frameBorder="0"
                                    allowFullScreen
                                    title="Карта расположения"
                                    className="block"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
