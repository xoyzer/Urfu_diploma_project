import { useState } from 'react';
import { ShoppingCart, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CalculatorResult } from './CalculatorPage';

interface OrderFormPageProps {
  orderData?: CalculatorResult;
  onNavigate: (page: string) => void;
}

export function OrderFormPage({ orderData, onNavigate }: OrderFormPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData || orderData.items.length === 0) return;
    setLoading(true);

    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          company_name: formData.company,
          address: orderData.isPickup ? '' : formData.address,
          notes: formData.notes,
        })
        .select()
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customer) throw new Error('Не удалось создать клиента');

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customer.id,
          status: 'Новый',
          total_amount: orderData.totalCost,
          delivery_cost: orderData.deliveryCost,
          delivery_type: orderData.deliveryType,
          delivery_address: orderData.isPickup ? '' : formData.address,
          notes: formData.notes,
          source: 'website',
        })
        .select()
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order) throw new Error('Не удалось создать заказ');

      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_per_sqm: item.product.price_per_sqm,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      if (itemsError) throw itemsError;

      await supabase.from('order_history').insert({
        order_id: order.id,
        action_type: 'status_change',
        new_status: 'Новый',
        comment: 'Заказ создан через сайт',
      });

      setSuccess(true);
      setTimeout(() => {
        onNavigate('home');
      }, 3000);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Произошла ошибка при создании заказа. Пожалуйста, попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center max-w-md">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Заявка отправлена!</h2>
          <p className="text-gray-600 mb-6">
            Спасибо за заказ! Наш менеджер свяжется с вами в ближайшее время.
          </p>
          <p className="text-sm text-gray-500">Перенаправление на главную страницу...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-8">
            <ShoppingCart className="h-8 w-8 text-amber-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Оформление заявки</h1>
          </div>

          {orderData && orderData.items.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Детали заказа</h3>
              <div className="space-y-2 mb-4">
                {orderData.items.map(item => (
                  <div key={item.product.id} className="flex justify-between text-sm border-b border-amber-200 pb-2">
                    <div>
                      <div className="font-semibold">{item.product.name}</div>
                      <div className="text-gray-600">{item.quantity} {item.product.unit} × {item.product.price_per_sqm} ₽</div>
                    </div>
                    <div className="font-semibold">{item.subtotal.toLocaleString('ru-RU')} ₽</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Транспорт:</p>
                  <p className="font-semibold">{orderData.deliveryType}</p>
                </div>
                <div>
                  <p className="text-gray-600">Вес груза:</p>
                  <p className="font-semibold">{orderData.totalWeight.toLocaleString('ru-RU')} кг</p>
                </div>
                <div>
                  <p className="text-gray-600">Стоимость материалов:</p>
                  <p className="font-semibold">{orderData.productCost.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div>
                  <p className="text-gray-600">Стоимость доставки:</p>
                  <p className="font-semibold">{orderData.deliveryCost.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div className="col-span-2 border-t border-amber-300 pt-4 mt-2">
                  <p className="text-gray-600">Итого:</p>
                  <p className="text-2xl font-bold text-amber-600">{orderData.totalCost.toLocaleString('ru-RU')} ₽</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Имя <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Телефон <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="example@mail.ru"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Название компании
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="ООО Пример"
                />
              </div>
            </div>

            {!orderData?.isPickup && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Адрес доставки <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="г. Москва, ул. Примерная, д. 123"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Комментарий к заказу
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Дополнительная информация о заказе..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 text-white py-4 rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-lg font-semibold"
            >
              {loading ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
