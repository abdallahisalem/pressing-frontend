import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../api/users';
import { Button, Input, Select, Modal } from '../components';
import type { User, CreateUserRequest, UpdateUserRequest, UserRole } from '../types';
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
  const { logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    loadUsers();
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
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Pressing Management System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
              <Button onClick={openCreateModal}>Create User</Button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRegenerateCode(user.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Regenerate
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            options={[
              { value: '1', label: 'Main Pressing' },
              { value: '2', label: 'Branch Pressing' },
            ]}
            error={errors.pressingId?.message}
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
            options={[
              { value: '1', label: 'Main Pressing' },
              { value: '2', label: 'Branch Pressing' },
            ]}
            error={errors.pressingId?.message}
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
