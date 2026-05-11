import { useState, useEffect } from 'react';
import { Plus, Package, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/Modal';
import { Database } from '../../types/database';

type Product = Database['public']['Tables']['products']['Row'];
type InventoryTransaction = Database['public']['Tables']['inventory_transactions']['Row'] & {
  product: { name: string };
};

export function InventorySection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddReceiving, setShowAddReceiving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 0,
    notes: ''
  });

  useEffect(() => {
    loadInventory();
    loadTransactions();
  }, []);

  async function loadInventory() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('stock_quantity', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          product:products(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data as InventoryTransaction[]);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }

  async function handleAddReceiving(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedProduct = products.find(p => p.id === formData.product_id);
      if (!selectedProduct) throw new Error('Product not found');

      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert({
          product_id: formData.product_id,
          transaction_type: 'incoming',
          quantity: formData.quantity,
          notes: formData.notes
        });

      if (transactionError) throw transactionError;

      const newStock = selectedProduct.stock_quantity + formData.quantity;
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', formData.product_id);

      if (updateError) throw updateError;

      setFormData({ product_id: '', quantity: 0, notes: '' });
      setShowAddReceiving(false);
      loadInventory();
      loadTransactions();
    } catch (error) {
      console.error('Error adding receiving:', error);
      alert('Ошибка при добавлении прихода');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTransaction(id: string) {
    if (!confirm('Удалить операцию?')) return;
    try {
      const { error } = await supabase.from('inventory_transactions').delete().eq('id', id);
      if (error) throw error;
      loadTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
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
        <button
          onClick={() => setShowAddReceiving(true)}
          className="flex items-center space-x-2 bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors">
          <Plus className="h-5 w-5" />
          <span>Добавить приход</span>
        </button>
      </div>

      <Modal isOpen={showAddReceiving} title="Добавить приход товара" onClose={() => setShowAddReceiving(false)}>
        <form onSubmit={handleAddReceiving} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Товар <span className="text-red-500">*</span></label>
            <select
              required
              value={formData.product_id}
              onChange={(e) => setFormData({...formData, product_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Выберите товар</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (осталось: {p.stock_quantity} {p.unit})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Количество <span className="text-red-500">*</span></label>
            <input
              type="number"
              required
              step="0.1"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Примечание</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
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
          <div className="space-y-3">
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
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{transaction.product?.name}</p>
                      <p className="text-sm text-gray-600">
                        {transaction.transaction_type === 'incoming' ? 'Приход' :
                         transaction.transaction_type === 'outgoing' ? 'Расход' : 'Корректировка'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`text-lg font-bold ${
                        transaction.transaction_type === 'incoming' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.quantity > 0 ? '+' : ''}{transaction.quantity} {transaction.product?.unit || ''}
                      </div>
                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        className="text-red-600 hover:text-red-800">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(transaction.created_at).toLocaleString('ru-RU')}
                  </p>
                  {transaction.notes && (
                    <p className="text-sm text-gray-600 mt-1">{transaction.notes}</p>
                  )}
                </div>
              </div>
            ))}
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
