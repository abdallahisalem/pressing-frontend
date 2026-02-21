import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast, formatDate } from '../utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { pressingItemsApi } from '../api/pressingItems';
import { pressingsApi } from '../api/pressings';
import { Button, Input, Modal, ConfirmDialog, UserDropdown, Select } from '../components';
import type { PressingItem, Pressing, CreatePressingItemRequest, UpdatePressingItemRequest } from '../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

// Validation schema
const itemSchema = z.object({
  label: z.string().min(1, 'Item name is required'),
  price: z.number().min(0.01, 'Price must be positive'),
});

type ItemFormData = z.infer<typeof itemSchema>;

export const PressingItems: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const [items, setItems] = useState<PressingItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PressingItem[]>([]);
  const [pressings, setPressings] = useState<Pressing[]>([]);
  const [selectedPressingId, setSelectedPressingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PressingItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<PressingItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    loadPressings();
  }, []);

  useEffect(() => {
    // For ADMIN: load items when a pressing is selected
    // For SUPERVISOR: load items immediately using JWT-based endpoint
    if (user?.role === 'ADMIN') {
      if (selectedPressingId) {
        loadItems(selectedPressingId);
      }
    } else if (user?.role === 'SUPERVISOR') {
      loadItems();
    }
  }, [selectedPressingId, user?.role]);

  useEffect(() => {
    filterItems();
  }, [searchQuery, items]);

  const loadPressings = async () => {
    try {
      if (user?.role === 'ADMIN') {
        const data = await pressingsApi.getAllPressings(true);
        setPressings(data);
        if (data.length > 0) {
          setSelectedPressingId(data[0].id);
        }
      } else if (user?.pressingId) {
        // Supervisor - use their own pressing
        setSelectedPressingId(user.pressingId);
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToLoad'));
    } finally {
      if (!user?.pressingId && user?.role !== 'ADMIN') {
        setIsLoading(false);
      }
    }
  };

  const loadItems = async (pressingId?: number) => {
    setIsLoading(true);
    try {
      // For SUPERVISOR, use JWT-based endpoint; for ADMIN, use pressingId-based endpoint
      const data = user?.role === 'ADMIN' && pressingId
        ? await pressingItemsApi.getItemsByPressing(pressingId)
        : await pressingItemsApi.getItems();
      setItems(data);
      setFilteredItems(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  const filterItems = () => {
    if (!searchQuery) {
      setFilteredItems(items);
      return;
    }

    const filtered = items.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const handleCreateItem = async (data: ItemFormData) => {
    setIsSubmitting(true);
    try {
      // pressingId is automatically taken from JWT - don't send it
      const request: CreatePressingItemRequest = {
        label: data.label,
        price: data.price,
      };
      const newItem = await pressingItemsApi.createItem(request);
      setItems([newItem, ...items]);
      toast.success(t('pressingItems.itemCreated'));
      setIsCreateModalOpen(false);
      reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (item: PressingItem) => {
    setEditingItem(item);
    reset({
      label: item.label,
      price: item.price,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateItem = async (data: ItemFormData) => {
    if (!editingItem) return;

    setIsSubmitting(true);
    try {
      const request: UpdatePressingItemRequest = {
        label: data.label,
        price: data.price,
      };
      const updated = await pressingItemsApi.updateItem(editingItem.id, request);
      setItems(items.map((i) => (i.id === updated.id ? updated : i)));
      toast.success(t('pressingItems.itemUpdated'));
      setIsEditModalOpen(false);
      setEditingItem(null);
      reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (item: PressingItem) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    setIsDeleting(true);
    try {
      await pressingItemsApi.deleteItem(deletingItem.id);
      setItems(items.filter((i) => i.id !== deletingItem.id));
      toast.success(t('pressingItems.itemDeleted'));
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToDelete'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canManageItems = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

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
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img src="/img/logo.png" alt="Logo" className="h-10 w-10" />
              <div className="text-start">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">
                  <span className="hidden sm:inline">{t('dashboard.title')}</span>
                  <span className="sm:hidden">{t('pressingItems.items')}</span>
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">{t('pressingItems.title')}</p>
              </div>
            </button>
            <div className="flex items-center gap-3">
              <UserDropdown
                userName={user?.name || 'User'}
                userRole={user?.role || 'ADMIN'}
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('pressingItems.title')}</h2>
                {canManageItems && (user?.role === 'SUPERVISOR' || selectedPressingId) && (
                  <Button onClick={() => setIsCreateModalOpen(true)} className="whitespace-nowrap">
                    {t('pressingItems.createItem')}
                  </Button>
                )}
              </div>

              {/* Pressing Selector (Admin only) */}
              {user?.role === 'ADMIN' && pressings.length > 0 && (
                <div className="mb-4">
                  <Select
                    label={t('pressingItems.selectPressing')}
                    value={selectedPressingId || ''}
                    onChange={(e) => setSelectedPressingId(Number(e.target.value))}
                    options={pressings.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                  />
                </div>
              )}

              <Input
                type="text"
                placeholder={t('pressingItems.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Empty State */}
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  {searchQuery ? t('pressingItems.noItemsSearch') : t('pressingItems.noItems')}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('pressingItems.itemLabel')}
                        </th>
                        <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('pressingItems.price')}
                        </th>
                        <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('pressingItems.createdAt')}
                        </th>
                        {canManageItems && (
                          <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('common.actions')}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.label}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.price.toFixed(2)} MRU
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(item.createdAt)}
                          </td>
                          {canManageItems && (
                            <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium space-x-3">
                              <button
                                onClick={() => handleEditClick(item)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                              >
                                {t('common.edit')}
                              </button>
                              <button
                                onClick={() => handleDeleteClick(item)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                {t('common.delete')}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="sm:hidden divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{item.label}</h3>
                          <p className="text-lg font-bold text-blue-600 mt-1">
                            {item.price.toFixed(2)} MRU
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-3">
                        {t('pressingItems.createdAt')}: {formatDate(item.createdAt)}
                      </div>
                      {canManageItems && (
                        <div className="flex gap-3 text-sm">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          reset();
        }}
        title={t('pressingItems.createItem')}
        size="md"
      >
        <form onSubmit={handleSubmit(handleCreateItem)} className="space-y-4">
          <Input
            {...register('label')}
            label={t('pressingItems.itemLabel')}
            placeholder={t('pressingItems.itemLabelPlaceholder')}
            error={errors.label?.message}
            required
          />

          <Input
            {...register('price', { valueAsNumber: true })}
            type="number"
            step="0.01"
            min="0"
            label={t('pressingItems.price')}
            placeholder={t('pressingItems.pricePlaceholder')}
            error={errors.price?.message}
            required
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                reset();
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {t('pressingItems.createItem')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
          reset();
        }}
        title={t('pressingItems.editItem')}
        size="md"
      >
        <form onSubmit={handleSubmit(handleUpdateItem)} className="space-y-4">
          <Input
            {...register('label')}
            label={t('pressingItems.itemLabel')}
            placeholder={t('pressingItems.itemLabelPlaceholder')}
            error={errors.label?.message}
            required
          />

          <Input
            {...register('price', { valueAsNumber: true })}
            type="number"
            step="0.01"
            min="0"
            label={t('pressingItems.price')}
            placeholder={t('pressingItems.pricePlaceholder')}
            error={errors.price?.message}
            required
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingItem(null);
                reset();
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t('pressingItems.deleteConfirmTitle')}
        message={t('pressingItems.deleteConfirmMessage', { name: deletingItem?.label || '' })}
        confirmText={t('common.delete')}
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
