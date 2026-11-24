import axios from 'axios';
import { store } from '../store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Automatically inject Authorization Bearer token from Redux store or localStorage
api.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth.token || localStorage.getItem('auth_token');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to unwrap data and normalize errors
api.interceptors.response.use(
  (response) => {
    // If backend wrapped in { success: true, data: ... }
    if (response.data && response.data.success && 'data' in response.data) {
      // If there are meta pagination data, attach to data
      if (response.data.meta) {
        return {
          ...response,
          data: {
            items: response.data.data,
            ...response.data.meta,
          },
        };
      }
      return {
        ...response,
        data: response.data.data,
      };
    }
    return response;
  },
  (error) => {
    const errorResponse = error.response?.data;
    const message =
      errorResponse?.message ||
      (Array.isArray(errorResponse?.fieldErrors?.validation)
        ? errorResponse.fieldErrors.validation.join(', ')
        : null) ||
      error.message ||
      'Lỗi kết nối máy chủ';

    return Promise.reject(new Error(message));
  },
);
