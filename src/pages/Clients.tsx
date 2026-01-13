import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { clientsApi } from '../api/clients';
import { Button, Input, Select, Modal, SearchInput, UserDropdown, ConfirmDialog } from '../components';
import type { Client, CreateClientRequest } from '../types';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

const clientSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  pressingId: z.string().min(1, 'Pressing is required'),
});

type ClientFormData = z.infer<typeof clientSchema>;

export const Clients: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      pressingId: user?.role === 'SUPERVISOR' ? user.pressingId.toString() : '',
    },
  });

  const loadClients = async () => {
    if (!user) return;

    try {
      const pressingId = user.role === 'SUPERVISOR' ? user.pressingId : 1; // For now, default to pressing 1 for ADMIN
      const data = await clientsApi.getClientsByPressing(pressingId);
      setClients(data);
      setFilteredClients(data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = clients.filter(
        (client) =>
          client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);

  const handleCreateClient = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const clientData: CreateClientRequest = {
        fullName: data.fullName,
        phone: data.phone,
        pressingId: parseInt(data.pressingId),
      };
      const newClient = await clientsApi.createClient(clientData);
      setClients([...clients, newClient]);
      toast.success(t('clients.clientCreated'));
      setIsCreateModalOpen(false);
      reset({
        fullName: '',
        phone: '',
        pressingId: user?.role === 'SUPERVISOR' ? user.pressingId.toString() : '',
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.message || 'Failed to create client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    reset({
      fullName: '',
      phone: '',
      pressingId: user?.role === 'SUPERVISOR' ? user.pressingId.toString() : '',
    });
    setIsCreateModalOpen(true);
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
                  <span className="sm:hidden">{t('clients.clients')}</span>
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">{t('clients.title')}</p>
              </div>
            </button>
            <div className="flex items-center gap-3">
              <UserDropdown
                userName={user?.name || 'User'}
                userRole={user?.role || 'SUPERVISOR'}
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('clients.title')}</h2>
                <Button onClick={openCreateModal} className="w-full sm:w-auto">{t('clients.createClient')}</Button>
              </div>
              <SearchInput
                placeholder={t('clients.searchPlaceholder')}
                onSearch={setSearchTerm}
              />
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('clients.id')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('clients.fullName')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('clients.phone')}
                    </th>
                    {user?.role === 'ADMIN' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('clients.pressing')}
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('clients.createdAt')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.phone || '-'}
                      </td>
                      {user?.role === 'ADMIN' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {client.pressingName}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <div key={client.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">{client.fullName}</div>
                    <div className="text-xs text-gray-500">{t('clients.id')}: {client.id}</div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('clients.phone')}:</span>
                      <span className="text-gray-900">{client.phone || '-'}</span>
                    </div>
                    {user?.role === 'ADMIN' && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('clients.pressing')}:</span>
                        <span className="text-gray-900">{client.pressingName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('clients.createdAt')}:</span>
                      <span className="text-gray-900">{new Date(client.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredClients.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchTerm ? t('clients.noClientsSearch') : t('clients.noClients')}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Client Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('clients.createClient')}
        size="md"
      >
        <form onSubmit={handleSubmit(handleCreateClient)} className="space-y-4">
          <Input
            {...register('fullName')}
            label={t('clients.fullName')}
            placeholder={t('clients.fullNamePlaceholder')}
            error={errors.fullName?.message}
          />

          <Input
            {...register('phone')}
            label={t('clients.phoneOptional')}
            placeholder={t('clients.phonePlaceholder')}
            error={errors.phone?.message}
          />

          {user?.role === 'ADMIN' && (
            <Select
              {...register('pressingId')}
              label={t('clients.pressing')}
              options={[
                { value: '1', label: 'Main Pressing' },
                { value: '2', label: 'Branch Pressing' },
              ]}
              error={errors.pressingId?.message}
            />
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {t('clients.createClient')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
