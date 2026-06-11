import { useState } from "react";
import { FileText, Plus, Trash2, Download } from "lucide-react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

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
}

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
        .map((p) => p[0]?.toUpperCase() + ".")
        .join(" ");
    return initials ? `${lastName} ${initials}` : lastName;
}

function getLastName(fullName: string): string {
    return fullName.trim().split(/\s+/)[0] || "Договор";
}

const EMPTY_ITEM: SpecItem = { name: "", unit: "М2", quantity: 0, price: 0 };

export function ContractsSection() {
    const [form, setForm] = useState<ContractFormData>({
        fullName: "",
        phone: "",
        deliverySchedule: "",
        totalAmount: "",
        advance: "",
        address: "",
    });
    const [items, setItems] = useState<SpecItem[]>([{ ...EMPTY_ITEM }]);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const today = formatDate(new Date());

    function updateItem(index: number, field: keyof SpecItem, value: string | number) {
        setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    }

    function addItem() {
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
        if (items.some((item) => !item.name.trim())) {
            setError("Укажите наименование для всех позиций");
            return;
        }

        setGenerating(true);
        try {
            const response = await fetch("/ДОГОВОР Шаблон.docx");
            if (!response.ok) throw new Error(`Шаблон не найден (${response.status})`);
            const templateBuffer = await response.arrayBuffer();
            if (templateBuffer.byteLength === 0) throw new Error("Файл шаблона пустой");

            const zip = new PizZip(templateBuffer);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            const specRows = items.map((item) => ({
                наименование: item.name,
                единица: item.unit,
                количество: item.quantity,
                цена: Number(item.price).toLocaleString("ru-RU"),
                итого: (item.quantity * item.price).toLocaleString("ru-RU"),
            }));

            doc.render({
                ФИО: form.fullName.trim(),
                "Фамилия и инициалы": formatInitials(form.fullName),
                Дата: today,
                Телефон: form.phone.trim(),
                "График поставки": form.deliverySchedule.trim(),
                "Итоговая стоимость": Number(form.totalAmount || 0).toLocaleString("ru-RU"),
                Аванс: Number(form.advance || 0).toLocaleString("ru-RU"),
                Адрес: form.address.trim(),
                rows: specRows,
            });

            const blob = doc
                .getZip()
                .generate({
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
                            placeholder="Румелиоти Михаил Вячеславович"
                        />
                        {form.fullName.trim() && (
                            <p className="mt-1 text-xs text-gray-500">
                                В документе: <span className="font-medium">{formatInitials(form.fullName)}</span>
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Дата заключения</label>
                        <input
                            type="text"
                            readOnly
                            value={today}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm cursor-default"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                        <input
                            type="text"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder="89031771025"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">График поставки</label>
                        <input
                            type="text"
                            value={form.deliverySchedule}
                            onChange={(e) => setForm({ ...form, deliverySchedule: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder="11.06.2026. – 13.06.2026"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Итоговая стоимость, ₽</label>
                        <input
                            type="number"
                            value={form.totalAmount}
                            onChange={(e) =>
                                setForm({ ...form, totalAmount: e.target.value === "" ? "" : Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder="193470"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Аванс, ₽</label>
                        <input
                            type="number"
                            value={form.advance}
                            onChange={(e) =>
                                setForm({ ...form, advance: e.target.value === "" ? "" : Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            placeholder="60000"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Адрес доставки</label>
                    <input
                        type="text"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                        placeholder="г. Москва, ул. Примерная, д. 123"
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h2 className="text-lg font-semibold text-gray-800">Спецификация</h2>
                    <button
                        onClick={addItem}
                        className="flex items-center space-x-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Добавить позицию</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                <th className="pb-2 pr-3 font-medium w-[35%]">Наименование</th>
                                <th className="pb-2 pr-3 font-medium w-[10%]">Ед.</th>
                                <th className="pb-2 pr-3 font-medium w-[12%]">Кол-во</th>
                                <th className="pb-2 pr-3 font-medium w-[15%]">Цена, ₽</th>
                                <th className="pb-2 pr-3 font-medium w-[15%]">Итого, ₽</th>
                                <th className="pb-2 font-medium w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td className="py-2 pr-3">
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => updateItem(index, "name", e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-amber-500 focus:border-transparent"
                                            placeholder="Плитка тротуарная"
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
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="py-2 pr-3">
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.price || ""}
                                            onChange={(e) => updateItem(index, "price", Number(e.target.value))}
                                            className="w-full px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-amber-500 focus:border-transparent"
                                            placeholder="0"
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
                                <td colSpan={4} className="pt-3 pr-3 text-right text-sm font-medium text-gray-600">
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
                disabled={generating}
                className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
                <Download className="h-5 w-5" />
                <span>{generating ? "Генерация..." : "Сформировать договор"}</span>
            </button>
        </div>
    );
}
