import { apiClient } from './client';
import type { LoginResponse } from '../types';

export const authApi = {
  login: async (loginCode: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      loginCode,
    });
    return response.data;
  },
};
