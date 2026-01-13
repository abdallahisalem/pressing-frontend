import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ordersApi } from '../api/orders';
import { Button, SearchInput, StatusBadge, LanguageSwitcher } from '../components';
import type { Order, OrderStatus } from '../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

export const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickLookupCode, setQuickLookupCode] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, searchTerm]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      const pressingId = user.role === 'SUPERVISOR' ? user.pressingId : 1;
      const data = await ordersApi.getOrdersByPressing(pressingId);
      setOrders(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Filter by search term (reference code or client name)
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.referenceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by created date descending (newest first)
    filtered = filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setFilteredOrders(filtered);
  };

  const handleQuickLookup = async () => {
    if (!quickLookupCode.trim()) return;

    try {
      const order = await ordersApi.getOrderByReference(quickLookupCode.trim());
      navigate(`/orders/${order.id}`);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Order not found');
    }
  };

  const getStatusCount = (status: OrderStatus | 'ALL') => {
    if (status === 'ALL') return orders.length;
    return orders.filter((o) => o.status === status).length;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-base sm:text-xl font-bold text-gray-900">
                <span className="hidden sm:inline">{t('dashboard.title')}</span>
                <span className="sm:hidden">{t('orders.title')}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
                <span className="hidden sm:inline">{t('common.dashboard')}</span>
                <span className="sm:hidden">{t('common.home')}</span>
              </Button>
              <LanguageSwitcher />
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                {t('common.logout')}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('orders.title')}</h2>
                <Button onClick={() => navigate('/orders/new')} className="w-full sm:w-auto">{t('orders.createOrder')}</Button>
              </div>

              {/* Quick Lookup */}
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder={t('orders.quickLookup')}
                    value={quickLookupCode}
                    onChange={(e) => setQuickLookupCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickLookup()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button onClick={handleQuickLookup} className="w-full sm:w-auto">{t('orders.lookup')}</Button>
                </div>
              </div>

              {/* Search */}
              <SearchInput
                placeholder={t('orders.searchPlaceholder')}
                onSearch={setSearchTerm}
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="px-4 sm:px-6 py-3 border-b border-gray-200 overflow-x-auto">
              <div className="flex space-x-2 sm:space-x-4 min-w-max sm:min-w-0">
                {(['ALL', 'CREATED', 'IN_PROGRESS', 'READY', 'DELIVERED'] as const).map((status) => {
                  const statusLabels = {
                    ALL: { full: t('orders.all'), short: t('orders.all') },
                    CREATED: { full: t('status.order.CREATED'), short: t('orders.new') },
                    IN_PROGRESS: { full: t('status.order.IN_PROGRESS'), short: t('orders.progress') },
                    READY: { full: t('status.order.READY'), short: t('orders.ready') },
                    DELIVERED: { full: t('status.order.DELIVERED'), short: t('orders.done') },
                  };
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        statusFilter === status
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="hidden sm:inline">{statusLabels[status].full} ({getStatusCount(status)})</span>
                      <span className="sm:hidden">{statusLabels[status].short} ({getStatusCount(status)})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('orders.referenceCode')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('orders.client')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('orders.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('orders.items')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('orders.amount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('orders.payment')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('orders.created')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm font-bold text-blue-600">
                          {order.referenceCode}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={order.status} type="order" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${order.payment.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={order.payment.status} type="payment" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 hover:bg-gray-50 active:bg-gray-100"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <code className="text-sm font-bold text-blue-600">
                      {order.referenceCode}
                    </code>
                    <StatusBadge status={order.status} type="order" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('orders.client')}:</span>
                      <span className="text-sm font-medium text-gray-900">{order.clientName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('orders.amount')}:</span>
                      <span className="text-sm font-bold text-gray-900">${order.payment.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('orders.payment')}:</span>
                      <StatusBadge status={order.payment.status} type="payment" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('orders.items')}:</span>
                      <span className="text-sm text-gray-900">
                        {t('orders.items_count', { count: order.items.length })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs font-medium text-blue-600">
                        {t('orders.tapToView')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'ALL'
                    ? t('orders.noOrdersFiltered')
                    : t('orders.noOrders')}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
