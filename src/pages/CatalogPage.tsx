import { useState, useEffect, useMemo } from "react";
import { Search, ListFilter as Filter, ChevronDown, ChevronRight, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getCached, setCached } from "../lib/queryCache";
import { Database } from "../types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface CatalogPageProps {
    onNavigate: (page: string) => void;
    initialCategory?: string;
}

interface CategoryWithSubcategories {
    name: string;
    subcategories: string[];
    productCount: number;
}

const SHAPES = ["Старый город", "Новый город", "Кирпичик", "Квадрат", "Конусообразная"] as const;
const PURPOSES = ["Пешеходные зоны", "Автомобильная зона"] as const;
const SORT_OPTIONS = [
    { value: "default", label: "По умолчанию" },
    { value: "popular", label: "По популярности" },
    { value: "price_asc", label: "Цена: сначала дешевле" },
    { value: "price_desc", label: "Цена: сначала дороже" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

const CATALOG_CACHE_KEY = "catalog_products";

function buildCategories(data: Product[]): CategoryWithSubcategories[] {
    const categoryMap = new Map<string, Set<string>>();
    const categoryCount = new Map<string, number>();
    data.forEach((p) => {
        const cats = categoryMap.get(p.category) || new Set<string>();
        if (p.subcategory) cats.add(p.subcategory);
        categoryMap.set(p.category, cats);
        categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1);
    });
    const list: CategoryWithSubcategories[] = [];
    categoryMap.forEach((subs, cat) => {
        list.push({ name: cat, subcategories: Array.from(subs).sort(), productCount: categoryCount.get(cat) || 0 });
    });
    return list;
}

function CountBadge({ count }: { count: number }) {
    if (count === 0) return null;
    return (
        <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-700 rounded-full px-1.5 py-0.5 font-medium">
            {count}
        </span>
    );
}

export function CatalogPage({ onNavigate, initialCategory }: CatalogPageProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "all");
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);

    const [availabilityFilter, setAvailabilityFilter] = useState<Set<string>>(new Set(["in_stock", "to_order"]));
    const [selectedShapes, setSelectedShapes] = useState<Set<string>>(new Set());
    const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
    const [selectedPurposes, setSelectedPurposes] = useState<Set<string>>(new Set());
    const [priceMin, setPriceMin] = useState("");
    const [priceMax, setPriceMax] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("default");

    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["categories", "availability", "shape", "color", "purpose", "price"]),
    );

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (initialCategory) {
            setSelectedCategory(initialCategory);
            setExpandedCategories((prev) => new Set(prev).add(initialCategory));
        }
    }, [initialCategory]);

    async function loadProducts() {
        const cached = getCached<Product[]>(CATALOG_CACHE_KEY);
        if (cached) {
            setProducts(cached);
            setCategories(buildCategories(cached));
            setLoading(false);
            supabase
                .from("products")
                .select("*")
                .eq("is_active", true)
                .order("category")
                .order("subcategory")
                .order("name")
                .then(({ data }) => {
                    if (data) {
                        setCached(CATALOG_CACHE_KEY, data);
                        setProducts(data);
                        setCategories(buildCategories(data));
                    }
                });
            return;
        }
        try {
            const { data, error } = await supabase
                .from("products")
                .select("*")
                .eq("is_active", true)
                .order("category")
                .order("subcategory")
                .order("name");
            if (error) throw error;
            const prods = data || [];
            setCached(CATALOG_CACHE_KEY, prods);
            setProducts(prods);
            setCategories(buildCategories(prods));
        } catch (err) {
            console.error("Error loading products:", err);
        } finally {
            setLoading(false);
        }
    }

    const availableColors = useMemo(() => {
        const colors = new Set<string>();
        products.forEach((p) => {
            if (p.color) colors.add(p.color);
        });
        return Array.from(colors).sort();
    }, [products]);

    const priceRange = useMemo(() => {
        if (!products.length) return { min: 0, max: 10000 };
        return {
            min: Math.min(...products.map((p) => p.price_per_sqm)),
            max: Math.max(...products.map((p) => p.price_per_sqm)),
        };
    }, [products]);

    const filteredAndSortedProducts = useMemo(() => {
        let result = products.filter((p) => {
            if (
                searchTerm &&
                !p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !p.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
                return false;
            if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
            if (selectedSubcategory !== "all" && p.subcategory !== selectedSubcategory) return false;
            if (availabilityFilter.size === 1) {
                const isInStock = p.stock_quantity > 0;
                if (availabilityFilter.has("in_stock") && !isInStock) return false;
                if (availabilityFilter.has("to_order") && isInStock) return false;
            }
            if (selectedShapes.size > 0 && (!p.shape || !selectedShapes.has(p.shape))) return false;
            if (selectedColors.size > 0 && (!p.color || !selectedColors.has(p.color))) return false;
            if (selectedPurposes.size > 0 && (!p.purpose || !selectedPurposes.has(p.purpose))) return false;
            const minVal = priceMin !== "" ? parseFloat(priceMin) : null;
            const maxVal = priceMax !== "" ? parseFloat(priceMax) : null;
            if (minVal !== null && p.price_per_sqm < minVal) return false;
            if (maxVal !== null && p.price_per_sqm > maxVal) return false;
            return true;
        });

        if (sortBy === "price_asc") result = [...result].sort((a, b) => a.price_per_sqm - b.price_per_sqm);
        if (sortBy === "price_desc") result = [...result].sort((a, b) => b.price_per_sqm - a.price_per_sqm);
        if (sortBy === "popular") result = [...result].sort((a, b) => b.stock_quantity - a.stock_quantity);

        return result;
    }, [
        products,
        searchTerm,
        selectedCategory,
        selectedSubcategory,
        availabilityFilter,
        selectedShapes,
        selectedColors,
        selectedPurposes,
        priceMin,
        priceMax,
        sortBy,
    ]);

    const hasActiveFilters =
        selectedShapes.size > 0 ||
        selectedColors.size > 0 ||
        selectedPurposes.size > 0 ||
        availabilityFilter.size !== 2 ||
        priceMin !== "" ||
        priceMax !== "";

    function resetFilters() {
        setAvailabilityFilter(new Set(["in_stock", "to_order"]));
        setSelectedShapes(new Set());
        setSelectedColors(new Set());
        setSelectedPurposes(new Set());
        setPriceMin("");
        setPriceMax("");
    }

    function toggleSet<T>(set: Set<T>, value: T): Set<T> {
        const next = new Set(set);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
    }

    function toggleSection(key: string) {
        setExpandedSections((prev) => toggleSet(prev, key));
    }

    function toggleCategory(name: string) {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
                setSelectedSubcategory("all");
            } else {
                next.add(name);
            }
            return next;
        });
    }

    function selectCategory(name: string) {
        setSelectedCategory(name);
        setSelectedSubcategory("all");
        if (!expandedCategories.has(name)) {
            setExpandedCategories((prev) => new Set(prev).add(name));
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Загрузка каталога...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Каталог продукции</h1>
                    <p className="text-lg text-gray-600">Выберите подходящий материал для вашего проекта</p>
                </div>

                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="Поиск по названию или описанию..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex gap-8 items-start">
                    {/* Sidebar */}
                    <div className="w-72 flex-shrink-0">
                        <div className="bg-white rounded-lg shadow-md sticky top-4 overflow-y-auto max-h-[calc(100vh-2rem)] divide-y divide-gray-100">
                            {/* Categories */}
                            <div className="p-4">
                                <button
                                    onClick={() => toggleSection("categories")}
                                    className="w-full flex items-center justify-between mb-0"
                                >
                                    <div className="flex items-center gap-2">
                                        <Filter className="text-gray-400 h-4 w-4" />
                                        <span className="font-semibold text-gray-900 text-sm">Категории</span>
                                    </div>
                                    {expandedSections.has("categories") ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                                {expandedSections.has("categories") && (
                                    <div className="mt-3 space-y-1">
                                        <button
                                            onClick={() => {
                                                setSelectedCategory("all");
                                                setSelectedSubcategory("all");
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between text-sm ${
                                                selectedCategory === "all"
                                                    ? "bg-yellow-100 text-yellow-800 font-semibold"
                                                    : "hover:bg-gray-100 text-gray-700"
                                            }`}
                                        >
                                            <span>Все товары</span>
                                            <span className="text-xs text-gray-500">{products.length}</span>
                                        </button>
                                        {categories.map((cat) => (
                                            <div key={cat.name}>
                                                <div className="flex items-center">
                                                    <button
                                                        onClick={() => toggleCategory(cat.name)}
                                                        className="p-1 hover:bg-gray-100 rounded"
                                                    >
                                                        {expandedCategories.has(cat.name) ? (
                                                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                                                        ) : (
                                                            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => selectCategory(cat.name)}
                                                        className={`flex-1 text-left px-2 py-1.5 rounded-lg transition-colors flex items-center justify-between text-sm ${
                                                            selectedCategory === cat.name
                                                                ? "bg-yellow-100 text-yellow-800 font-semibold"
                                                                : "hover:bg-gray-100 text-gray-700"
                                                        }`}
                                                    >
                                                        <span>{cat.name}</span>
                                                        <span className="text-xs text-gray-500">
                                                            {cat.productCount}
                                                        </span>
                                                    </button>
                                                </div>
                                                {expandedCategories.has(cat.name) &&
                                                    cat.subcategories.map((sub) => (
                                                        <button
                                                            key={sub}
                                                            onClick={() => {
                                                                setSelectedCategory(cat.name);
                                                                setSelectedSubcategory(sub);
                                                            }}
                                                            className={`w-full text-left pl-9 pr-3 py-1.5 rounded text-xs transition-colors ml-1 ${
                                                                selectedCategory === cat.name &&
                                                                selectedSubcategory === sub
                                                                    ? "bg-yellow-50 text-yellow-700 font-medium"
                                                                    : "text-gray-600 hover:bg-gray-50"
                                                            }`}
                                                        >
                                                            {sub}
                                                        </button>
                                                    ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Availability */}
                            <div className="p-4">
                                <button
                                    onClick={() => toggleSection("availability")}
                                    className="w-full flex items-center justify-between"
                                >
                                    <span className="font-semibold text-gray-900 text-sm">Наличие</span>
                                    {expandedSections.has("availability") ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                                {expandedSections.has("availability") && (
                                    <div className="mt-3 space-y-2.5">
                                        {[
                                            { key: "in_stock", label: "В наличии" },
                                            { key: "to_order", label: "На заказ" },
                                        ].map(({ key, label }) => (
                                            <label
                                                key={key}
                                                className="flex items-center gap-2.5 cursor-pointer group "
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={availabilityFilter.has(key)}
                                                    onChange={() =>
                                                        setAvailabilityFilter((prev) => toggleSet(prev, key))
                                                    }
                                                    className="w-4 h-4 rounded border-gray-300 accent-yellow-100 focus:ring-yellow-500"
                                                />
                                                <span className="text-sm text-gray-700 group-hover:text-gray-900 ">
                                                    {label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Shape */}
                            <div className="p-4">
                                <button
                                    onClick={() => toggleSection("shape")}
                                    className="w-full flex items-center justify-between"
                                >
                                    <span className="font-semibold text-gray-900 text-sm">
                                        Форма
                                        <CountBadge count={selectedShapes.size} />
                                    </span>
                                    {expandedSections.has("shape") ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                                {expandedSections.has("shape") && (
                                    <div className="mt-3 space-y-2.5">
                                        {SHAPES.map((shape) => (
                                            <label
                                                key={shape}
                                                className="flex items-center gap-2.5 cursor-pointer group"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedShapes.has(shape)}
                                                    onChange={() => setSelectedShapes((prev) => toggleSet(prev, shape))}
                                                    className="w-4 h-4 rounded border-gray-300 accent-yellow-100 focus:ring-yellow-500"
                                                />
                                                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                                    {shape}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Color */}
                            <div className="p-4">
                                <button
                                    onClick={() => toggleSection("color")}
                                    className="w-full flex items-center justify-between "
                                >
                                    <span className="font-semibold text-gray-900 text-sm">
                                        Цвет
                                        <CountBadge count={selectedColors.size} />
                                    </span>
                                    {expandedSections.has("color") ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                                {expandedSections.has("color") && (
                                    <div className="mt-3">
                                        {availableColors.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic">Цвета не заданы в базе</p>
                                        ) : (
                                            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                                                {availableColors.map((color) => (
                                                    <label
                                                        key={color}
                                                        className="flex items-center gap-2.5 cursor-pointer group"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedColors.has(color)}
                                                            onChange={() =>
                                                                setSelectedColors((prev) => toggleSet(prev, color))
                                                            }
                                                            className="w-4 h-4 rounded border-gray-300 accent-yellow-100 focus:ring-yellow-500"
                                                        />
                                                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                                            {color}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Purpose */}
                            <div className="p-4">
                                <button
                                    onClick={() => toggleSection("purpose")}
                                    className="w-full flex items-center justify-between"
                                >
                                    <span className="font-semibold text-gray-900 text-sm">
                                        Назначение
                                        <CountBadge count={selectedPurposes.size} />
                                    </span>
                                    {expandedSections.has("purpose") ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                                {expandedSections.has("purpose") && (
                                    <div className="mt-3 space-y-2.5">
                                        {PURPOSES.map((purpose) => (
                                            <label
                                                key={purpose}
                                                className="flex items-center gap-2.5 cursor-pointer group"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPurposes.has(purpose)}
                                                    onChange={() =>
                                                        setSelectedPurposes((prev) => toggleSet(prev, purpose))
                                                    }
                                                    className="w-4 h-4 rounded border-gray-300 accent-yellow-100 focus:ring-yellow-500"
                                                />
                                                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                                    {purpose}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Price */}
                            <div className="p-4">
                                <button
                                    onClick={() => toggleSection("price")}
                                    className="w-full flex items-center justify-between"
                                >
                                    <span className="font-semibold text-gray-900 text-sm">
                                        Цена, ₽{(priceMin !== "" || priceMax !== "") && <CountBadge count={1} />}
                                    </span>
                                    {expandedSections.has("price") ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                                {expandedSections.has("price") && (
                                    <div className="mt-3 flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder={`от ${priceRange.min}`}
                                            value={priceMin}
                                            onChange={(e) => setPriceMin(e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                                        />
                                        <span className="text-gray-400 text-sm flex-shrink-0">—</span>
                                        <input
                                            type="number"
                                            placeholder={`до ${priceRange.max}`}
                                            value={priceMax}
                                            onChange={(e) => setPriceMax(e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Reset */}
                            {hasActiveFilters && (
                                <div className="p-4">
                                    <button
                                        onClick={resetFilters}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Сбросить фильтры
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Products area */}
                    <div className="flex-1 min-w-0">
                        {/* Sort + count bar */}
                        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                            <span className="text-sm text-gray-500">
                                Найдено:{" "}
                                <span className="font-semibold text-gray-800">{filteredAndSortedProducts.length}</span>{" "}
                                {filteredAndSortedProducts.length === 1 ? "товар" : "товаров"}
                            </span>
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white"
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Active filter chips */}
                        {(selectedCategory !== "all" || selectedSubcategory !== "all" || hasActiveFilters) && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {selectedCategory !== "all" && (
                                    <Chip
                                        label={selectedCategory}
                                        onRemove={() => {
                                            setSelectedCategory("all");
                                            setSelectedSubcategory("all");
                                        }}
                                    />
                                )}
                                {selectedSubcategory !== "all" && (
                                    <Chip label={selectedSubcategory} onRemove={() => setSelectedSubcategory("all")} />
                                )}
                                {availabilityFilter.size === 1 &&
                                    Array.from(availabilityFilter).map((key) => (
                                        <Chip
                                            key={key}
                                            label={key === "in_stock" ? "В наличии" : "На заказ"}
                                            onRemove={() => setAvailabilityFilter(new Set(["in_stock", "to_order"]))}
                                        />
                                    ))}
                                {Array.from(selectedShapes).map((s) => (
                                    <Chip
                                        key={s}
                                        label={s}
                                        onRemove={() => setSelectedShapes((prev) => toggleSet(prev, s))}
                                    />
                                ))}
                                {Array.from(selectedColors).map((c) => (
                                    <Chip
                                        key={c}
                                        label={c}
                                        onRemove={() => setSelectedColors((prev) => toggleSet(prev, c))}
                                    />
                                ))}
                                {Array.from(selectedPurposes).map((p) => (
                                    <Chip
                                        key={p}
                                        label={p}
                                        onRemove={() => setSelectedPurposes((prev) => toggleSet(prev, p))}
                                    />
                                ))}
                                {(priceMin !== "" || priceMax !== "") && (
                                    <Chip
                                        label={[priceMin && `от ${priceMin} ₽`, priceMax && `до ${priceMax} ₽`]
                                            .filter(Boolean)
                                            .join(" ")}
                                        onRemove={() => {
                                            setPriceMin("");
                                            setPriceMax("");
                                        }}
                                    />
                                )}
                            </div>
                        )}

                        {/* Products grid */}
                        {filteredAndSortedProducts.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-lg">
                                <p className="text-gray-600 text-lg mb-4">Товары не найдены</p>
                                {hasActiveFilters && (
                                    <button onClick={resetFilters} className="text-sm text-yellow-600 hover:underline">
                                        Сбросить фильтры
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredAndSortedProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800 border border-yellow-200">
            {label}
            <button onClick={onRemove} className="hover:text-yellow-900 ml-0.5">
                <X className="h-3 w-3" />
            </button>
        </span>
    );
}

function ProductCard({ product, onNavigate }: { product: Product; onNavigate: (page: string) => void }) {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
            <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                {product.photo_url ? (
                    <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                    <p className="text-gray-500 text-sm">Фото скоро появится</p>
                )}
            </div>
            <div className="p-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm text-yellow-600 font-semibold bg-yellow-50 px-2 py-0.5 rounded">
                        {product.category}
                    </span>
                    {product.subcategory && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {product.subcategory}
                        </span>
                    )}
                    {product.shape && (
                        <span className="text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded">{product.shape}</span>
                    )}
                </div>
                <h3 className="text-lg font-semibold mb-1 text-gray-900">{product.name}</h3>
                <p className="text-gray-600 mb-3 text-sm line-clamp-2">{product.description}</p>
                {(product.color || product.purpose) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                        {product.color && (
                            <span className="text-xs text-gray-500">
                                Цвет: <span className="font-medium text-gray-700">{product.color}</span>
                            </span>
                        )}
                        {product.purpose && (
                            <span className="text-xs text-gray-500">
                                Назначение: <span className="font-medium text-gray-700">{product.purpose}</span>
                            </span>
                        )}
                    </div>
                )}
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <div className="text-xl font-bold text-yellow-600">{product.price_per_sqm} ₽</div>
                        <div className="text-sm text-gray-500">за {product.unit}</div>
                    </div>
                    <div className="text-right">
                        <div
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                product.stock_quantity > 0
                                    ? "bg-green-100 text-green-700"
                                    : "bg-orange-100 text-orange-700"
                            }`}
                        >
                            {product.stock_quantity > 0
                                ? `В наличии: ${product.stock_quantity} ${product.unit}`
                                : "На заказ"}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => onNavigate("calculator")}
                    className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
                >
                    Рассчитать стоимость
                </button>
            </div>
        </div>
    );
}
