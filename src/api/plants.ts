import { apiClient } from './client';
import type { Plant, CreatePlantRequest, UpdatePlantRequest } from '../types';

export const plantsApi = {
  // Get all plants (with optional activeOnly filter)
  getAllPlants: async (activeOnly?: boolean): Promise<Plant[]> => {
    const response = await apiClient.get<Plant[]>('/api/plants', {
      params: { activeOnly },
    });
    return response.data;
  },

  // Get plant by ID
  getPlant: async (id: number): Promise<Plant> => {
    const response = await apiClient.get<Plant>(`/api/plants/${id}`);
    return response.data;
  },

  // Create plant (ADMIN only)
  createPlant: async (data: CreatePlantRequest): Promise<Plant> => {
    const response = await apiClient.post<Plant>('/api/plants', data);
    return response.data;
  },

  // Update plant (ADMIN only)
  updatePlant: async (id: number, data: UpdatePlantRequest): Promise<Plant> => {
    const response = await apiClient.put<Plant>(`/api/plants/${id}`, data);
    return response.data;
  },

  // Delete plant (ADMIN only)
  deletePlant: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/plants/${id}`);
  },

  // Toggle active status (ADMIN only)
  toggleActive: async (id: number): Promise<Plant> => {
    const response = await apiClient.patch<Plant>(`/api/plants/${id}/toggle-active`);
    return response.data;
  },
};
