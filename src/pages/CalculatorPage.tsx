import { useState, useEffect } from 'react';
import { Calculator, Truck, MapPin, ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Product = Database['public']['Tables']['products']['Row'];

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
  weight: number;
}

export interface CalculatorResult {
  items: CartItem[];
  deliveryType: string;
  distance: number;
  totalWeight: number;
  productCost: number;
  deliveryCost: number;
  totalCost: number;
  isPickup: boolean;
}

interface CalculatorPageProps {
  onNavigate: (result: CalculatorResult) => void;
}

function getWeightPerUnit(product: Product): number {
  const name = product.name.toLowerCase();
  if (product.category === 'Бордюры') return 10;
  if (product.category === 'Смеси') return 50;
  if (name.includes('40мм')) return 100;
  if (name.includes('60мм')) return 125;
  return 100;
}

interface Transport {
  name: string;
  capacityKg: number;
  baseCost: number;
  label: string;
}

const TRANSPORT_OPTIONS: Transport[] = [
  { name: 'manipulator_5t', capacityKg: 5000, baseCost: 6000, label: 'Манипулятор 5т' },
  { name: 'manipulator_8t', capacityKg: 8000, baseCost: 9000, label: 'Манипулятор 8т' },
  { name: 'manipulator_10t_truck', capacityKg: Infinity, baseCost: 17000, label: 'Манипулятор 10т / Фура' },
];

const PER_KM_RATE = 100;

function pickTransport(totalWeightKg: number): Transport {
  for (const t of TRANSPORT_OPTIONS) {
    if (totalWeightKg <= t.capacityKg) return t;
  }
  return TRANSPORT_OPTIONS[TRANSPORT_OPTIONS.length - 1];
}

export function CalculatorPage({ onNavigate }: CalculatorPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [isPickup, setIsPickup] = useState<boolean>(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('name');
    setProducts(data || []);
  }

  const productsByCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  const addItem = () => {
    if (!selectedProductId || newQuantity <= 0) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existing = items.find(i => i.product.id === product.id);
    if (existing) {
      setItems(items.map(i =>
        i.product.id === product.id
          ? {
              ...i,
              quantity: i.quantity + newQuantity,
              subtotal: (i.quantity + newQuantity) * product.price_per_sqm,
              weight: (i.quantity + newQuantity) * getWeightPerUnit(product),
            }
          : i
      ));
    } else {
      setItems([
        ...items,
        {
          product,
          quantity: newQuantity,
          subtotal: newQuantity * product.price_per_sqm,
          weight: newQuantity * getWeightPerUnit(product),
        },
      ]);
    }
    setSelectedProductId('');
    setNewQuantity(0);
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.product.id !== productId));
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(items.map(i =>
      i.product.id === productId
        ? {
            ...i,
            quantity,
            subtotal: quantity * i.product.price_per_sqm,
            weight: quantity * getWeightPerUnit(i.product),
          }
        : i
    ));
  };

  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const productCost = items.reduce((sum, i) => sum + i.subtotal, 0);
  const selectedTransport = pickTransport(totalWeight);
  const deliveryCost = isPickup || items.length === 0
    ? 0
    : selectedTransport.baseCost + distance * PER_KM_RATE;
  const totalCost = productCost + deliveryCost;

  const handleOrder = () => {
    if (items.length === 0) return;
    onNavigate({
      items,
      deliveryType: isPickup ? 'Самовывоз' : selectedTransport.label,
      distance: isPickup ? 0 : distance,
      totalWeight,
      productCost,
      deliveryCost,
      totalCost,
      isPickup,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-8">
            <Calculator className="h-8 w-8 text-amber-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Калькулятор стоимости</h1>
          </div>

          <div className="space-y-8">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Добавить товар</h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-7">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Продукт
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">-- Выберите продукт --</option>
                    {Object.entries(productsByCategory).map(([cat, list]) => (
                      <optgroup key={cat} label={cat}>
                        {list.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.price_per_sqm} ₽/{p.unit}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Количество ({(() => {
                      const p = products.find(p => p.id === selectedProductId);
                      return p ? p.unit : 'шт/м²';
                    })()})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={products.find(p => p.id === selectedProductId)?.unit === 'шт' ? '1' : '0.1'}
                    value={newQuantity || ''}
                    onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    onClick={addItem}
                    disabled={!selectedProductId || newQuantity <= 0}
                    className="w-full flex items-center justify-center space-x-2 bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Добавить</span>
                  </button>
                </div>
              </div>
            </div>

            {items.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Корзина ({items.length})
                </h2>
                <div className="space-y-3">
                  {items.map(item => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{item.product.name}</div>
                        <div className="text-sm text-gray-600">
                          {item.product.category} • {item.product.price_per_sqm} ₽/{item.product.unit} •{' '}
                          {getWeightPerUnit(item.product)} кг/{item.product.unit}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step={item.product.unit === 'шт' ? '1' : '0.1'}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemQuantity(item.product.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center"
                        />
                        <span className="text-sm text-gray-600">{item.product.unit}</span>
                      </div>
                      <div className="w-28 text-right font-semibold text-gray-900">
                        {item.subtotal.toLocaleString('ru-RU')} ₽
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <input
                id="pickup-checkbox"
                type="checkbox"
                checked={isPickup}
                onChange={(e) => setIsPickup(e.target.checked)}
                className="h-5 w-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
              />
              <label htmlFor="pickup-checkbox" className="ml-3 text-sm font-semibold text-gray-700 cursor-pointer">
                Самовывоз (без доставки)
              </label>
            </div>

            {!isPickup && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Расстояние до места доставки (км)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={distance || ''}
                  onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Введите расстояние в км"
                />
              </div>
            )}

            {!isPickup && items.length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <Truck className="h-6 w-6 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Рекомендованный транспорт
                  </h3>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-blue-700">
                    {selectedTransport.label}
                  </span>
                  <span className="text-sm text-gray-600">
                    Подача {selectedTransport.baseCost.toLocaleString('ru-RU')} ₽ + {PER_KM_RATE} ₽/км
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Общий вес груза: <span className="font-semibold">{totalWeight.toLocaleString('ru-RU')} кг</span>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 rounded-lg border-2 border-amber-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Расчет стоимости</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Стоимость материалов:</span>
                  <span className="font-semibold">{productCost.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Стоимость доставки:</span>
                  <span className="font-semibold">{deliveryCost.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="border-t-2 border-amber-300 pt-2 mt-2 flex justify-between text-xl font-bold text-amber-700">
                  <span>Итого:</span>
                  <span>{totalCost.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleOrder}
              disabled={items.length === 0}
              className="w-full flex items-center justify-center space-x-2 bg-amber-600 text-white py-4 rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-lg font-semibold"
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Оформить заявку</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
