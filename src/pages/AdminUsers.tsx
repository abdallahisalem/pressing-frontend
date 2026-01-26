import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '../utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../api/users';
import { pressingsApi } from '../api/pressings';
import { plantsApi } from '../api/plants';
import { Button, Input, Select, Modal, ConfirmDialog, UserDropdown } from '../components';
import type { User, CreateUserRequest, UpdateUserRequest, UserRole, Pressing, Plant } from '../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'PLANT_OPERATOR'], {
    message: 'Role is required',
  }),
  pressingId: z.string().optional(),
  plantId: z.string().optional(),
  enabled: z.boolean(),
}).refine((data) => {
  // Pressing is required for SUPERVISOR
  if (data.role === 'SUPERVISOR' && !data.pressingId) {
    return false;
  }
  // Plant is required for PLANT_OPERATOR
  if (data.role === 'PLANT_OPERATOR' && !data.plantId) {
    return false;
  }
  return true;
}, {
  message: 'Please select the required assignment',
  path: ['pressingId'],
});

type UserFormData = z.infer<typeof userSchema>;

export const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [pressings, setPressings] = useState<Pressing[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPressings, setIsLoadingPressings] = useState(false);
  const [isLoadingPlants, setIsLoadingPlants] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      enabled: true,
    },
  });

  const watchedRole = watch('role');

  const loadUsers = async () => {
    try {
      const data = await usersApi.getUsers();
      setUsers(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPressings = async () => {
    setIsLoadingPressings(true);
    try {
      const data = await pressingsApi.getAllPressings(true); // Load only active pressings
      setPressings(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Failed to load pressings');
    } finally {
      setIsLoadingPressings(false);
    }
  };

  const loadPlants = async () => {
    setIsLoadingPlants(true);
    try {
      const data = await plantsApi.getAllPlants(true); // Load only active plants
      setPlants(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Failed to load plants');
    } finally {
      setIsLoadingPlants(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadPressings();
    loadPlants();
  }, []);

  const handleCreateUser = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      const userData: CreateUserRequest = {
        name: data.name,
        role: data.role as UserRole,
        pressingId: data.pressingId ? parseInt(data.pressingId) : undefined,
        plantId: data.plantId ? parseInt(data.plantId) : undefined,
        enabled: data.enabled,
      };
      const newUser = await usersApi.createUser(userData);
      setUsers([...users, newUser]);
      toast.success(`User created! Login code: ${newUser.loginCode}`);
      setIsCreateModalOpen(false);
      reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (data: UserFormData) => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const userData: UpdateUserRequest = {
        name: data.name,
        role: data.role as UserRole,
        pressingId: data.pressingId ? parseInt(data.pressingId) : undefined,
        plantId: data.plantId ? parseInt(data.plantId) : undefined,
        enabled: data.enabled,
      };
      const updatedUser = await usersApi.updateUser(selectedUser.id, userData);
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await usersApi.deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleRegenerateCode = async (userId: number) => {
    if (!window.confirm('Are you sure? This will invalidate all existing tokens for this user.')) return;

    try {
      const updatedUser = await usersApi.regenerateCode(userId);
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      toast.success(`New login code: ${updatedUser.loginCode}`);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Failed to regenerate code');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.info('Login code copied to clipboard');
  };

  const openCreateModal = () => {
    reset({
      name: '',
      role: undefined,
      pressingId: '',
      plantId: '',
      enabled: true,
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setValue('name', userToEdit.name);
    setValue('role', userToEdit.role);
    setValue('pressingId', userToEdit.pressingId?.toString() || '');
    setValue('plantId', userToEdit.plantId?.toString() || '');
    setValue('enabled', userToEdit.enabled);
    setIsEditModalOpen(true);
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
          <p className="mt-4 text-gray-600">Loading...</p>
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
              <img src="/img/logo.png" alt="Logo" className="h-10 w-10" />
              <div className="text-start">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">
                  <span className="hidden sm:inline">{t('dashboard.title')}</span>
                  <span className="sm:hidden">{t('users.title')}</span>
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">{t('users.title')}</p>
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashboard.userManagement')}</h2>
                <Button onClick={openCreateModal} className="w-full sm:w-auto">{t('users.createUser')}</Button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('users.id')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('users.name')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('users.loginCode')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('users.role')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('users.pressing')} / {t('users.plant')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('users.status')}
                    </th>
                    <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded">{user.loginCode}</code>
                          <button
                            onClick={() => handleCopyCode(user.loginCode)}
                            className="text-blue-600 hover:text-blue-800"
                            title={t('users.copyCode')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'PLANT_OPERATOR'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'PLANT_OPERATOR' ? t('users.plantOperator') : user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.role === 'PLANT_OPERATOR' ? user.plantName : user.pressingName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          user.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.enabled ? t('users.active') : t('users.disabled')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleRegenerateCode(user.id)}
                            className="text-yellow-600 hover:text-yellow-900 transition-colors"
                          >
                            {t('users.regenerate')}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {users.map((user) => (
                <div key={user.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500 mt-1">ID: {user.id}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      user.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.enabled ? t('users.active') : t('users.disabled')}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('users.role')}:</span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : user.role === 'PLANT_OPERATOR'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'PLANT_OPERATOR' ? t('users.plantOperator') : user.role}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        {user.role === 'PLANT_OPERATOR' ? t('users.plant') : t('users.pressing')}:
                      </span>
                      <span className="font-medium">
                        {user.role === 'PLANT_OPERATOR' ? user.plantName : user.pressingName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">{t('users.loginCode')}:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{user.loginCode}</code>
                        <button
                          onClick={() => handleCopyCode(user.loginCode)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleRegenerateCode(user.id)}
                      className="text-yellow-600 hover:text-yellow-900 transition-colors"
                    >
                      {t('users.regenerate')}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">{t('users.noUsers')}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('users.createUser')}
        size="md"
      >
        <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4">
          <Input
            {...register('name')}
            label={t('users.name')}
            placeholder="John Doe"
            error={errors.name?.message}
          />

          <Select
            {...register('role')}
            label={t('users.role')}
            options={[
              { value: 'ADMIN', label: t('users.admin') },
              { value: 'SUPERVISOR', label: t('users.supervisor') },
              { value: 'PLANT_OPERATOR', label: t('users.plantOperator') },
            ]}
            error={errors.role?.message}
          />

          {watchedRole === 'SUPERVISOR' && (
            <Select
              {...register('pressingId')}
              label={t('users.pressing')}
              options={pressings.map(p => ({
                value: p.id.toString(),
                label: p.name
              }))}
              error={errors.pressingId?.message}
              disabled={isLoadingPressings}
            />
          )}

          {watchedRole === 'PLANT_OPERATOR' && (
            <Select
              {...register('plantId')}
              label={t('users.plant')}
              options={plants.map(p => ({
                value: p.id.toString(),
                label: p.name
              }))}
              error={errors.plantId?.message}
              disabled={isLoadingPlants}
            />
          )}

          <div className="flex items-center">
            <input
              {...register('enabled')}
              type="checkbox"
              id="enabled"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
              {t('users.active')}
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {t('common.create')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        title={t('users.editUser')}
        size="md"
      >
        <form onSubmit={handleSubmit(handleEditUser)} className="space-y-4">
          <Input
            {...register('name')}
            label={t('users.name')}
            placeholder="John Doe"
            error={errors.name?.message}
          />

          <Select
            {...register('role')}
            label={t('users.role')}
            options={[
              { value: 'ADMIN', label: t('users.admin') },
              { value: 'SUPERVISOR', label: t('users.supervisor') },
              { value: 'PLANT_OPERATOR', label: t('users.plantOperator') },
            ]}
            error={errors.role?.message}
          />

          {watchedRole === 'SUPERVISOR' && (
            <Select
              {...register('pressingId')}
              label={t('users.pressing')}
              options={pressings.map(p => ({
                value: p.id.toString(),
                label: p.name
              }))}
              error={errors.pressingId?.message}
              disabled={isLoadingPressings}
            />
          )}

          {watchedRole === 'PLANT_OPERATOR' && (
            <Select
              {...register('plantId')}
              label={t('users.plant')}
              options={plants.map(p => ({
                value: p.id.toString(),
                label: p.name
              }))}
              error={errors.plantId?.message}
              disabled={isLoadingPlants}
            />
          )}

          <div className="flex items-center">
            <input
              {...register('enabled')}
              type="checkbox"
              id="enabled-edit"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enabled-edit" className="ml-2 block text-sm text-gray-900">
              {t('users.active')}
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedUser(null);
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
    </div>
  );
};
