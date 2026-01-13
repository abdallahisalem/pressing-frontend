import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { clientsApi } from '../api/clients';
import { ordersApi } from '../api/orders';
import { Button, Input, Modal, LanguageSwitcher } from '../components';
import type { Client, CreateOrderRequest, Order, OrderItemInput, PaymentMethod } from '../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

// Quick client creation schema
const quickClientSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
});

type QuickClientFormData = z.infer<typeof quickClientSchema>;

export const OrderCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [items, setItems] = useState<OrderItemInput[]>([{ label: '', quantity: 1 }]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client selection
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  // Quick client creation
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Success modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const { register: registerQuickClient, handleSubmit: handleQuickClientSubmit, reset: resetQuickClient, formState: { errors: quickClientErrors } } = useForm<QuickClientFormData>({
    resolver: zodResolver(quickClientSchema),
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (clientSearch) {
      const filtered = clients.filter((client) =>
        client.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
        client.phone?.toLowerCase().includes(clientSearch.toLowerCase())
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [clientSearch, clients]);

  const loadClients = async () => {
    if (!user) return;

    try {
      const pressingId = user.role === 'SUPERVISOR' ? user.pressingId : 1;
      const data = await clientsApi.getClientsByPressing(pressingId);
      setClients(data);
      setFilteredClients(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToLoad'));
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleCreateQuickClient = async (data: QuickClientFormData) => {
    if (!user) return;

    setIsCreatingClient(true);
    try {
      const newClient = await clientsApi.createClient({
        fullName: data.fullName,
        phone: data.phone,
        pressingId: user.role === 'SUPERVISOR' ? user.pressingId : 1,
      });
      setClients([...clients, newClient]);
      setSelectedClient(newClient);
      toast.success(t('clients.clientCreated'));
      setIsQuickClientModalOpen(false);
      resetQuickClient();
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToCreate'));
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { label: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItemInput, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const canProceedToStep2 = () => {
    return selectedClient !== null;
  };

  const canProceedToStep3 = () => {
    return items.every((item) => item.label.trim() !== '' && item.quantity > 0);
  };

  const canProceedToStep4 = () => {
    return paymentAmount > 0;
  };

  const handleCreateOrder = async () => {
    if (!selectedClient || !user) return;

    setIsSubmitting(true);
    try {
      const orderData: CreateOrderRequest = {
        clientId: selectedClient.id,
        pressingId: user.role === 'SUPERVISOR' ? user.pressingId : 1,
        items: items,
        paymentAmount: paymentAmount,
        paymentMethod: paymentMethod,
      };

      const newOrder = await ordersApi.createOrder(orderData);
      setCreatedOrder(newOrder);
      setIsSuccessModalOpen(true);
      toast.success(t('orderCreate.orderCreated'));
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyReferenceCode = () => {
    if (createdOrder) {
      navigator.clipboard.writeText(createdOrder.referenceCode);
      toast.info(t('orderDetails.referenceCodeCopied'));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedClient(null);
    setItems([{ label: '', quantity: 1 }]);
    setPaymentAmount(0);
    setPaymentMethod('CASH');
    setCreatedOrder(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-base sm:text-xl font-bold text-gray-900">
                <span className="hidden sm:inline">{t('orderCreate.title')}</span>
                <span className="sm:hidden">{t('orders.newOrder')}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/orders')}>
                {t('common.cancel')}
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
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base ${
                      currentStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`w-8 sm:w-16 h-1 mx-1 sm:mx-2 ${
                        currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs sm:text-sm">
              <span className="hidden sm:inline">{t('orderCreate.step1')}</span>
              <span className="sm:hidden">{t('orderCreate.step1Short')}</span>
              <span className="hidden sm:inline">{t('orderCreate.step2')}</span>
              <span className="sm:hidden">{t('orderCreate.step2Short')}</span>
              <span className="hidden sm:inline">{t('orderCreate.step3')}</span>
              <span className="sm:hidden">{t('orderCreate.step3Short')}</span>
              <span className="hidden sm:inline">{t('orderCreate.step4')}</span>
              <span className="sm:hidden">{t('orderCreate.step4Short')}</span>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg shadow p-6">
            {/* Step 1: Select Client */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">{t('orderCreate.selectClient')}</h2>

                {selectedClient ? (
                  <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{selectedClient.fullName}</p>
                        <p className="text-sm text-gray-600">{selectedClient.phone || t('orderCreate.noPhone')}</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => setSelectedClient(null)}>
                        {t('orderCreate.change')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <Input
                        type="text"
                        placeholder={t('orderCreate.searchClients')}
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                      />
                    </div>

                    {isLoadingClients ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto border rounded-lg">
                        {filteredClients.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => setSelectedClient(client)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          >
                            <p className="font-medium text-gray-900">{client.fullName}</p>
                            <p className="text-sm text-gray-600">{client.phone || t('orderCreate.noPhone')}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4">
                      <Button
                        variant="secondary"
                        onClick={() => setIsQuickClientModalOpen(true)}
                        className="w-full"
                      >
                        {t('orderCreate.createNewClient')}
                      </Button>
                    </div>
                  </>
                )}

                <div className="flex justify-end pt-4">
                  <Button onClick={() => setCurrentStep(2)} disabled={!canProceedToStep2()} className="w-full sm:w-auto">
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Add Items */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">{t('orderCreate.orderItems')}</h2>

                {items.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 sm:p-0 border sm:border-0 rounded-lg sm:rounded-none">
                    <Input
                      label={index === 0 ? t('orderCreate.itemLabel') : ''}
                      placeholder={t('orderCreate.itemPlaceholder')}
                      value={item.label}
                      onChange={(e) => handleItemChange(index, 'label', e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1 sm:w-32">
                        <Input
                          type="number"
                          label={index === 0 ? t('orderCreate.quantity') : ''}
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      {items.length > 1 && (
                        <div className={index === 0 ? 'sm:mt-6' : ''}>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="whitespace-nowrap"
                          >
                            {t('orderCreate.remove')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <Button variant="secondary" onClick={handleAddItem} className="w-full">
                  {t('orderCreate.addAnotherItem')}
                </Button>

                <div className="flex flex-col sm:flex-row justify-between gap-2 pt-4">
                  <Button variant="secondary" onClick={() => setCurrentStep(1)} className="w-full sm:w-auto">
                    {t('common.back')}
                  </Button>
                  <Button onClick={() => setCurrentStep(3)} disabled={!canProceedToStep3()} className="w-full sm:w-auto">
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">{t('orderCreate.paymentInfo')}</h2>

                <Input
                  type="number"
                  label={t('orderCreate.paymentAmount')}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('orderCreate.paymentMethod')}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="CASH"
                        checked={paymentMethod === 'CASH'}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span>{t('orderCreate.cash')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="WALLET"
                        checked={paymentMethod === 'WALLET'}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span>{t('orderCreate.wallet')}</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-2 pt-4">
                  <Button variant="secondary" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">
                    {t('common.back')}
                  </Button>
                  <Button onClick={() => setCurrentStep(4)} disabled={!canProceedToStep4()} className="w-full sm:w-auto">
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">{t('orderCreate.reviewOrder')}</h2>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('orderCreate.clientInfo')}</h3>
                  <p className="text-gray-700">{selectedClient?.fullName}</p>
                  <p className="text-sm text-gray-600">{selectedClient?.phone || t('orderCreate.noPhone')}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('orderCreate.itemsList')}</h3>
                  <ul className="space-y-1">
                    {items.map((item, index) => (
                      <li key={index} className="text-gray-700">
                        {item.label} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('orderCreate.paymentDetails')}</h3>
                  <p className="text-gray-700">{t('orderDetails.paymentAmount')}: ${paymentAmount.toFixed(2)}</p>
                  <p className="text-gray-700">{t('orderCreate.method')}: {paymentMethod === 'CASH' ? t('orderCreate.cash') : t('orderCreate.wallet')}</p>
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-2 pt-4">
                  <Button variant="secondary" onClick={() => setCurrentStep(3)} className="w-full sm:w-auto">
                    {t('common.back')}
                  </Button>
                  <Button onClick={handleCreateOrder} isLoading={isSubmitting} className="w-full sm:w-auto">
                    {t('orders.createOrder')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Quick Client Creation Modal */}
      <Modal
        isOpen={isQuickClientModalOpen}
        onClose={() => setIsQuickClientModalOpen(false)}
        title={t('clients.createClient')}
        size="md"
      >
        <form onSubmit={handleQuickClientSubmit(handleCreateQuickClient)} className="space-y-4">
          <Input
            {...registerQuickClient('fullName')}
            label={t('clients.fullName')}
            placeholder={t('clients.fullNamePlaceholder')}
            error={quickClientErrors.fullName?.message}
          />

          <Input
            {...registerQuickClient('phone')}
            label={t('clients.phoneOptional')}
            placeholder={t('clients.phonePlaceholder')}
            error={quickClientErrors.phone?.message}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsQuickClientModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={isCreatingClient}>
              {t('clients.createClient')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          navigate('/orders');
        }}
        title={t('orderCreate.orderCreated')}
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-600 mb-4">{t('orders.referenceCode')}:</p>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <code className="text-2xl font-bold text-blue-600">
                {createdOrder?.referenceCode}
              </code>
            </div>
            <Button variant="secondary" onClick={handleCopyReferenceCode} className="mb-4">
              {t('orderCreate.copyReferenceCode')}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate(`/orders/${createdOrder?.id}`)}
            >
              {t('orderCreate.viewOrderDetails')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsSuccessModalOpen(false);
                resetForm();
              }}
            >
              {t('orderCreate.createAnotherOrder')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsSuccessModalOpen(false);
                navigate('/orders');
              }}
            >
              {t('orderCreate.goToOrdersList')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
