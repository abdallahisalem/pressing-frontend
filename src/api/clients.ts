import { apiClient } from './client';
import type { Client, CreateClientRequest } from '../types';

export const clientsApi = {
  // Get all clients
  getAllClients: async (): Promise<Client[]> => {
    const response = await apiClient.get<Client[]>(`/api/clients`);
    return response.data;
  },

  // Get clients by pressing
  getClientsByPressing: async (): Promise<Client[]> => {
    const response = await apiClient.get<Client[]>(`/api/clients/pressing`);
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
