import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  averageOrderValue: number;
  ordersByStatus: { status: string; count: number }[];
  topProducts: { product_name: string; total_quantity: number; total_revenue: number }[];
  recentOrders: { count: number; revenue: number };
}

export function AnalyticsSection() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
    ordersByStatus: [],
    topProducts: [],
    recentOrders: { count: 0, revenue: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('*');

      const { data: customers } = await supabase
        .from('customers')
        .select('id');

      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(name)
        `);

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
      const totalCustomers = customers?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const statusCounts = orders?.reduce((acc, order) => {
        const existing = acc.find(item => item.status === order.status);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ status: order.status, count: 1 });
        }
        return acc;
      }, [] as { status: string; count: number }[]) || [];

      const productStats = orderItems?.reduce((acc, item) => {
        const productName = item.product?.name || 'Unknown';
        const existing = acc.find(p => p.product_name === productName);
        if (existing) {
          existing.total_quantity += item.quantity;
          existing.total_revenue += item.subtotal;
        } else {
          acc.push({
            product_name: productName,
            total_quantity: item.quantity,
            total_revenue: item.subtotal
          });
        }
        return acc;
      }, [] as { product_name: string; total_quantity: number; total_revenue: number }[]) || [];

      productStats.sort((a, b) => b.total_revenue - a.total_revenue);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentOrders = orders?.filter(o => new Date(o.created_at) >= thirtyDaysAgo) || [];

      setStats({
        totalOrders,
        totalRevenue,
        totalCustomers,
        averageOrderValue,
        ordersByStatus: statusCounts,
        topProducts: productStats.slice(0, 5),
        recentOrders: {
          count: recentOrders.length,
          revenue: recentOrders.reduce((sum, o) => sum + o.total_amount, 0)
        }
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка аналитики...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Аналитика и отчеты</h1>
        <p className="text-gray-600 mt-2">Статистика продаж и популярные товары</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalOrders}</div>
          <div className="text-sm text-gray-600 mt-1">Всего заказов</div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.totalRevenue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
          </div>
          <div className="text-sm text-gray-600 mt-1">Общая выручка</div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</div>
          <div className="text-sm text-gray-600 mt-1">Клиентов</div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.averageOrderValue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
          </div>
          <div className="text-sm text-gray-600 mt-1">Средний чек</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Заказы по статусам</h2>
          <div className="space-y-3">
            {stats.ordersByStatus.map(item => (
              <div key={item.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{item.status}</span>
                <div className="flex items-center space-x-3">
                  <div className="text-2xl font-bold text-amber-600">{item.count}</div>
                  <div className="text-sm text-gray-600">
                    ({((item.count / stats.totalOrders) * 100).toFixed(0)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Популярные товары</h2>
          <div className="space-y-3">
            {stats.topProducts.map((product, index) => (
              <div key={product.product_name} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-amber-600 font-bold">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{product.product_name}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">
                      Продано: {product.total_quantity.toFixed(1)} ед.
                    </span>
                    <span className="text-sm font-semibold text-amber-600">
                      {product.total_revenue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-2xl font-bold mb-6">Последние 30 дней</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="text-4xl font-bold mb-2">{stats.recentOrders.count}</div>
            <div className="text-amber-100">Новых заказов</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">
              {stats.recentOrders.revenue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
            </div>
            <div className="text-amber-100">Выручка за период</div>
          </div>
        </div>
      </div>
    </div>
  );
}
