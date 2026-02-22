import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, formatDate } from '../utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ordersApi } from '../api/orders';
import { Button, StatusBadge, ConfirmDialog, UserDropdown } from '../components';
import type { Order, OrderStatus, PaymentMethod, StatusHistoryEntry } from '../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

// All order statuses in workflow order
const ALL_STATUSES: OrderStatus[] = [
  'CREATED',
  'COLLECTED',
  'RECEIVED_AT_PLANT',
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
      // RECEIVED_AT_PLANT → DISPATCHED (send back to pressing)
      if (currentStatus === 'COLLECTED') return 'RECEIVED_AT_PLANT';
      if (currentStatus === 'RECEIVED_AT_PLANT') return 'DISPATCHED';
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
  const isInternalStaff = user?.role !== 'PLANT_OPERATOR';
  return (
    
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img src="/img/logo.png" alt="Logo" className="h-10 w-10" />
              <div className="text-start">
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


      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 1. Header & Quick Actions */}
        <header className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {order.referenceCode}
                </h2>
                <StatusBadge status={order.status} type="order" />
              </div>
              <p className="text-sm text-gray-500">
                {t('orderDetails.orderCreated')}: {formatDate(order.createdAt)}
              </p>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto no-print">
              <Button variant="secondary" onClick={handleCopyReferenceCode} className="flex-1 md:flex-none">
                {t('orderDetails.copyCode')}
              </Button>
              <Button variant="primary" onClick={handlePrintTicket} className="flex-1 md:flex-none">
                {t('orderDetails.printTicket')}
              </Button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 2. Information Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Card */}
              <InfoCard title={t('orderDetails.clientInformation')}>
                <DataField label={t('orderDetails.name')} value={order.clientName} bold />
                <DataField label={t('clients.phone')} value={order.clientPhone} />
                <DataField label={t('orderDetails.pressing')} value={order.pressingName} />
                {order.plantName && <DataField label={t('orderDetails.plant')} value={order.plantName} />}
              </InfoCard>

              {/* Payment Card (Conditional) */}
              {isInternalStaff && (
                <InfoCard title={t('orderDetails.paymentInformation')}>
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">{t('orderDetails.totalAmount')}</p>
                    <p className="text-2xl font-bold text-blue-600">{order.totalAmount?.toFixed(2)} MRU</p>
                  </div>
                  {order.payment ? (
                    <div className="space-y-3 border-t pt-3">
                      <DataField label={t('orderDetails.paymentMethod')} value={getPaymentMethodLabel(order.payment.method)} />
                      <StatusBadge status={order.payment.status} type="payment" />
                    </div>
                  ) : (
                    <div className="mt-2 p-2 bg-yellow-50 text-yellow-700 text-xs rounded-md border border-yellow-100">
                      {t('orderDetails.pendingPayment')}
                    </div>
                  )}
                </InfoCard>
              )}
            </div>

            {/* 3. Items Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="p-6 border-b border-gray-50">
                <h3 className="font-semibold text-gray-900">{t('orderDetails.orderItems')}</h3>
              </div>
              <OrderItemsTable items={order.items} showPricing={isInternalStaff} />
              
              <div className="p-6 bg-gray-50 flex justify-between items-center">
                <span className="text-gray-600">
                   {order.items.reduce((sum, i) => sum + i.quantity, 0)} {t('orders.items')}
                </span>
                {isInternalStaff && (
                  <span className="text-xl font-bold text-gray-900">
                    {order.totalAmount?.toFixed(2)} MRU
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Sidebar: Status & Timeline */}
          <aside className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 no-print">
              <h3 className="font-semibold text-gray-900 mb-6">{t('orderDetails.statusManagement')}</h3>
              
              {/* Compact Status Progress */}
              <div className="space-y-4 mb-8">
                 <StatusStepper
                    currentStatus={order.status}
                    allStatuses={ALL_STATUSES}
                    currentIndex={currentStatusIndex}
                    statusHistory={order.statusHistory}
                 />
              </div>

              <div className="space-y-3">
                {nextStatus && (
                  <Button onClick={() => handleUpdateStatus(nextStatus)} isLoading={isUpdatingStatus} className="w-full py-6">
                    {t('orderDetails.markAs')} {t(`status.order.${nextStatus}`)}
                  </Button>
                )}
                {canRecordPayment && (
                  <Button variant="success" onClick={() => setIsPaymentModalOpen(true)} className="w-full">
                    {t('orderDetails.recordPayment')}
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

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
                <div className={`p-3 rounded ${['RECEIVED_AT_PLANT'].includes(order.status) ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  <p className="text-xs text-gray-500 uppercase">{t('orderDetails.atPlant')}</p>
                  <p className="font-medium">{order.plantName || '-'}</p>
                </div>
              </div>
            </div>
      {/* Main Content */}
 
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


// Helper Sub-Component to keep things clean
const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-full">
    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const DataField = ({ label, value, bold }: { label: string; value: string | undefined; bold?: boolean }) => (
  <div>
    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
    <p className={`text-gray-900 ${bold ? 'font-semibold' : ''}`}>{value || '-'}</p>
  </div>
);
const StatusStepper = ({ currentStatus, allStatuses, currentIndex, statusHistory }: { currentStatus: OrderStatus; allStatuses: OrderStatus[]; currentIndex: number; statusHistory?: StatusHistoryEntry[] }) => {
    const { t, i18n } = useTranslation();

  // Build a map from status -> history entry for quick lookup
  const historyMap = new Map<string, StatusHistoryEntry>();
  if (statusHistory) {
    for (const entry of statusHistory) {
      historyMap.set(entry.status, entry);
    }
  }

  const formatStepDate = (dateString: string): string => {
    const date = new Date(dateString);
    const locale = i18n.language === 'ar' ? 'ar-SA-u-nu-arab' : 'en-US';
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col space-y-1">
      {allStatuses.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isActive = currentStatus === status;
        const historyEntry = historyMap.get(status);

        return (
          <div key={status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border-2 ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-50'
                    : isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              {/* Connector Line */}
              {index !== allStatuses.length - 1 && (
                <div className={`w-0.5 h-6 mt-1 ${isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-200' : 'bg-gray-200'}`} />
              )}
            </div>

            <div className="flex flex-col pb-2">
              <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                {t(`status.order.${status}`)}
              </span>
              {(isCompleted || isActive) && historyEntry && (
                <span className="text-[11px] text-gray-400">
                  {historyEntry.changedByUserName} &bull; {formatStepDate(historyEntry.changedAt)}
                </span>
              )}
              {isActive && !historyEntry && (
                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">
                  {t('common.currentStep')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
const OrderItemsTable = ({ items, showPricing }: { items: Order['items']; showPricing: boolean }) => {
  const { t } = useTranslation();
  return (
    <>
      {/* Desktop View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orderDetails.item')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orderDetails.quantity')}</th>
              {showPricing && (
                <>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orderDetails.unitPrice')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('orderDetails.subtotal')}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.label}</td>
                <td className="px-6 py-4 text-sm text-gray-600">x{item.quantity}</td>
                {showPricing && (
                  <>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.price?.toFixed(2)} MRU</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {((item.price || 0) * item.quantity).toFixed(2)} MRU
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="sm:hidden divide-y divide-gray-100">
        {items.map((item) => (
          <div key={item.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{t('orderDetails.quantity')}: {item.quantity}</p>
            </div>
            {showPricing && (
              <p className="text-sm font-bold text-blue-600">
                {((item.price || 0) * item.quantity).toFixed(2)} MRU
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
};