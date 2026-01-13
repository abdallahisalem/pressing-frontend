import { apiClient } from './client';
import type { Pressing, CreatePressingRequest, UpdatePressingRequest } from '../types';

export const pressingsApi = {
  // Get all pressings (with optional activeOnly filter)
  getAllPressings: async (activeOnly?: boolean): Promise<Pressing[]> => {
    const response = await apiClient.get<Pressing[]>('/api/pressings', {
      params: { activeOnly },
    });
    return response.data;
  },

  // Get pressing by ID
  getPressing: async (id: number): Promise<Pressing> => {
    const response = await apiClient.get<Pressing>(`/api/pressings/${id}`);
    return response.data;
  },

  // Create pressing (ADMIN only)
  createPressing: async (data: CreatePressingRequest): Promise<Pressing> => {
    const response = await apiClient.post<Pressing>('/api/pressings', data);
    return response.data;
  },

  // Update pressing (ADMIN only)
  updatePressing: async (id: number, data: UpdatePressingRequest): Promise<Pressing> => {
    const response = await apiClient.put<Pressing>(`/api/pressings/${id}`, data);
    return response.data;
  },

  // Delete pressing (ADMIN only)
  deletePressing: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/pressings/${id}`);
  },

  // Toggle active status (ADMIN only)
  toggleActive: async (id: number): Promise<Pressing> => {
    const response = await apiClient.patch<Pressing>(`/api/pressings/${id}/toggle-active`);
    return response.data;
  },
};
