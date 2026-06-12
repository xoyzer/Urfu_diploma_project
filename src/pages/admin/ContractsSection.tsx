import { useState, useRef, useEffect } from "react";
import { FileText, Plus, Trash2, Download, Upload, CircleCheck } from "lucide-react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { useAuth } from "../../contexts/AuthContext";

type Unit = "М2" | "Шт" | "Рейс";

interface SpecItem {
    name: string;
    unit: Unit;
    quantity: number;
    price: number;
}

interface ContractFormData {
    fullName: string;
    phone: string;
    deliverySchedule: string;
    totalAmount: number | "";
    advance: number | "";
    address: string;
    contractDate: string;
}

const TEMPLATE_STORAGE_KEY = "contract_template_b64";
const FORM_STORAGE_KEY = "contract_form_draft";
const ITEMS_STORAGE_KEY = "contract_items_draft";
const ALLOWED_EMAIL = "yobaboba80@gmail.com";

const MAX_ITEMS = 8;
const EMPTY_ITEM: SpecItem = { name: "", unit: "М2", quantity: 0, price: 0 };

const DEFAULT_FORM: ContractFormData = {
    fullName: "",
    phone: "",
    deliverySchedule: "",
    totalAmount: "",
    advance: "",
    address: "",
    contractDate: "",
};

