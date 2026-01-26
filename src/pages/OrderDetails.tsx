import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ordersApi } from '../api/orders';
import { Button, StatusBadge, ConfirmDialog, UserDropdown, StatusTimeline } from '../components';
import type { Order, OrderStatus, PaymentMethod } from '../types';
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

// Payment methods available for recording
const PAYMENT_METHODS: { value: PaymentMethod; labelKey: string }[] = [
  { value: 'CASH', labelKey: 'paymentMethods.cash' },
  { value: 'BANKILY', labelKey: 'paymentMethods.bankily' },
  { value: 'MASRIVI', labelKey: 'paymentMethods.masrivi' },
  { value: 'SEDAD', labelKey: 'paymentMethods.sedad' },
  { value: 'AMANTY', labelKey: 'paymentMethods.amanty' },
  { value: 'BIMBANK', labelKey: 'paymentMethods.bimbank' },
  { value: 'CLICK', labelKey: 'paymentMethods.click' },
  { value: 'AUTRES', labelKey: 'paymentMethods.autres' },
];

export const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Payment recording state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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
    if (!user) return null;

    // Role-based status transitions - only allows moving to the NEXT status
    if (user.role === 'ADMIN') {
      const idx = ALL_STATUSES.indexOf(currentStatus);
      return idx < ALL_STATUSES.length - 1 ? ALL_STATUSES[idx + 1] : null;
    }

    if (user.role === 'SUPERVISOR') {
      // SUPERVISOR transitions at pressing:
      // CREATED → COLLECTED (hand off to driver)
      // DISPATCHED → READY (received back from plant)
      // READY → DELIVERED (given to client)
      if (currentStatus === 'CREATED') return 'COLLECTED';
      if (currentStatus === 'DISPATCHED') return 'READY';
      if (currentStatus === 'READY') return 'DELIVERED';
      return null;
    }

    if (user.role === 'PLANT_OPERATOR') {
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

  const handleRecordPayment = async () => {
    if (!order || !selectedPaymentMethod) return;

    setIsRecordingPayment(true);
    try {
      await ordersApi.recordPayment({
        orderId: order.id,
        paymentMethod: selectedPaymentMethod,
      });
      // Reload order to get updated payment
      await loadOrder();
      toast.success(t('orderDetails.paymentRecorded'));
      setIsPaymentModalOpen(false);
      setSelectedPaymentMethod(null);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToUpdate'));
    } finally {
      setIsRecordingPayment(false);
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

  const getStatusIndex = (status: OrderStatus): number => {
    return ALL_STATUSES.indexOf(status);
  };

  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    const found = PAYMENT_METHODS.find((m) => m.value === method);
    return found ? t(found.labelKey) : method;
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
  // Can record payment when order is DELIVERED and no payment exists
  const canRecordPayment = user?.role !== 'PLANT_OPERATOR' &&
    order.status === 'DELIVERED' &&
    !order.payment;
  const currentStatusIndex = getStatusIndex(order.status);

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
              <img src="/img/logo.png" alt="Logo" className="h-10 w-10" />
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
                {order.plantName && (
                  <div>
                    <p className="text-sm text-gray-600">{t('orderDetails.plant')}</p>
                    <p className="text-gray-900">{order.plantName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">{t('orderDetails.orderCreated')}</p>
                  <p className="text-gray-900">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Payment Information - Hidden for PLANT_OPERATOR */}
            {user?.role !== 'PLANT_OPERATOR' && (
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('orderDetails.paymentInformation')}</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">{t('orderDetails.totalAmount')}</p>
                    <p className="text-gray-900 font-medium text-xl">{order.totalAmount?.toFixed(2) || '0.00'} MRU</p>
                  </div>
                  {order.payment ? (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">{t('orderDetails.paymentMethod')}</p>
                        <p className="text-gray-900">{getPaymentMethodLabel(order.payment.method)}</p>
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
                    </>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600">{t('orderDetails.paymentStatus')}</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {t('orderDetails.pendingPayment')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                    {user?.role !== 'PLANT_OPERATOR' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('orderDetails.unitPrice')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('orderDetails.subtotal')}
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        x{item.quantity}
                      </td>
                      {user?.role !== 'PLANT_OPERATOR' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.price?.toFixed(2) || '0.00'} MRU
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {((item.price || 0) * item.quantity).toFixed(2)} MRU
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div className="sm:hidden space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{item.label}</span>
                    <span className="text-sm text-gray-600 ml-2">x{item.quantity}</span>
                  </div>
                  {user?.role !== 'PLANT_OPERATOR' && (
                    <span className="text-sm font-medium text-blue-600">
                      {((item.price || 0) * item.quantity).toFixed(2)} MRU
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {t('orderDetails.total')}: {order.items.reduce((sum, item) => sum + item.quantity, 0)} {t('orders.items')}
                </p>
                {user?.role !== 'PLANT_OPERATOR' && (
                  <p className="text-lg font-bold text-blue-600">
                    {order.totalAmount?.toFixed(2) || '0.00'} MRU
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status History Timeline */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 mt-4 sm:mt-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                {t('orderDetails.statusHistory')}
              </h3>
              <StatusTimeline history={order.statusHistory} />
            </div>
          )}

          {/* Status Management */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mt-4 sm:mt-6 no-print">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('orderDetails.statusManagement')}</h3>

            {/* Status Timeline - 8 stages */}
            <div className="mb-6 overflow-x-auto">
              <div className="flex items-center justify-between min-w-[600px] px-2">
                {ALL_STATUSES.map((status, index) => (
                  <div key={status} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs ${
                          order.status === status
                            ? 'bg-blue-600 text-white'
                            : index < currentStatusIndex
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {index < currentStatusIndex ? '\u2713' : index + 1}
                      </div>
                      <span className="text-xs mt-1 text-center max-w-[60px] leading-tight">
                        {t(`status.order.${status}`)}
                      </span>
                    </div>
                    {index < ALL_STATUSES.length - 1 && (
                      <div
                        className={`w-8 h-1 mx-1 ${
                          index < currentStatusIndex
                            ? 'bg-green-600'
                            : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow Location Indicator */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className={`p-3 rounded ${['CREATED', 'COLLECTED', 'READY', 'DELIVERED'].includes(order.status) ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <p className="text-xs text-gray-500 uppercase">{t('orderDetails.atPressing')}</p>
                  <p className="font-medium">{order.pressingName}</p>
                </div>
                <div className={`p-3 rounded ${['COLLECTED', 'DISPATCHED'].includes(order.status) ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  <p className="text-xs text-gray-500 uppercase">{t('orderDetails.inTransit')}</p>
                  <p className="font-medium">{['COLLECTED', 'DISPATCHED'].includes(order.status) ? t('orderDetails.onTheWay') : '-'}</p>
                </div>
                <div className={`p-3 rounded ${['RECEIVED_AT_PLANT', 'PROCESSING', 'PROCESSED'].includes(order.status) ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  <p className="text-xs text-gray-500 uppercase">{t('orderDetails.atPlant')}</p>
                  <p className="font-medium">{order.plantName || '-'}</p>
                </div>
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

              {canRecordPayment && (
                <Button
                  variant="success"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full"
                >
                  {t('orderDetails.recordPayment')}
                </Button>
              )}

              {order.status === 'DELIVERED' && order.payment && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium text-center">
                    {t('orderDetails.orderCompleted')}
                  </p>
                </div>
              )}

              {order.status === 'DELIVERED' && !order.payment && user?.role !== 'PLANT_OPERATOR' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium text-center">
                    {t('orderDetails.awaitingPayment')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsPaymentModalOpen(false)} />
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('orderDetails.recordPaymentTitle')}
              </h3>

              <div className="mb-4">
                <p className="text-gray-600 mb-2">{t('orderDetails.paymentAmount')}:</p>
                <p className="text-2xl font-bold text-blue-600">{order.totalAmount?.toFixed(2) || '0.00'} MRU</p>
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">{t('orderDetails.selectPaymentMethod')}:</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setSelectedPaymentMethod(method.value)}
                      className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                        selectedPaymentMethod === method.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {t(method.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedPaymentMethod(null);
                  }}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="success"
                  onClick={handleRecordPayment}
                  isLoading={isRecordingPayment}
                  disabled={!selectedPaymentMethod}
                  className="flex-1"
                >
                  {t('orderDetails.confirmPaymentButton')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
