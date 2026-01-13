import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ordersApi } from '../api/orders';
import { Button, StatusBadge, ConfirmDialog, UserDropdown } from '../components';
import type { Order, OrderStatus } from '../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

export const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    if (!id) return;

    try {
      const data = await ordersApi.getOrder(parseInt(id));
      setOrder(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToLoad'));
      navigate('/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const statusFlow: Record<OrderStatus, OrderStatus | null> = {
      CREATED: 'IN_PROGRESS',
      IN_PROGRESS: 'READY',
      READY: null, // Must confirm payment
      DELIVERED: null, // Final status
    };
    return statusFlow[currentStatus];
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    setIsUpdatingStatus(true);
    try {
      const updatedOrder = await ordersApi.updateOrderStatus(order.id, newStatus);
      setOrder(updatedOrder);
      toast.success(t('orderDetails.statusUpdated'));
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToUpdate'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order) return;

    setIsConfirmingPayment(true);
    try {
      await ordersApi.confirmPayment(order.id);
      // Reload order to get updated status and payment
      await loadOrder();
      toast.success(t('orderDetails.paymentConfirmed'));
      setIsConfirmPaymentOpen(false);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToUpdate'));
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleCopyReferenceCode = () => {
    if (order) {
      navigator.clipboard.writeText(order.referenceCode);
      toast.info(t('orderDetails.referenceCodeCopied'));
    }
  };

  const handlePrintTicket = () => {
    window.print();
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

  if (!order) {
    return null;
  }

  const nextStatus = getNextStatus(order.status);
  const canConfirmPayment = order.status === 'READY' && order.payment.status === 'INITIATED';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 no-print">
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
                  <span className="sm:hidden">{t('orders.order')}</span>
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">{t('orderDetails.title')}</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/orders')}>
                <span className="hidden sm:inline">{t('orders.backToOrders')}</span>
                <span className="sm:hidden">{t('common.back')}</span>
              </Button>
              <UserDropdown
                userName={user?.name || 'User'}
                userRole={user?.role || 'SUPERVISOR'}
                pressingName={user?.pressingName}
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
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {order.referenceCode}
                </h2>
                <StatusBadge status={order.status} type="order" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 no-print">
                <Button variant="secondary" onClick={handleCopyReferenceCode} className="w-full sm:w-auto">
                  {t('orderDetails.copyCode')}
                </Button>
                <Button variant="secondary" onClick={handlePrintTicket} className="w-full sm:w-auto">
                  {t('orderDetails.printTicket')}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Client Information */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('orderDetails.clientInformation')}</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">{t('orderDetails.name')}</p>
                  <p className="text-gray-900 font-medium">{order.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('orderDetails.pressing')}</p>
                  <p className="text-gray-900">{order.pressingName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('orderDetails.orderCreated')}</p>
                  <p className="text-gray-900">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('orderDetails.paymentInformation')}</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">{t('orderDetails.paymentAmount')}</p>
                  <p className="text-gray-900 font-medium text-xl">${order.payment.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('orderDetails.paymentMethod')}</p>
                  <p className="text-gray-900">{order.payment.method === 'CASH' ? t('orderCreate.cash') : t('orderCreate.wallet')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('orderDetails.paymentStatus')}</p>
                  <StatusBadge status={order.payment.status} type="payment" />
                </div>
                {order.payment.paidAt && (
                  <div>
                    <p className="text-sm text-gray-600">{t('orderDetails.paidAt')}</p>
                    <p className="text-gray-900">{new Date(order.payment.paidAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('orderDetails.orderItems')}</h3>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('orderDetails.item')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('orderDetails.quantity')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ×{item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div className="sm:hidden space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">{item.label}</span>
                  <span className="text-sm text-gray-600">×{item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 text-right">
              <p className="text-sm text-gray-600">
                {t('orderDetails.total')}: {order.items.reduce((sum, item) => sum + item.quantity, 0)} {t('orders.items')}
              </p>
            </div>
          </div>

          {/* Status Management */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mt-4 sm:mt-6 no-print">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('orderDetails.statusManagement')}</h3>

            {/* Status Timeline */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                {(['CREATED', 'IN_PROGRESS', 'READY', 'DELIVERED'] as const).map((status, index) => (
                  <div key={status} className="flex items-center">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-xs sm:text-base ${
                        order.status === status
                          ? 'bg-blue-600 text-white'
                          : index < ['CREATED', 'IN_PROGRESS', 'READY', 'DELIVERED'].indexOf(order.status)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {index < ['CREATED', 'IN_PROGRESS', 'READY', 'DELIVERED'].indexOf(order.status) ? '✓' : index + 1}
                    </div>
                    {index < 3 && (
                      <div
                        className={`w-6 sm:w-16 h-1 mx-1 sm:mx-2 ${
                          index < ['CREATED', 'IN_PROGRESS', 'READY', 'DELIVERED'].indexOf(order.status)
                            ? 'bg-green-600'
                            : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <span className="hidden sm:inline">{t('status.order.CREATED')}</span>
                <span className="sm:hidden">{t('orders.new')}</span>
                <span className="hidden sm:inline">{t('status.order.IN_PROGRESS')}</span>
                <span className="sm:hidden">{t('orders.progress')}</span>
                <span>{t('status.order.READY')}</span>
                <span className="hidden sm:inline">{t('status.order.DELIVERED')}</span>
                <span className="sm:hidden">{t('orders.done')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {nextStatus && (
                <Button
                  onClick={() => handleUpdateStatus(nextStatus)}
                  isLoading={isUpdatingStatus}
                  className="w-full"
                >
                  {t('orderDetails.markAs')} {t(`status.order.${nextStatus}`)}
                </Button>
              )}

              {canConfirmPayment && (
                <Button
                  variant="success"
                  onClick={() => setIsConfirmPaymentOpen(true)}
                  className="w-full"
                >
                  {t('orderDetails.confirmPayment')}
                </Button>
              )}

              {order.status === 'DELIVERED' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium text-center">
                    {t('orderDetails.orderCompleted')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Confirm Payment Dialog */}
      <ConfirmDialog
        isOpen={isConfirmPaymentOpen}
        onClose={() => setIsConfirmPaymentOpen(false)}
        onConfirm={handleConfirmPayment}
        title={t('orderDetails.confirmPaymentTitle')}
        message={t('orderDetails.confirmPaymentMessage', {
          amount: order.payment.amount.toFixed(2),
          method: order.payment.method === 'CASH' ? t('orderCreate.cash') : t('orderCreate.wallet')
        })}
        confirmText={t('orderDetails.confirmPaymentButton')}
        confirmVariant="success"
        isLoading={isConfirmingPayment}
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
};
