import { useState, useEffect } from 'react';
import { Plus, Package, TrendingDown, TrendingUp, Trash2, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/Modal';
import { Database } from '../../types/database';

type Product = Database['public']['Tables']['products']['Row'];
type InventoryTransaction = Database['public']['Tables']['inventory_transactions']['Row'] & {
  product: { name: string; unit: string };
};

interface OrderOption {
  id: string;
  order_number: string;
  status: string;
  customer: { name: string } | null;
  items: {
    id: string;
    product_id: string;
    quantity: number;
    product: { name: string; unit: string };
  }[];
}

interface ShipmentLine {
  product_id: string;
  quantity: number;
}

export function InventorySection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddReceiving, setShowAddReceiving] = useState(false);
  const [showAddShipment, setShowAddShipment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [receivingForm, setReceivingForm] = useState({ product_id: '', quantity: 0, notes: '' });

  // Shipment state
  const [shipmentMode, setShipmentMode] = useState<'manual' | 'order'>('manual');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [shipmentLines, setShipmentLines] = useState<ShipmentLine[]>([{ product_id: '', quantity: 0 }]);
  const [shipmentNotes, setShipmentNotes] = useState('');

  useEffect(() => {
    loadInventory();
    loadTransactions();
    loadDeliveryOrders();
  }, []);

  async function loadInventory() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('stock_quantity', { ascending: true });
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*, product:products(name, unit)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setTransactions(data as InventoryTransaction[]);
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  }

  async function loadDeliveryOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, status,
          customer:customers(name),
          items:order_items(id, product_id, quantity, product:products(name, unit))
        `)
        .in('status', ['Доставляется', 'Подтвержден', 'В обработке'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data as unknown as OrderOption[]) || []);
    } catch (err) {
      console.error('Error loading orders:', err);
    }
  }

  // When an order is selected, prefill shipment lines from its items
  function handleOrderSelect(orderId: string) {
    setSelectedOrderId(orderId);
    if (!orderId) {
      setShipmentLines([{ product_id: '', quantity: 0 }]);
      return;
    }
    const order = orders.find(o => o.id === orderId);
    if (order && order.items.length > 0) {
      setShipmentLines(order.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })));
    }
  }

  function addShipmentLine() {
    setShipmentLines(prev => [...prev, { product_id: '', quantity: 0 }]);
  }

  function removeShipmentLine(index: number) {
    setShipmentLines(prev => prev.filter((_, i) => i !== index));
  }

  function updateShipmentLine(index: number, field: keyof ShipmentLine, value: string | number) {
    setShipmentLines(prev => prev.map((line, i) =>
      i === index ? { ...line, [field]: value } : line
    ));
  }

  async function handleAddReceiving(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedProduct = products.find(p => p.id === receivingForm.product_id);
      if (!selectedProduct) throw new Error('Product not found');

      const { error: txErr } = await supabase
        .from('inventory_transactions')
        .insert({
          product_id: receivingForm.product_id,
          transaction_type: 'incoming',
          quantity: receivingForm.quantity,
          notes: receivingForm.notes,
        });
      if (txErr) throw txErr;

      const { error: updErr } = await supabase
        .from('products')
        .update({ stock_quantity: selectedProduct.stock_quantity + receivingForm.quantity })
        .eq('id', receivingForm.product_id);
      if (updErr) throw updErr;

      setReceivingForm({ product_id: '', quantity: 0, notes: '' });
      setShowAddReceiving(false);
      loadInventory();
      loadTransactions();
    } catch (err) {
      console.error('Error adding receiving:', err);
      alert('Ошибка при добавлении прихода');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddShipment(e: React.FormEvent) {
    e.preventDefault();
    const validLines = shipmentLines.filter(l => l.product_id && l.quantity > 0);
    if (validLines.length === 0) {
      alert('Добавьте хотя бы одну позицию с товаром и количеством');
      return;
    }

    // Check stock availability
    for (const line of validLines) {
      const product = products.find(p => p.id === line.product_id);
      if (!product) continue;
      if (product.stock_quantity < line.quantity) {
        alert(`Недостаточно товара на складе: ${product.name}. Остаток: ${product.stock_quantity} ${product.unit}, требуется: ${line.quantity} ${product.unit}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const orderRef = shipmentMode === 'order' && selectedOrderId ? selectedOrderId : null;
      const notesSuffix = shipmentMode === 'order' && selectedOrderId
        ? ` (Заказ ${orders.find(o => o.id === selectedOrderId)?.order_number || ''})`.trim()
        : '';

      for (const line of validLines) {
        const product = products.find(p => p.id === line.product_id)!;

        const { error: txErr } = await supabase
          .from('inventory_transactions')
          .insert({
            product_id: line.product_id,
            transaction_type: 'outgoing',
            quantity: -line.quantity,
            order_id: orderRef,
            notes: (shipmentNotes + notesSuffix).trim(),
          });
        if (txErr) throw txErr;

        const { error: updErr } = await supabase
          .from('products')
          .update({ stock_quantity: product.stock_quantity - line.quantity })
          .eq('id', line.product_id);
        if (updErr) throw updErr;
      }

      setShipmentLines([{ product_id: '', quantity: 0 }]);
      setShipmentNotes('');
      setSelectedOrderId('');
      setShipmentMode('manual');
      setShowAddShipment(false);
      loadInventory();
      loadTransactions();
    } catch (err) {
      console.error('Error adding shipment:', err);
      alert('Ошибка при добавлении отгрузки');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTransaction(id: string) {
    if (!confirm('Удалить операцию и вернуть остаток товара в прежнее состояние?')) return;
    try {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      // Read current stock directly from DB to avoid stale local state
      const { data: freshProduct, error: fetchErr } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', tx.product_id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      const { error: delErr } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('id', id);
      if (delErr) throw delErr;

      if (freshProduct) {
        const { error: updErr } = await supabase
          .from('products')
          .update({ stock_quantity: freshProduct.stock_quantity - tx.quantity })
          .eq('id', tx.product_id);
        if (updErr) throw updErr;
      }

      loadInventory();
      loadTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Ошибка при удалении операции');
    }
  }

  const lowStockProducts = products.filter(p => p.stock_quantity < 50);

  if (loading) {
    return <div className="text-center py-12">Загрузка склада...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Складской учет</h1>
          <p className="text-gray-600 mt-2">Остатки продукции и движение товаров</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddShipment(true)}
            className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Send className="h-5 w-5" />
            <span>Отгрузка</span>
          </button>
          <button
            onClick={() => setShowAddReceiving(true)}
            className="flex items-center space-x-2 bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Добавить приход</span>
          </button>
        </div>
      </div>

      {/* Receiving modal */}
      <Modal isOpen={showAddReceiving} title="Добавить приход товара" onClose={() => setShowAddReceiving(false)}>
        <form onSubmit={handleAddReceiving} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Товар <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={receivingForm.product_id}
              onChange={(e) => setReceivingForm({ ...receivingForm, product_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Выберите товар</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (остаток: {p.stock_quantity} {p.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Количество{receivingForm.product_id ? ` (${products.find(p => p.id === receivingForm.product_id)?.unit || ''})` : ''} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={receivingForm.quantity || ''}
              onChange={(e) => setReceivingForm({ ...receivingForm, quantity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Примечание</label>
            <textarea
              value={receivingForm.notes}
              onChange={(e) => setReceivingForm({ ...receivingForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Накладная №, поставщик, и т.д."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors font-semibold"
          >
            {submitting ? 'Добавление...' : 'Добавить приход'}
          </button>
        </form>
      </Modal>

      {/* Shipment modal */}
      <Modal isOpen={showAddShipment} title="Оформить отгрузку" onClose={() => {
        setShowAddShipment(false);
        setShipmentLines([{ product_id: '', quantity: 0 }]);
        setShipmentNotes('');
        setSelectedOrderId('');
        setShipmentMode('manual');
      }}>
        <form onSubmit={handleAddShipment} className="space-y-5">

          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            <button
              type="button"
              onClick={() => { setShipmentMode('manual'); setSelectedOrderId(''); setShipmentLines([{ product_id: '', quantity: 0 }]); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                shipmentMode === 'manual'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Вручную
            </button>
            <button
              type="button"
              onClick={() => { setShipmentMode('order'); setShipmentLines([{ product_id: '', quantity: 0 }]); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                shipmentMode === 'order'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              По заказу
            </button>
          </div>

          {/* Order selector */}
          {shipmentMode === 'order' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Заказ <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => handleOrderSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400"
              >
                <option value="">Выберите заказ</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} — {o.customer?.name || 'Без клиента'} [{o.status}]
                  </option>
                ))}
              </select>
              {orders.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Нет заказов со статусами: Доставляется, Подтвержден, В обработке</p>
              )}
            </div>
          )}

          {/* Shipment lines */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700">Позиции отгрузки</label>
              {shipmentMode === 'manual' && (
                <button
                  type="button"
                  onClick={addShipmentLine}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Добавить строку</span>
                </button>
              )}
            </div>
            <div className="space-y-2">
              {shipmentLines.map((line, idx) => {
                const selectedProduct = products.find(p => p.id === line.product_id);
                return (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <select
                        required
                        value={line.product_id}
                        disabled={shipmentMode === 'order' && !!selectedOrderId}
                        onChange={(e) => updateShipmentLine(idx, 'product_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 text-sm disabled:bg-gray-100"
                      >
                        <option value="">Выберите товар</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (склад: {p.stock_quantity} {p.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32 flex items-center gap-1">
                      <input
                        type="number"
                        required
                        min="1"
                        step="1"
                        value={line.quantity || ''}
                        onChange={(e) => updateShipmentLine(idx, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 text-sm"
                        placeholder="Кол-во"
                      />
                      {selectedProduct && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">{selectedProduct.unit}</span>
                      )}
                    </div>
                    {shipmentLines.length > 1 && shipmentMode === 'manual' && (
                      <button
                        type="button"
                        onClick={() => removeShipmentLine(idx)}
                        className="text-gray-400 hover:text-red-500 mt-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stock warnings */}
          {shipmentLines.some(l => {
            const p = products.find(pr => pr.id === l.product_id);
            return p && l.quantity > 0 && p.stock_quantity < l.quantity;
          }) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-red-700 mb-1">Недостаточно на складе:</p>
              {shipmentLines.map((l, idx) => {
                const p = products.find(pr => pr.id === l.product_id);
                if (!p || !l.quantity || p.stock_quantity >= l.quantity) return null;
                return (
                  <p key={idx} className="text-xs text-red-600">
                    {p.name}: нужно {l.quantity} {p.unit}, остаток {p.stock_quantity} {p.unit}
                  </p>
                );
              })}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Примечание</label>
            <textarea
              value={shipmentNotes}
              onChange={(e) => setShipmentNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400"
              placeholder="Номер накладной, получатель, и т.д."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors font-semibold"
          >
            {submitting ? 'Оформление...' : 'Оформить отгрузку'}
          </button>
        </form>
      </Modal>

      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Package className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900">Товары с низким остатком</h3>
          </div>
          <div className="space-y-1">
            {lowStockProducts.map(product => (
              <p key={product.id} className="text-sm text-yellow-800">
                {product.name}: {product.stock_quantity} {product.unit}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Остатки на складе</h2>
          <div className="space-y-3">
            {products.map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.category}</p>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    product.stock_quantity < 50 ? 'text-red-600' :
                    product.stock_quantity < 100 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {product.stock_quantity} {product.unit}
                  </div>
                  <div className="text-xs text-gray-500">
                    {product.price_per_sqm} ₽/{product.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Последние операции</h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {transactions.map(transaction => (
              <div key={transaction.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                <div className={`mt-1 ${
                  transaction.transaction_type === 'incoming' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.transaction_type === 'incoming' ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{transaction.product?.name}</p>
                      <p className="text-sm text-gray-600">
                        {transaction.transaction_type === 'incoming' ? 'Приход' :
                         transaction.transaction_type === 'outgoing' ? 'Отгрузка' : 'Корректировка'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-2 shrink-0">
                      <div className={`text-lg font-bold ${
                        transaction.transaction_type === 'incoming' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.quantity > 0 ? '+' : ''}{transaction.quantity} {transaction.product?.unit || ''}
                      </div>
                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(transaction.created_at).toLocaleString('ru-RU')}
                  </p>
                  {transaction.notes && (
                    <p className="text-sm text-gray-600 mt-1 truncate">{transaction.notes}</p>
                  )}
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Операций пока нет</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Статистика склада</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{products.length}</div>
            <div className="text-sm text-gray-600 mt-1">Наименований</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {products.reduce((sum, p) => sum + p.stock_quantity, 0).toFixed(0)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Общий остаток (ед.)</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">{lowStockProducts.length}</div>
            <div className="text-sm text-gray-600 mt-1">Низкий остаток</div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <div className="text-3xl font-bold text-amber-600">
              {products.reduce((sum, p) => sum + (p.stock_quantity * p.price_per_sqm), 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-gray-600 mt-1">Стоимость склада (₽)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