function formatDate(date: Date): string {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}.${m}.${y}г`;
}

function formatInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return "";
    const lastName = parts[0];
    const initials = parts
        .slice(1)
        .map((p) => (p[0] ? p[0].toUpperCase() + "." : ""))
        .filter(Boolean)
        .join(" ");
    return initials ? `${lastName} ${initials}` : lastName;
}

function getLastName(fullName: string): string {
    return fullName.trim().split(/\s+/)[0] || "Договор";
}

function replaceQuotes(text: string): string {
    let open = true;
    return text.replace(/"/g, () => {
        const q = open ? "«" : "»";
        open = !open;
        return q;
    });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function loadForm(): ContractFormData {
    const today = formatDate(new Date());
    try {
        const raw = localStorage.getItem(FORM_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_FORM, contractDate: today, ...parsed };
        }
    } catch {
        // ignore
    }
    return { ...DEFAULT_FORM, contractDate: today };
}

function loadItems(): SpecItem[] {
    try {
        const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {
        // ignore
    }
    return [{ ...EMPTY_ITEM }];
}

export function ContractsSection() {
    const { user } = useAuth();

    const [form, setForm] = useState<ContractFormData>(loadForm);
    const [items, setItems] = useState<SpecItem[]>(loadItems);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [templateLoaded, setTemplateLoaded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
        if (stored) setTemplateLoaded(true);
    }, []);

    useEffect(() => {
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
    }, [form]);

    useEffect(() => {
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
    }, [items]);

    if (user?.email !== ALLOWED_EMAIL) {
        return null;
    }

    function handleTemplateUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const buffer = ev.target?.result as ArrayBuffer;
            if (!buffer || buffer.byteLength === 0) {
                setError("Файл пустой или повреждён");
                return;
            }
            const b64 = arrayBufferToBase64(buffer);
            localStorage.setItem(TEMPLATE_STORAGE_KEY, b64);
            setTemplateLoaded(true);
            setError(null);
        };
        reader.readAsArrayBuffer(file);
    }

    function updateItemName(index: number, raw: string) {
        setItems((prev) => prev.map((item, i) => (i === index ? { ...item, name: replaceQuotes(raw) } : item)));
    }

    function updateItem(index: number, field: Exclude<keyof SpecItem, "name">, value: string | number) {
        setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    }

    function addItem() {
        if (items.length >= MAX_ITEMS) return;
        setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
    }

    function removeItem(index: number) {
        setItems((prev) => prev.filter((_, i) => i !== index));
    }

    async function handleGenerate() {
        setError(null);
        if (!form.fullName.trim()) {
            setError("Укажите ФИО");
            return;
        }
        if (!form.contractDate.trim()) {
            setError("Укажите дату заключения");
            return;
        }
        if (!form.phone.trim()) {
            setError("Укажите номер телефона");
            return;
        }
        if (!form.deliverySchedule.trim()) {
            setError("Укажите график поставки");
            return;
        }
        if (form.totalAmount === "") {
            setError("Укажите итоговую стоимость");
            return;
        }
        if (form.advance === "") {
            setError("Укажите аванс");
            return;
        }
        if (!form.address.trim()) {
            setError("Укажите адрес доставки");
            return;
        }
        if (items.some((item) => !item.name.trim())) {
            setError("Укажите наименование для всех позиций");
            return;
        }

        const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
        if (!stored) {
            setError("Сначала загрузите шаблон договора");
            return;
        }

        setGenerating(true);
        try {
            const buffer = base64ToArrayBuffer(stored);
            const zip = new PizZip(buffer);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            const specRows = items.map((item) => ({
                наименование: item.name,
                единица: item.unit,
                количество: String(item.quantity),
                цена: String(item.price),
                итого: String(item.quantity * item.price),
            }));

            doc.render({
                ФИО: form.fullName.trim(),
                "Фамилия и инициалы": formatInitials(form.fullName),
                "Дата заключения": form.contractDate.trim(),
                адрес: form.address.trim(),
                "итоговая стоимость": String(form.totalAmount || 0),
                "номер телефона": form.phone.trim(),
                аванс: String(form.advance || 0),
                "график поставки": form.deliverySchedule.trim(),
                "позиции заказа": specRows,
            });

            const blob = doc.getZip().generate({
                type: "blob",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ДОГОВОР ${getLastName(form.fullName)}.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Contract generation error:", err);
            const message = err instanceof Error ? err.message : String(err);
            setError(`Ошибка при генерации документа: ${message}`);
        } finally {
            setGenerating(false);
        }
    }
    return (
        <div className="space-y-8">
            <div className="flex items-center space-x-3">
                <FileText className="h-7 w-7 text-amber-600" />
                <h1 className="text-2xl font-bold text-gray-900">Составление договора</h1>
            </div>

            {/* Template upload */}
            <div
                className={`rounded-lg border p-4 flex items-center justify-between ${templateLoaded ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
            >
                <div className="flex items-center space-x-3">
                    {templateLoaded ? (
                        <CircleCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                        <Upload className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    )}
                    <div>
                        <p className={`text-sm font-medium ${templateLoaded ? "text-green-800" : "text-amber-800"}`}>
                            {templateLoaded ? "Шаблон загружен" : "Шаблон не загружен"}
                        </p>
                        <p className={`text-xs ${templateLoaded ? "text-green-600" : "text-amber-600"}`}>
                            {templateLoaded
                                ? "Шаблон сохранён в браузере. Можно заменить, загрузив новый файл."
                                : "Загрузите файл ДОГОВОР Шаблон.docx со своего компьютера"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 text-sm font-medium px-4 py-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-700 transition-colors flex-shrink-0"
                >
                    <Upload className="h-4 w-4" />
                    <span>{templateLoaded ? "Заменить шаблон" : "Загрузить шаблон"}</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={handleTemplateUpload}
                />
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
                <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-3">Данные договора</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ФИО <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder=""
                        />
                        {form.fullName.trim() && (
                            <p className="mt-1 text-xs text-gray-500">
                                В документе: <span className="font-medium">{formatInitials(form.fullName)}</span>
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Дата заключения <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.contractDate}
                            onChange={(e) => setForm({ ...form, contractDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder=""
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Телефон <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder=""
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            График поставки <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.deliverySchedule}
                            onChange={(e) => setForm({ ...form, deliverySchedule: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder=""
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Итоговая стоимость, ₽ <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={form.totalAmount}
                            onChange={(e) =>
                                setForm({ ...form, totalAmount: e.target.value === "" ? "" : Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder=""
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Аванс, ₽ <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={form.advance}
                            onChange={(e) =>
                                setForm({ ...form, advance: e.target.value === "" ? "" : Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder=""
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Адрес доставки <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                        placeholder=""
                    />
                </div>
            </div>

            {/* Spec table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center space-x-3">
                        <h2 className="text-lg font-semibold text-gray-800">Спецификация</h2>
                        <span className="text-sm text-gray-500">
                            {items.length} / {MAX_ITEMS} позиций
                        </span>
                    </div>
                    <button
                        onClick={addItem}
                        disabled={items.length >= MAX_ITEMS}
                        className="flex items-center space-x-1 text-sm text-amber-600 hover:text-amber-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Добавить позицию</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                <th className="pb-2 pr-3 font-medium w-[5%] text-center">№</th>
                                <th className="pb-2 pr-3 font-medium w-[33%]">Наименование</th>
                                <th className="pb-2 pr-3 font-medium w-[10%]">Ед. изм.</th>
                                <th className="pb-2 pr-3 font-medium w-[12%]">Кол-во</th>
                                <th className="pb-2 pr-3 font-medium w-[14%]">Цена, руб.</th>
                                <th className="pb-2 pr-3 font-medium w-[14%]">Итого, руб.</th>
                                <th className="pb-2 font-medium w-[4%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td className="py-2 pr-3 text-center text-gray-500 font-medium">{index + 1}</td>
                                    <td className="py-2 pr-3">
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => updateItemName(index, e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-amber-500 focus:border-transparent"
                                            placeholder=""
                                        />
                                    </td>
                                    <td className="py-2 pr-3">
                                        <select
                                            value={item.unit}
                                            onChange={(e) => updateItem(index, "unit", e.target.value as Unit)}
                                            className="w-full px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-amber-500 focus:border-transparent bg-white"
                                        >
                                            <option value="М2">М2</option>
                                            <option value="Шт">Шт</option>
                                            <option value="Рейс">Рейс</option>
                                        </select>
                                    </td>
                                    <td className="py-2 pr-3">
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.quantity || ""}
                                            onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                                            className="w-full px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-amber-500 focus:border-transparent"
                                        />
                                    </td>
                                    <td className="py-2 pr-3">
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.price || ""}
                                            onChange={(e) => updateItem(index, "price", Number(e.target.value))}
                                            className="w-full px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-amber-500 focus:border-transparent"
                                            placeholder=""
                                        />
                                    </td>
                                    <td className="py-2 pr-3">
                                        <span className="text-gray-700 font-medium">
                                            {(item.quantity * item.price).toLocaleString("ru-RU")}
                                        </span>
                                    </td>
                                    <td className="py-2">
                                        <button
                                            onClick={() => removeItem(index)}
                                            disabled={items.length === 1}
                                            className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-gray-200">
                                <td colSpan={5} className="pt-3 pr-3 text-right text-sm font-medium text-gray-600">
                                    Итого по спецификации:
                                </td>
                                <td className="pt-3 pr-3 text-sm font-bold text-amber-600">
                                    {items
                                        .reduce((sum, item) => sum + item.quantity * item.price, 0)
                                        .toLocaleString("ru-RU")}{" "}
                                    ₽
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button
                onClick={handleGenerate}
                disabled={generating || !templateLoaded}
                className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
                <Download className="h-5 w-5" />
                <span>{generating ? "Генерация..." : "Сформировать договор"}</span>
            </button>
        </div>
    );
}
