import { apiClient } from './client';
import type { User, CreateUserRequest, UpdateUserRequest } from '../types';

export const usersApi = {
  // Get all users
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/admin/users');
    return response.data;
  },

  // Get single user by ID
  getUser: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/admin/users/${id}`);
    return response.data;
  },

  // Create new user
  createUser: async (userData: CreateUserRequest): Promise<User> => {
    const response = await apiClient.post<User>('/admin/users', userData);
    return response.data;
  },

  // Update existing user
  updateUser: async (id: number, userData: UpdateUserRequest): Promise<User> => {
    const response = await apiClient.put<User>(`/admin/users/${id}`, userData);
    return response.data;
  },

  // Delete user
  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`);
  },

  // Regenerate login code
  regenerateCode: async (id: number): Promise<User> => {
    const response = await apiClient.post<User>(`/admin/users/${id}/regenerate-code`);
    return response.data;
  },
};
