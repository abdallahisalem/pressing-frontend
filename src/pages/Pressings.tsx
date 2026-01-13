import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { pressingsApi } from '../api/pressings';
import { Button, Input, Modal, ConfirmDialog, LanguageSwitcher } from '../components';
import type { Pressing, CreatePressingRequest, UpdatePressingRequest } from '../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

// Validation schema
const pressingSchema = z.object({
  name: z.string().min(1, 'Pressing name is required'),
  address: z.string().optional(),
  active: z.boolean().optional(),
});

type PressingFormData = z.infer<typeof pressingSchema>;

export const Pressings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const [pressings, setPressings] = useState<Pressing[]>([]);
  const [filteredPressings, setFilteredPressings] = useState<Pressing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPressing, setEditingPressing] = useState<Pressing | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPressing, setDeletingPressing] = useState<Pressing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PressingFormData>({
    resolver: zodResolver(pressingSchema),
    defaultValues: {
      active: true,
    },
  });

  useEffect(() => {
    loadPressings();
  }, [showActiveOnly]);

  useEffect(() => {
    filterPressings();
  }, [searchQuery, pressings]);

  const loadPressings = async () => {
    try {
      const data = await pressingsApi.getAllPressings(showActiveOnly);
      setPressings(data);
      setFilteredPressings(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  const filterPressings = () => {
    if (!searchQuery) {
      setFilteredPressings(pressings);
      return;
    }

    const filtered = pressings.filter((pressing) =>
      pressing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pressing.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPressings(filtered);
  };

  const handleCreatePressing = async (data: PressingFormData) => {
    setIsSubmitting(true);
    try {
      const newPressing = await pressingsApi.createPressing(data as CreatePressingRequest);
      setPressings([newPressing, ...pressings]);
      toast.success(t('pressings.pressingCreated'));
      setIsCreateModalOpen(false);
      reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (pressing: Pressing) => {
    setEditingPressing(pressing);
    reset({
      name: pressing.name,
      address: pressing.address || '',
      active: pressing.active,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePressing = async (data: PressingFormData) => {
    if (!editingPressing) return;

    setIsSubmitting(true);
    try {
      const updated = await pressingsApi.updatePressing(editingPressing.id, data as UpdatePressingRequest);
      setPressings(pressings.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(t('pressings.pressingUpdated'));
      setIsEditModalOpen(false);
      setEditingPressing(null);
      reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (pressing: Pressing) => {
    setDeletingPressing(pressing);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPressing) return;

    setIsDeleting(true);
    try {
      await pressingsApi.deletePressing(deletingPressing.id);
      setPressings(pressings.filter((p) => p.id !== deletingPressing.id));
      toast.success(t('pressings.pressingDeleted'));
      setIsDeleteDialogOpen(false);
      setDeletingPressing(null);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.status === 409) {
        // Show special message for conflict (has associated data)
        toast.error(t('pressings.cannotDeleteMessage'));
      } else {
        toast.error(axiosError.response?.data?.message || t('errors.failedToDelete'));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (pressing: Pressing) => {
    try {
      const updated = await pressingsApi.toggleActive(pressing.id);
      setPressings(pressings.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(updated.active ? t('pressings.pressingActivated') : t('pressings.pressingDeactivated'));
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToUpdate'));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'ADMIN';

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
                <span className="hidden sm:inline">{t('pressings.title')}</span>
                <span className="sm:hidden">{t('pressings.pressings')}</span>
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
          {/* Toolbar */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                placeholder={t('pressings.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <div className="flex gap-2">
                <Button
                  variant={showActiveOnly ? 'primary' : 'secondary'}
                  onClick={() => setShowActiveOnly(!showActiveOnly)}
                  className="whitespace-nowrap"
                >
                  {showActiveOnly ? t('pressings.activeOnly') : t('pressings.showAll')}
                </Button>
                {isAdmin && (
                  <Button onClick={() => setIsCreateModalOpen(true)} className="whitespace-nowrap">
                    {t('pressings.createPressing')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Pressings List */}
          {filteredPressings.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">
                {searchQuery ? t('pressings.noPressingsSearch') : t('pressings.noPressings')}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('pressings.pressingName')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('pressings.address')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('pressings.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('pressings.createdAt')}
                      </th>
                      {isAdmin && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('common.actions')}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPressings.map((pressing) => (
                      <tr key={pressing.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pressing.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {pressing.address || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              pressing.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {pressing.active ? t('pressings.active') : t('pressings.inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(pressing.createdAt).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleToggleActive(pressing)}
                              >
                                {pressing.active ? t('pressings.inactive') : t('pressings.active')}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleEditClick(pressing)}
                              >
                                {t('common.edit')}
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteClick(pressing)}
                              >
                                {t('common.delete')}
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-4">
                {filteredPressings.map((pressing) => (
                  <div key={pressing.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{pressing.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{pressing.address || '-'}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          pressing.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {pressing.active ? t('pressings.active') : t('pressings.inactive')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {t('pressings.createdAt')}: {new Date(pressing.createdAt).toLocaleDateString()}
                    </p>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleActive(pressing)}
                          className="flex-1"
                        >
                          {pressing.active ? t('pressings.inactive') : t('pressings.active')}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditClick(pressing)}
                          className="flex-1"
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteClick(pressing)}
                          className="flex-1"
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          reset();
        }}
        title={t('pressings.createPressing')}
        size="md"
      >
        <form onSubmit={handleSubmit(handleCreatePressing)} className="space-y-4">
          <Input
            {...register('name')}
            label={t('pressings.pressingName')}
            placeholder={t('pressings.pressingNamePlaceholder')}
            error={errors.name?.message}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pressings.address')}
            </label>
            <textarea
              {...register('address')}
              placeholder={t('pressings.addressPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center">
            <input
              {...register('active')}
              type="checkbox"
              defaultChecked
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label className="mr-2 text-sm font-medium text-gray-700">
              {t('pressings.active')}
            </label>
            <p className="text-xs text-gray-500">({t('pressings.activeHelperText')})</p>
          </div>

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
              {t('pressings.createPressing')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPressing(null);
          reset();
        }}
        title={t('pressings.editPressing')}
        size="md"
      >
        <form onSubmit={handleSubmit(handleUpdatePressing)} className="space-y-4">
          <Input
            {...register('name')}
            label={t('pressings.pressingName')}
            placeholder={t('pressings.pressingNamePlaceholder')}
            error={errors.name?.message}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pressings.address')}
            </label>
            <textarea
              {...register('address')}
              placeholder={t('pressings.addressPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center">
            <input
              {...register('active')}
              type="checkbox"
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label className="mr-2 text-sm font-medium text-gray-700">
              {t('pressings.active')}
            </label>
            <p className="text-xs text-gray-500">({t('pressings.activeHelperText')})</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingPressing(null);
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
          setDeletingPressing(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t('pressings.deleteConfirmTitle')}
        message={t('pressings.deleteConfirmMessage', { name: deletingPressing?.name || '' })}
        confirmText={t('common.delete')}
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
