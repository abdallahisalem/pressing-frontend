import { apiClient } from './client';
import type { PressingItem, CreatePressingItemRequest, UpdatePressingItemRequest } from '../types';

export const pressingItemsApi = {
  // Get all items for current user's pressing (uses JWT for context)
  getItems: async (): Promise<PressingItem[]> => {
    const response = await apiClient.get<PressingItem[]>('/api/pressing-items');
    return response.data;
  },

  // Get all items for a specific pressing (ADMIN only)
  getItemsByPressing: async (pressingId: number): Promise<PressingItem[]> => {
    const response = await apiClient.get<PressingItem[]>(`/api/pressing-items/pressing/${pressingId}`);
    return response.data;
  },

  // Get single item by ID
  getItem: async (id: number): Promise<PressingItem> => {
    const response = await apiClient.get<PressingItem>(`/api/pressing-items/${id}`);
    return response.data;
  },

  // Create new item
  createItem: async (data: CreatePressingItemRequest): Promise<PressingItem> => {
    const response = await apiClient.post<PressingItem>('/api/pressing-items', data);
    return response.data;
  },

  // Update item
  updateItem: async (id: number, data: UpdatePressingItemRequest): Promise<PressingItem> => {
    const response = await apiClient.put<PressingItem>(`/api/pressing-items/${id}`, data);
    return response.data;
  },

  // Delete item
  deleteItem: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/pressing-items/${id}`);
  },
};
