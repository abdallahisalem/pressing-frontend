import { apiClient } from './client';
import type { Client, CreateClientRequest } from '../types';

export const clientsApi = {
  // Get clients by pressing ID
  getClientsByPressing: async (pressingId: number): Promise<Client[]> => {
    const response = await apiClient.get<Client[]>(`/api/clients/pressing/${pressingId}`);
    return response.data;
  },

  // Get single client by ID
  getClient: async (id: number): Promise<Client> => {
    const response = await apiClient.get<Client>(`/api/clients/${id}`);
    return response.data;
  },

  // Create new client
  createClient: async (clientData: CreateClientRequest): Promise<Client> => {
    const response = await apiClient.post<Client>('/api/clients', clientData);
    return response.data;
  },
};
