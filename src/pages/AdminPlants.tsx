import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { plantsApi } from '../api/plants';
import { Button, Input, Modal, ConfirmDialog, UserDropdown } from '../components';
import type { Plant, CreatePlantRequest, UpdatePlantRequest } from '../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

// Validation schema
const plantSchema = z.object({
  name: z.string().min(1, 'Plant name is required'),
  address: z.string().optional(),
  active: z.boolean().optional(),
});

type PlantFormData = z.infer<typeof plantSchema>;

export const AdminPlants: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [filteredPlants, setFilteredPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPlant, setDeletingPlant] = useState<Plant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PlantFormData>({
    resolver: zodResolver(plantSchema),
    defaultValues: {
      active: true,
    },
  });

  useEffect(() => {
    loadPlants();
  }, [showActiveOnly]);

  useEffect(() => {
    filterPlants();
  }, [searchQuery, plants]);

  const loadPlants = async () => {
    try {
      const data = await plantsApi.getAllPlants(showActiveOnly);
      setPlants(data);
      setFilteredPlants(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  const filterPlants = () => {
    if (!searchQuery) {
      setFilteredPlants(plants);
      return;
    }

    const filtered = plants.filter((plant) =>
      plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPlants(filtered);
  };

  const handleCreatePlant = async (data: PlantFormData) => {
    setIsSubmitting(true);
    try {
      const newPlant = await plantsApi.createPlant(data as CreatePlantRequest);
      setPlants([newPlant, ...plants]);
      toast.success(t('plants.plantCreated'));
      setIsCreateModalOpen(false);
      reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (plant: Plant) => {
    setEditingPlant(plant);
    reset({
      name: plant.name,
      address: plant.address || '',
      active: plant.active,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePlant = async (data: PlantFormData) => {
    if (!editingPlant) return;

    setIsSubmitting(true);
    try {
      const updated = await plantsApi.updatePlant(editingPlant.id, data as UpdatePlantRequest);
      setPlants(plants.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(t('plants.plantUpdated'));
      setIsEditModalOpen(false);
      setEditingPlant(null);
      reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || t('errors.failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (plant: Plant) => {
    setDeletingPlant(plant);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPlant) return;

    setIsDeleting(true);
    try {
      await plantsApi.deletePlant(deletingPlant.id);
      setPlants(plants.filter((p) => p.id !== deletingPlant.id));
      toast.success(t('plants.plantDeleted'));
      setIsDeleteDialogOpen(false);
      setDeletingPlant(null);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.status === 409) {
        toast.error(t('plants.cannotDeleteMessage'));
      } else {
        toast.error(axiosError.response?.data?.message || t('errors.failedToDelete'));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (plant: Plant) => {
    try {
      const updated = await plantsApi.toggleActive(plant.id);
      setPlants(plants.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(updated.active ? t('plants.plantActivated') : t('plants.plantDeactivated'));
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
                  <span className="sm:hidden">{t('plants.plants')}</span>
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">{t('plants.title')}</p>
              </div>
            </button>
            <div className="flex items-center gap-3">
              <UserDropdown
                userName={user?.name || 'User'}
                userRole={user?.role || 'ADMIN'}
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
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('plants.title')}</h2>
                <div className="flex gap-2">
                  <Button
                    variant={showActiveOnly ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setShowActiveOnly(!showActiveOnly)}
                    className="whitespace-nowrap"
                  >
                    {showActiveOnly ? t('plants.activeOnly') : t('plants.showAll')}
                  </Button>
                  {isAdmin && (
                    <Button onClick={() => setIsCreateModalOpen(true)} className="whitespace-nowrap">
                      {t('plants.createPlant')}
                    </Button>
                  )}
                </div>
              </div>
              <Input
                type="text"
                placeholder={t('plants.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Empty State */}
            {filteredPlants.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  {searchQuery ? t('plants.noPlantsSearch') : t('plants.noPlants')}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('plants.plantName')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('plants.address')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('plants.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('plants.createdAt')}
                      </th>
                      {isAdmin && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('common.actions')}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPlants.map((plant) => (
                      <tr key={plant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {plant.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {plant.address || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              plant.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {plant.active ? t('plants.active') : t('plants.inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(plant.createdAt).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                            <button
                              onClick={() => handleEditClick(plant)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => handleToggleActive(plant)}
                              className={`transition-colors ${
                                plant.active
                                  ? 'text-yellow-600 hover:text-yellow-900'
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              {plant.active ? t('plants.deactivate') : t('plants.activate')}
                            </button>
                            <button
                              onClick={() => handleDeleteClick(plant)}
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
                {filteredPlants.map((plant) => (
                  <div key={plant.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{plant.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{plant.address || '-'}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          plant.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {plant.active ? t('plants.active') : t('plants.inactive')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      {t('plants.createdAt')}: {new Date(plant.createdAt).toLocaleDateString()}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-3 text-sm">
                        <button
                          onClick={() => handleEditClick(plant)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handleToggleActive(plant)}
                          className={`transition-colors ${
                            plant.active
                              ? 'text-yellow-600 hover:text-yellow-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {plant.active ? t('plants.deactivate') : t('plants.activate')}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(plant)}
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
        title={t('plants.createPlant')}
        size="md"
      >
        <form onSubmit={handleSubmit(handleCreatePlant)} className="space-y-4">
          <Input
            {...register('name')}
            label={t('plants.plantName')}
            placeholder={t('plants.plantNamePlaceholder')}
            error={errors.name?.message}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('plants.address')}
            </label>
            <textarea
              {...register('address')}
              placeholder={t('plants.addressPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center">
            <input
              {...register('active')}
              type="checkbox"
              id="active-create"
              defaultChecked
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="active-create" className="ml-2 text-sm font-medium text-gray-700">
              {t('plants.active')}
            </label>
            <span className="ml-2 text-xs text-gray-500">({t('plants.activeHelperText')})</span>
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
              {t('plants.createPlant')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPlant(null);
          reset();
        }}
        title={t('plants.editPlant')}
        size="md"
      >
        <form onSubmit={handleSubmit(handleUpdatePlant)} className="space-y-4">
          <Input
            {...register('name')}
            label={t('plants.plantName')}
            placeholder={t('plants.plantNamePlaceholder')}
            error={errors.name?.message}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('plants.address')}
            </label>
            <textarea
              {...register('address')}
              placeholder={t('plants.addressPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center">
            <input
              {...register('active')}
              type="checkbox"
              id="active-edit"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="active-edit" className="ml-2 text-sm font-medium text-gray-700">
              {t('plants.active')}
            </label>
            <span className="ml-2 text-xs text-gray-500">({t('plants.activeHelperText')})</span>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingPlant(null);
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
          setDeletingPlant(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t('plants.deleteConfirmTitle')}
        message={t('plants.deleteConfirmMessage', { name: deletingPlant?.name || '' })}
        confirmText={t('common.delete')}
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
