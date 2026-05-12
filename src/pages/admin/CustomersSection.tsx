import { useState, useEffect } from "react";
import { Search, Plus, Mail, Phone, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Modal } from "../../components/Modal";
import { validatePhone, formatPhoneDisplay, validateEmail, validateName, validateAddress } from "../../lib/validators";
import { Database } from "../../types/database";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

export function CustomersSection() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        company_name: "",
        address: "",
        notes: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadCustomers();
    }, []);

    async function loadCustomers() {
        try {
            const { data, error } = await supabase
                .from("customers")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error("Error loading customers:", error);
        } finally {
            setLoading(false);
        }
    }

    function validateForm(): boolean {
        const newErrors: Record<string, string> = {};

        const nameValidation = validateName(formData.name);
        if (!nameValidation.valid) newErrors.name = nameValidation.error || "";

        if (formData.phone) {
            const phoneValidation = validatePhone(formData.phone);
            if (!phoneValidation.valid) newErrors.phone = phoneValidation.error || "";
        } else {
            newErrors.phone = "Телефон не может быть пустым";
        }

        if (formData.email) {
            const emailValidation = validateEmail(formData.email);
            if (!emailValidation.valid) newErrors.email = emailValidation.error || "";
        }

        if (formData.address && !validateAddress(formData.address).valid) {
            newErrors.address = "Некорректный адрес";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleAddCustomer(e: React.FormEvent) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        try {
            const phoneValidation = validatePhone(formData.phone);
            const dataToInsert = {
                ...formData,
                phone: phoneValidation.formatted,
            };

            const { error } = await supabase.from("customers").insert([dataToInsert]);
            if (error) throw error;
            setFormData({ name: "", phone: "", email: "", company_name: "", address: "", notes: "" });
            setErrors({});
            setTouched({});
            setShowModal(false);
            loadCustomers();
        } catch (error) {
            console.error("Error adding customer:", error);
            alert("Ошибка при добавлении клиента");
        } finally {
            setSubmitting(false);
        }
    }

    function handlePhoneChange(value: string) {
        const validation = validatePhone(value);
        setFormData({ ...formData, phone: validation.formatted });
        setTouched({ ...touched, phone: true });

        if (!validation.valid) {
            setErrors({ ...errors, phone: validation.error || "" });
        } else {
            const newErrors = { ...errors };
            delete newErrors.phone;
            setErrors(newErrors);
        }
    }

    function handleEmailChange(value: string) {
        setFormData({ ...formData, email: value });
        setTouched({ ...touched, email: true });

        if (value) {
            const validation = validateEmail(value);
            if (!validation.valid) {
                setErrors({ ...errors, email: validation.error || "" });
            } else {
                const newErrors = { ...errors };
                delete newErrors.email;
                setErrors(newErrors);
            }
        }
    }

    async function deleteCustomer(id: string) {
        if (!confirm("Вы уверены?")) return;
        try {
            const { error } = await supabase.from("customers").delete().eq("id", id);
            if (error) throw error;
            loadCustomers();
        } catch (error) {
            console.error("Error deleting customer:", error);
            alert("Ошибка при удалении клиента");
        }
    }

    const filteredCustomers = customers.filter(
        (customer) =>
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone.includes(searchTerm) ||
            customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (loading) {
        return <div className="text-center py-12">Загрузка клиентов...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">База клиентов</h1>
                    <p className="text-gray-600 mt-2">Управление информацией о клиентах</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center space-x-2 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    <span>Добавить клиента</span>
                </button>
            </div>

            <Modal
                isOpen={showModal}
                title="Добавить нового клиента"
                onClose={() => {
                    setShowModal(false);
                    setErrors({});
                    setTouched({});
                }}
            >
                <form onSubmit={handleAddCustomer} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Имя <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => {
                                setFormData({ ...formData, name: e.target.value });
                                setTouched({ ...touched, name: true });
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 ${
                                touched.name && errors.name ? "border-red-500" : "border-gray-300"
                            }`}
                        />
                        {touched.name && errors.name && (
                            <div className="flex items-center space-x-1 mt-1 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                <span>{errors.name}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Телефон <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="8 (XXX) XXX-XX-XX"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 ${
                                touched.phone && errors.phone ? "border-red-500" : "border-gray-300"
                            }`}
                        />
                        <div className="flex items-center justify-between mt-1">
                            {touched.phone && errors.phone ? (
                                <div className="flex items-center space-x-1 text-sm text-red-600">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>{errors.phone}</span>
                                </div>
                            ) : formData.phone ? (
                                <p className="text-xs text-gray-500">{formatPhoneDisplay(formData.phone)}</p>
                            ) : null}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                        <input
                            type="text"
                            value={formData.email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            placeholder="user@domain.com"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 ${
                                touched.email && errors.email ? "border-red-500" : "border-gray-300"
                            }`}
                        />
                        {touched.email && errors.email && (
                            <div className="flex items-center space-x-1 mt-1 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                <span>{errors.email}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Компания</label>
                        <input
                            type="text"
                            value={formData.company_name}
                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Адрес</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Примечание</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || Object.keys(errors).length > 0}
                        className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 transition-colors font-semibold"
                    >
                        {submitting ? "Добавление..." : "Добавить клиента"}
                    </button>
                </form>
            </Modal>

            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Поиск по имени, телефону, email или компании..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map((customer) => (
                    <div
                        key={customer.id}
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                                {customer.company_name && (
                                    <p className="text-sm text-gray-600">{customer.company_name}</p>
                                )}
                            </div>
                            <button
                                onClick={() => deleteCustomer(customer.id)}
                                className="text-red-600 hover:text-red-800"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Phone className="h-4 w-4" />
                                <span>{formatPhoneDisplay(customer.phone)}</span>
                            </div>
                            {customer.email && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Mail className="h-4 w-4" />
                                    <span>{customer.email}</span>
                                </div>
                            )}
                        </div>

                        {customer.address && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">{customer.address}</p>
                            </div>
                        )}

                        {customer.notes && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600 line-clamp-2">{customer.notes}</p>
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                                Клиент с {new Date(customer.created_at).toLocaleDateString("ru-RU")}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {filteredCustomers.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-600">Клиенты не найдены</p>
                </div>
            )}
        </div>
    );
}
