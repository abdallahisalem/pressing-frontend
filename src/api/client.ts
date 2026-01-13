import axios, { AxiosError } from 'axios';
import type { ApiError } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token and language to all requests
apiClient.interceptors.request.use(
  (config) => {
    // Don't add token to login endpoint
    const isLoginRequest = config.url?.includes('/auth/login');

    if (!isLoginRequest) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add language header to all requests
    const language = localStorage.getItem('language') || 'ar';
    config.headers['Accept-Language'] = language;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401/403 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    // Don't redirect if it's a login request (let the login page handle the error)
    if (!isLoginRequest && (error.response?.status === 401 || error.response?.status === 403)) {
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
