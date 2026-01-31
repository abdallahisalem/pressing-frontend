import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '../utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { clientsApi } from '../api/clients';
import { ordersApi } from '../api/orders';
import { pressingItemsApi } from '../api/pressingItems';
import { pressingsApi } from '../api/pressings';
import { Button, Input, Modal, UserDropdown, ConfirmDialog } from '../components';
import type { Client, CreateOrderRequest, Order, OrderItemInput, PressingItem } from '../types';
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

  // Multi-step state (now 3 steps: Client, Items, Review)
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [items, setItems] = useState<OrderItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client selection
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  // Predefined items catalog
  const [pressingItems, setPressingItems] = useState<PressingItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  // Custom item form
  const [customItemLabel, setCustomItemLabel] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<number>(0);
  const [customItemQuantity, setCustomItemQuantity] = useState<number>(1);

  // Quick client creation
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Min order amount
  const [minOrderAmount, setMinOrderAmount] = useState<number | null>(null);

  // Success modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const { register: registerQuickClient, handleSubmit: handleQuickClientSubmit, reset: resetQuickClient, formState: { errors: quickClientErrors } } = useForm<QuickClientFormData>({
    resolver: zodResolver(quickClientSchema),
  });

  useEffect(() => {
    loadClients();
    loadPressingItems();
    loadMinOrderAmount();
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
      const data = await clientsApi.getClientsByPressing();
      setClients(data);
      setFilteredClients(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToLoad'));
    } finally {
      setIsLoadingClients(false);
    }
  };

  const loadPressingItems = async () => {
    if (!user) return;

    try {
      // Use JWT-based endpoint - pressingId is extracted from token
      const data = await pressingItemsApi.getItems();
      setPressingItems(data);
    } catch (error) {
      // Silent fail - predefined items may not exist
      console.error('Failed to load pressing items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const loadMinOrderAmount = async () => {
    if (!user?.pressingId) return;
    try {
      const pressing = await pressingsApi.getPressing(user.pressingId);
      setMinOrderAmount(pressing.minOrderAmount);
    } catch {
      // Non-critical — proceed without min amount enforcement
    }
  };

  const handleCreateQuickClient = async (data: QuickClientFormData) => {
    if (!user) return;

    setIsCreatingClient(true);
    try {
      const newClient = await clientsApi.createClient({
        fullName: data.fullName,
        phone: data.phone
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

  // Add predefined item to order
  const handleAddPredefinedItem = (item: PressingItem) => {
    const existingIndex = items.findIndex((i) => i.label === item.label && i.price === item.price);
    if (existingIndex !== -1) {
      // Increase quantity
      const newItems = [...items];
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newItems[existingIndex].quantity + 1,
      };
      setItems(newItems);
    } else {
      // Add new item
      setItems([...items, { label: item.label, quantity: 1, price: item.price }]);
    }
  };

  // Add custom item to order
  const handleAddCustomItem = () => {
    if (!customItemLabel.trim() || customItemPrice <= 0) {
      toast.error(t('orderCreate.customItemError'));
      return;
    }

    const existingIndex = items.findIndex((i) => i.label === customItemLabel && i.price === customItemPrice);
    if (existingIndex !== -1) {
      const newItems = [...items];
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newItems[existingIndex].quantity + customItemQuantity,
      };
      setItems(newItems);
    } else {
      setItems([...items, { label: customItemLabel, quantity: customItemQuantity, price: customItemPrice }]);
    }

    // Reset custom item form
    setCustomItemLabel('');
    setCustomItemPrice(0);
    setCustomItemQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], quantity };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const canProceedToStep2 = () => {
    return selectedClient !== null;
  };

  const canProceedToStep3 = () => {
    return items.length > 0 && items.every((item) => item.label.trim() !== '' && item.quantity > 0 && item.price > 0);
  };

  const isBelowMinimum = minOrderAmount != null && minOrderAmount > 0 && calculateTotal() < minOrderAmount;

  const handleCreateOrder = async () => {
    if (!selectedClient || !user) return;

    setIsSubmitting(true);
    try {
      // pressingId is automatically taken from JWT - don't send it
      const orderData: CreateOrderRequest = {
        clientId: selectedClient.id,
        items: items,
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
    setItems([]);
    setCreatedOrder(null);
    setCustomItemLabel('');
    setCustomItemPrice(0);
    setCustomItemQuantity(1);
  };
  const steps = [
    { id: 1, label: t('orderCreate.step1'), short: t('orderCreate.step1Short') },
    { id: 2, label: t('orderCreate.step2'), short: t('orderCreate.step2Short') },
    { id: 3, label: t('orderCreate.step3Review'), short: t('orderCreate.step3ReviewShort') },
  ];
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
              <img src="/img/logo.png" alt="Logo" className="h-10 w-10" />
              <div className="text-start">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">
                  <span className="hidden sm:inline">{t('dashboard.title')}</span>
                  <span className="sm:hidden">{t('orders.newOrder')}</span>
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">{t('orderCreate.title')}</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/orders')}>
                {t('common.cancel')}
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
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Step Indicator - Now 3 steps */}
          <div className="mb-8 w-full max-w-lg mx-auto">
            {/* Step Circles & Lines */}
            <div className="flex items-center justify-between mb-3">
              {steps.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center relative">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base transition-colors duration-300 ${currentStep >= step.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                        }`}
                    >
                      {currentStep > step.id ? '✓' : step.id}
                    </div>
                  </div>

                  {/* Connecting Line */}
                  {idx !== steps.length - 1 && (
                    <div className="flex-1 h-1 mx-2 bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: currentStep > step.id ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Labels */}
            <div className="flex justify-between px-1">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`text-xs sm:text-sm font-medium transition-colors ${currentStep >= step.id ? 'text-blue-700' : 'text-gray-400'
                    }`}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.short}</span>
                </div>
              ))}
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

            {/* Step 2: Add Items with Prices */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{t('orderCreate.orderItems')}</h2>

                {/* Predefined Items Grid */}
                {!isLoadingItems && pressingItems.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">{t('orderCreate.availableItems')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {pressingItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleAddPredefinedItem(item)}
                          className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                        >
                          <p className="font-medium text-gray-900 text-sm truncate">{item.label}</p>
                          <p className="text-blue-600 font-bold text-sm">{item.price.toFixed(2)} MRU</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Item Form */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">{t('orderCreate.customItem')}</h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder={t('orderCreate.customItemLabelPlaceholder')}
                      value={customItemLabel}
                      onChange={(e) => setCustomItemLabel(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={t('orderCreate.pricePlaceholder')}
                        min="0"
                        step="0.01"
                        value={customItemPrice || ''}
                        onChange={(e) => setCustomItemPrice(parseFloat(e.target.value) || 0)}
                        className="w-24 sm:w-28"
                      />
                      <Input
                        type="number"
                        placeholder={t('orderCreate.qtyPlaceholder')}
                        min="1"
                        value={customItemQuantity}
                        onChange={(e) => setCustomItemQuantity(parseInt(e.target.value) || 1)}
                        className="w-16 sm:w-20"
                      />
                      <Button onClick={handleAddCustomItem} size="sm">
                        {t('orderCreate.add')}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Selected Items List */}
                {items.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">{t('orderCreate.selectedItems')}</h3>
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.label}</p>
                            <p className="text-sm text-gray-600">{item.price.toFixed(2)} MRU x {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-blue-600">
                              {(item.price * item.quantity).toFixed(2)} MRU
                            </p>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateItemQuantity(index, item.quantity - 1)}
                                className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                disabled={item.quantity <= 1}
                              >
                                -
                              </button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateItemQuantity(index, item.quantity + 1)}
                                className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800 ml-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">{t('orderCreate.totalAmount')}:</span>
                        <span className="text-xl font-bold text-blue-600">{calculateTotal().toFixed(2)} MRU</span>
                      </div>
                    </div>

                    {isBelowMinimum && (
                      <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                          {t('orderCreate.belowMinOrderAmount', { total: calculateTotal().toFixed(2), min: minOrderAmount!.toFixed(2) })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

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

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">{t('orderCreate.reviewOrder')}</h2>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('orderCreate.clientInfo')}</h3>
                  <p className="text-gray-700">{selectedClient?.fullName}</p>
                  <p className="text-sm text-gray-600">{selectedClient?.phone || t('orderCreate.noPhone')}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('orderCreate.itemsList')}</h3>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex justify-between text-gray-700">
                        <span>{item.label} x {item.quantity}</span>
                        <span className="font-medium">{(item.price * item.quantity).toFixed(2)} MRU</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-3 pt-3">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-900">{t('orderCreate.totalAmount')}:</span>
                      <span className="font-bold text-blue-600">{calculateTotal().toFixed(2)} MRU</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    {t('orderCreate.paymentAtDeliveryNote')}
                  </p>
                </div>

                {isBelowMinimum && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      {t('orderCreate.belowMinOrderAmount', { total: calculateTotal().toFixed(2), min: minOrderAmount!.toFixed(2) })}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between gap-2 pt-4">
                  <Button variant="secondary" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">
                    {t('common.back')}
                  </Button>
                  <Button onClick={handleCreateOrder} isLoading={isSubmitting} disabled={isBelowMinimum} className="w-full sm:w-auto">
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
            <p className="text-lg font-semibold text-gray-900 mb-2">
              {t('orderCreate.totalAmount')}: {createdOrder?.totalAmount?.toFixed(2) || calculateTotal().toFixed(2)} MRU
            </p>
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
