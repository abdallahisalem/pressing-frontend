import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ordersApi } from '../api/orders';
import { plantsApi } from '../api/plants';
import { Button, SearchInput, StatusBadge, UserDropdown, ConfirmDialog, Modal, Select } from '../components';
import type { Order, OrderStatus, Plant, BulkUpdateOrderStatusRequest } from '../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

// All 8 order statuses in workflow order
const ALL_STATUSES: OrderStatus[] = [
  'CREATED',
  'COLLECTED',
  'RECEIVED_AT_PLANT',
  'PROCESSING',
  'PROCESSED',
  'DISPATCHED',
  'READY',
  'DELIVERED',
];

// Status groups for plant operator
const PLANT_STATUSES: OrderStatus[] = ['RECEIVED_AT_PLANT', 'PROCESSING', 'PROCESSED', 'DISPATCHED'];

// Valid status transitions by role - only allows moving to the NEXT status
const getNextStatus = (currentStatus: OrderStatus, role: string): OrderStatus | null => {
  if (role === 'ADMIN') {
    // ADMIN can move to any next status in the workflow
    const idx = ALL_STATUSES.indexOf(currentStatus);
    return idx < ALL_STATUSES.length - 1 ? ALL_STATUSES[idx + 1] : null;
  }

  if (role === 'SUPERVISOR') {
    // SUPERVISOR transitions at pressing:
    // CREATED → COLLECTED (hand off to driver)
    // DISPATCHED → READY (received back from plant)
    // READY → DELIVERED (given to client)
    if (currentStatus === 'CREATED') return 'COLLECTED';
    if (currentStatus === 'DISPATCHED') return 'READY';
    if (currentStatus === 'READY') return 'DELIVERED';
    return null;
  }

  if (role === 'PLANT_OPERATOR') {
    // PLANT_OPERATOR transitions at plant:
    // COLLECTED → RECEIVED_AT_PLANT (accept at plant)
    // RECEIVED_AT_PLANT → PROCESSING (start processing)
    // PROCESSING → PROCESSED (complete processing)
    // PROCESSED → DISPATCHED (send back to pressing)
    if (currentStatus === 'COLLECTED') return 'RECEIVED_AT_PLANT';
    if (currentStatus === 'RECEIVED_AT_PLANT') return 'PROCESSING';
    if (currentStatus === 'PROCESSING') return 'PROCESSED';
    if (currentStatus === 'PROCESSED') return 'DISPATCHED';
    return null;
  }

  return null;
};

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
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Bulk selection state
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState<OrderStatus | ''>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Plant selection for RECEIVED_AT_PLANT status
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<number | ''>('');

  useEffect(() => {
    loadOrders();
    loadPlants();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, searchTerm]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      let data: Order[];

      if (user.role === 'ADMIN') {
        // Admin sees all orders
        data = await ordersApi.getAllOrders();
      } else if (user.role === 'PLANT_OPERATOR' && user.plantId) {
        // Plant operator sees:
        // 1. All COLLECTED orders (visible to ALL plant operators - incoming)
        // 2. Orders at their plant (RECEIVED_AT_PLANT, PROCESSING, PROCESSED, DISPATCHED)
        const [collectedOrders, plantOrders] = await Promise.all([
          ordersApi.getCollectedOrders(),
          ordersApi.getOrdersByPlant(user.plantId),
        ]);
        // Combine and deduplicate (in case of any overlap)
        const orderMap = new Map<number, Order>();
        collectedOrders.forEach((order) => orderMap.set(order.id, order));
        plantOrders.forEach((order) => orderMap.set(order.id, order));
        data = Array.from(orderMap.values());
      } else if (user.pressingId) {
        // Supervisor sees orders at their pressing
        data = await ordersApi.getOrdersByPressing(user.pressingId);
      } else {
        data = [];
      }

      setOrders(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlants = async () => {
    try {
      const data = await plantsApi.getAllPlants(true);
      setPlants(data);
    } catch {
      // Silent fail for plants
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

  // Bulk selection handlers
  const handleSelectOrder = (orderId: number) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((o) => o.id));
    }
  };

  const getSelectedOrdersStatus = (): OrderStatus | null => {
    if (selectedOrders.length === 0) return null;
    const statuses = new Set(
      orders.filter((o) => selectedOrders.includes(o.id)).map((o) => o.status)
    );
    return statuses.size === 1 ? Array.from(statuses)[0] : null;
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdateStatus || selectedOrders.length === 0) return;

    // Validate plant selection for RECEIVED_AT_PLANT
    if (bulkUpdateStatus === 'RECEIVED_AT_PLANT' && !selectedPlantId) {
      toast.error(t('orders.selectPlantRequired'));
      return;
    }

    setIsBulkUpdating(true);
    try {
      const request: BulkUpdateOrderStatusRequest = {
        orderIds: selectedOrders,
        newStatus: bulkUpdateStatus,
        ...(bulkUpdateStatus === 'RECEIVED_AT_PLANT' && selectedPlantId
          ? { plantId: selectedPlantId as number }
          : {}),
      };

      const updatedOrders = await ordersApi.bulkUpdateStatus(request);

      // Update local state
      setOrders((prev) =>
        prev.map((order) => {
          const updated = updatedOrders.find((u) => u.id === order.id);
          return updated || order;
        })
      );

      toast.success(t('orders.bulkUpdateSuccess', { count: updatedOrders.length }));
      setSelectedOrders([]);
      setIsBulkUpdateModalOpen(false);
      setBulkUpdateStatus('');
      setSelectedPlantId('');
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.status === 403) {
        toast.error(t('orders.bulkUpdatePermissionError'));
      } else {
        toast.error(axiosError.response?.data?.message || t('orders.bulkUpdateError'));
      }
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const openBulkUpdateModal = () => {
    const currentStatus = getSelectedOrdersStatus();
    if (currentStatus && user) {
      const next = getNextStatus(currentStatus, user.role);
      if (next) {
        setBulkUpdateStatus(next);
      }
    }
    setIsBulkUpdateModalOpen(true);
  };

  // Get status tabs based on role
  const getStatusTabs = (): (OrderStatus | 'ALL')[] => {
    if (!user) return ['ALL'];

    if (user.role === 'ADMIN') {
      return ['ALL', ...ALL_STATUSES];
    }

    if (user.role === 'PLANT_OPERATOR') {
      // PLANT_OPERATOR sees COLLECTED (incoming) + plant statuses
      return ['ALL', 'COLLECTED', ...PLANT_STATUSES];
    }

    // SUPERVISOR sees all statuses (but can only modify some)
    return ['ALL', ...ALL_STATUSES];
  };

  // Check if selected orders can be bulk updated
  const canBulkUpdate = (): boolean => {
    const currentStatus = getSelectedOrdersStatus();
    if (!currentStatus || !user) return false;
    return getNextStatus(currentStatus, user.role) !== null;
  };

  // Check if user can create orders
  const canCreateOrders = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

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
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img src="/vite.svg" alt="Logo" className="h-10 w-10" />
              <div className="text-left">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">
                  <span className="hidden sm:inline">{t('dashboard.title')}</span>
                  <span className="sm:hidden">{t('orders.title')}</span>
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">{t('orders.title')}</p>
              </div>
            </button>
            <div className="flex items-center gap-3">
              <UserDropdown
                userName={user?.name || 'User'}
                userRole={user?.role || 'SUPERVISOR'}
                pressingName={user?.pressingName || undefined}
                onLogout={() => setIsLogoutConfirmOpen(true)}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
        title={t('common.logoutConfirm')}
        message={t('common.logoutMessage')}
        confirmText={t('common.logout')}
        confirmVariant="danger"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('orders.title')}</h2>
                <div className="flex gap-2">
                  {selectedOrders.length > 0 && canBulkUpdate() && (
                    <Button
                      variant="secondary"
                      onClick={openBulkUpdateModal}
                      className="w-full sm:w-auto"
                    >
                      {t('orders.bulkUpdate')} ({selectedOrders.length})
                    </Button>
                  )}
                  {selectedOrders.length > 0 && !canBulkUpdate() && getSelectedOrdersStatus() && (
                    <span className="text-sm text-gray-500 self-center">
                      {t('orders.cannotUpdateStatus')}
                    </span>
                  )}
                  {canCreateOrders && (
                    <Button onClick={() => navigate('/orders/new')} className="w-full sm:w-auto">
                      {t('orders.createOrder')}
                    </Button>
                  )}
                </div>
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
                {getStatusTabs().map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      statusFilter === status
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {status === 'ALL' ? t('orders.all') : t(`status.order.${status}`)} ({getStatusCount(status)})
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Select All */}
            {filteredOrders.length > 0 && (
              <div className="px-4 sm:px-6 py-2 bg-gray-50 border-b border-gray-200">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  {t('orders.selectAll')} ({filteredOrders.length})
                </label>
              </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="sr-only">{t('orders.select')}</span>
                    </th>
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
                      {t('orders.plant')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('orders.items')}
                    </th>
                    {user?.role !== 'PLANT_OPERATOR' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('orders.amount')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('orders.payment')}
                        </th>
                      </>
                    )}
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
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
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
                        {order.plantName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </td>
                      {user?.role !== 'PLANT_OPERATOR' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.payment ? `$${order.payment.amount.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {order.payment ? (
                              <StatusBadge status={order.payment.status} type="payment" />
                            ) : '-'}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {t('orders.viewDetails')}
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
                  className="p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1" onClick={() => navigate(`/orders/${order.id}`)}>
                      <div className="flex justify-between items-start mb-2">
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
                        {order.plantName && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t('orders.plant')}:</span>
                            <span className="text-sm text-gray-900">{order.plantName}</span>
                          </div>
                        )}
                        {user?.role !== 'PLANT_OPERATOR' && order.payment && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">{t('orders.amount')}:</span>
                              <span className="text-sm font-bold text-gray-900">${order.payment.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">{t('orders.payment')}:</span>
                              <StatusBadge status={order.payment.status} type="payment" />
                            </div>
                          </>
                        )}
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

      {/* Bulk Update Modal */}
      <Modal
        isOpen={isBulkUpdateModalOpen}
        onClose={() => {
          setIsBulkUpdateModalOpen(false);
          setBulkUpdateStatus('');
          setSelectedPlantId('');
        }}
        title={t('orders.bulkUpdateTitle')}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('orders.bulkUpdateDescription', { count: selectedOrders.length })}
          </p>

          {/* Show current status and next status */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('orders.status')}:</span>
              <StatusBadge status={getSelectedOrdersStatus() || 'CREATED'} type="order" />
            </div>
            <div className="flex items-center justify-center text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('orders.newStatus')}:</span>
              {bulkUpdateStatus ? (
                <StatusBadge status={bulkUpdateStatus} type="order" />
              ) : (
                <span className="text-sm text-red-500">{t('orders.noValidTransition')}</span>
              )}
            </div>
          </div>

          {bulkUpdateStatus === 'RECEIVED_AT_PLANT' && (
            <Select
              label={t('orders.assignPlant')}
              value={selectedPlantId}
              onChange={(e) => setSelectedPlantId(e.target.value ? Number(e.target.value) : '')}
              options={plants.map((plant) => ({
                value: plant.id,
                label: plant.name,
              }))}
            />
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsBulkUpdateModalOpen(false);
                setBulkUpdateStatus('');
                setSelectedPlantId('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBulkUpdate}
              isLoading={isBulkUpdating}
              disabled={!bulkUpdateStatus || (bulkUpdateStatus === 'RECEIVED_AT_PLANT' && !selectedPlantId)}
            >
              {t('orders.updateOrders')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
