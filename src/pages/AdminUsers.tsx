import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../api/users';
import { pressingsApi } from '../api/pressings';
import { Button, Input, Select, Modal, ConfirmDialog, UserDropdown } from '../components';
import type { User, CreateUserRequest, UpdateUserRequest, UserRole, Pressing } from '../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'SUPERVISOR'], {
    message: 'Role is required',
  }),
  pressingId: z.string().min(1, 'Pressing is required'),
  enabled: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [pressings, setPressings] = useState<Pressing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPressings, setIsLoadingPressings] = useState(false);
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
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      enabled: true,
    },
  });

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

  useEffect(() => {
    loadUsers();
    loadPressings();
  }, []);

  const handleCreateUser = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      const userData: CreateUserRequest = {
        name: data.name,
        role: data.role as UserRole,
        pressingId: parseInt(data.pressingId),
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
        pressingId: parseInt(data.pressingId),
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
      enabled: true,
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setValue('name', user.name);
    setValue('role', user.role);
    setValue('pressingId', user.pressingId.toString());
    setValue('enabled', user.enabled);
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
              <img src="/vite.svg" alt="Logo" className="h-10 w-10" />
              <div className="text-left">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">
                  Pressing Management System
                </h1>
                <p className="text-xs text-gray-500">User Management</p>
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
                <Button onClick={openCreateModal} className="w-full sm:w-auto">Create User</Button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Login Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pressing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
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
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded">{user.loginCode}</code>
                          <button
                            onClick={() => handleCopyCode(user.loginCode)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Copy code"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.pressingName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          user.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRegenerateCode(user.id)}
                          className="text-yellow-600 hover:text-yellow-900 transition-colors"
                        >
                          Regenerate
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Delete
                        </button>
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
                      {user.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Role:</span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pressing:</span>
                      <span className="font-medium">{user.pressingName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Login Code:</span>
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
                      Edit
                    </button>
                    <button
                      onClick={() => handleRegenerateCode(user.id)}
                      className="text-yellow-600 hover:text-yellow-900 transition-colors"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No users found. Create your first user!</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New User"
        size="md"
      >
        <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4">
          <Input
            {...register('name')}
            label="Name"
            placeholder="John Doe"
            error={errors.name?.message}
          />

          <Select
            {...register('role')}
            label="Role"
            options={[
              { value: 'ADMIN', label: 'Admin' },
              { value: 'SUPERVISOR', label: 'Supervisor' },
            ]}
            error={errors.role?.message}
          />

          <Select
            {...register('pressingId')}
            label="Pressing"
            options={pressings.map(p => ({
              value: p.id.toString(),
              label: p.name
            }))}
            error={errors.pressingId?.message}
            disabled={isLoadingPressings}
          />

          <div className="flex items-center">
            <input
              {...register('enabled')}
              type="checkbox"
              id="enabled"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
              Account Enabled
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create User
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
        title="Edit User"
        size="md"
      >
        <form onSubmit={handleSubmit(handleEditUser)} className="space-y-4">
          <Input
            {...register('name')}
            label="Name"
            placeholder="John Doe"
            error={errors.name?.message}
          />

          <Select
            {...register('role')}
            label="Role"
            options={[
              { value: 'ADMIN', label: 'Admin' },
              { value: 'SUPERVISOR', label: 'Supervisor' },
            ]}
            error={errors.role?.message}
          />

          <Select
            {...register('pressingId')}
            label="Pressing"
            options={pressings.map(p => ({
              value: p.id.toString(),
              label: p.name
            }))}
            error={errors.pressingId?.message}
            disabled={isLoadingPressings}
          />

          <div className="flex items-center">
            <input
              {...register('enabled')}
              type="checkbox"
              id="enabled-edit"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enabled-edit" className="ml-2 block text-sm text-gray-900">
              Account Enabled
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
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Update User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
