import { useState, useEffect } from "react";
import { Search, ListFilter as Filter, ChevronDown, ChevronRight } from "lucide-react";
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

export function CatalogPage({ onNavigate, initialCategory }: CatalogPageProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "all");
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);

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
            supabase.from("products").select("*").eq("is_active", true)
                .order("category").order("subcategory").order("name")
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
        } catch (error) {
            console.error("Error loading products:", error);
        } finally {
            setLoading(false);
        }
    }

    const toggleCategory = (categoryName: string) => {
        setExpandedCategories((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(categoryName)) {
                newSet.delete(categoryName);
                setSelectedSubcategory("all");
            } else {
                newSet.add(categoryName);
            }
            return newSet;
        });
    };

    const selectCategory = (categoryName: string) => {
        setSelectedCategory(categoryName);
        setSelectedSubcategory("all");
        if (!expandedCategories.has(categoryName)) {
            setExpandedCategories((prev) => new Set(prev).add(categoryName));
        }
    };

    const selectSubcategory = (subcategoryName: string) => {
        setSelectedSubcategory(subcategoryName);
    };

    const filteredProducts = products.filter((product) => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
        const matchesSubcategory =
            selectedSubcategory === "all" ||
            product.subcategory === selectedSubcategory ||
            (selectedSubcategory === "_none_" && !product.subcategory);
        return matchesSearch && matchesCategory && matchesSubcategory;
    });

    const currentCategory = categories.find((c) => c.name === selectedCategory);

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

                <div className="mb-8 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="Поиск по названию или описанию..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex gap-8">
                    {/* Sidebar filters */}
                    <div className="w-64 flex-shrink-0">
                        <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Filter className="text-gray-400 h-5 w-5" />
                                <h2 className="font-semibold text-gray-900">Категории</h2>
                            </div>

                            <div className="space-y-1">
                                <button
                                    onClick={() => {
                                        setSelectedCategory("all");
                                        setSelectedSubcategory("all");
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                                        selectedCategory === "all"
                                            ? "bg-yellow-100 text-yellow-800 font-semibold"
                                            : "hover:bg-gray-100 text-gray-700"
                                    }`}
                                >
                                    <span>Все товары</span>
                                    <span className="text-sm text-gray-500">{products.length}</span>
                                </button>

                                {categories.map((category) => (
                                    <div key={category.name}>
                                        <div className="flex items-center">
                                            <button
                                                onClick={() => toggleCategory(category.name)}
                                                className="p-1 hover:bg-gray-100 rounded"
                                            >
                                                {expandedCategories.has(category.name) ? (
                                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => selectCategory(category.name)}
                                                className={`flex-1 text-left px-2 py-2 rounded-lg transition-colors flex items-center justify-between ${
                                                    selectedCategory === category.name
                                                        ? "bg-yellow-100 text-yellow-800 font-semibold"
                                                        : "hover:bg-gray-100 text-gray-700"
                                                }`}
                                            >
                                                <span>{category.name}</span>
                                                <span className="text-sm text-gray-500">{category.productCount}</span>
                                            </button>
                                        </div>

                                        {expandedCategories.has(category.name) && category.subcategories.length > 0 && (
                                            <div className="ml-8 mt-1 space-y-1">
                                                {category.subcategories.map((sub) => (
                                                    <button
                                                        key={sub}
                                                        onClick={() => {
                                                            setSelectedCategory(category.name);
                                                            selectSubcategory(sub);
                                                        }}
                                                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                                                            selectedCategory === category.name &&
                                                            selectedSubcategory === sub
                                                                ? "bg-yellow-50 text-yellow-700 font-medium"
                                                                : "text-gray-600 hover:bg-gray-50"
                                                        }`}
                                                    >
                                                        {sub}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {expandedCategories.has(category.name) && category.subcategories.length === 0 && (
                                            <div className="ml-8 mt-1">
                                                <span className="text-sm text-gray-400 px-3">Нет подкатегорий</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Products grid */}
                    <div className="flex-1">
                        {/* Active filters display */}
                        {(selectedCategory !== "all" || selectedSubcategory !== "all") && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {selectedCategory !== "all" && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                                        {selectedCategory}
                                        <button
                                            onClick={() => {
                                                setSelectedCategory("all");
                                                setSelectedSubcategory("all");
                                            }}
                                            className="ml-2 hover:text-yellow-900"
                                        >
                                            &times;
                                        </button>
                                    </span>
                                )}
                                {selectedSubcategory !== "all" && currentCategory && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                                        {selectedSubcategory === "_none_" ? "Без подкатегории" : selectedSubcategory}
                                        <button
                                            onClick={() => setSelectedSubcategory("all")}
                                            className="ml-2 hover:text-yellow-900"
                                        >
                                            &times;
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}

                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-lg">
                                <p className="text-gray-600 text-lg">Товары не найдены</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                                    >
                                        <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                                            {product.photo_url ? (
                                                <img
                                                    src={product.photo_url}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <p className="text-gray-500">Фото скоро появится</p>
                                            )}
                                        </div>
                                        <div className="p-5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm text-yellow-600 font-semibold bg-yellow-50 px-2 py-0.5 rounded">
                                                    {product.category}
                                                </span>
                                                {product.subcategory && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                        {product.subcategory}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-semibold mb-2 text-gray-900">{product.name}</h3>
                                            <p className="text-gray-600 mb-4 text-sm line-clamp-2">{product.description}</p>

                                            <div className="flex justify-between items-center mb-4">
                                                <div>
                                                    <div className="text-xl font-bold text-yellow-600">
                                                        {product.price_per_sqm} ₽
                                                    </div>
                                                    <div className="text-sm text-gray-500">за {product.unit}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-500">В наличии:</div>
                                                    <div className="text-lg font-semibold text-gray-700">
                                                        {product.stock_quantity} {product.unit}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    localStorage.setItem("calculator_preselect_product", product.id);
                                                    onNavigate("calculator");
                                                }}
                                                className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
                                            >
                                                Рассчитать стоимость
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
