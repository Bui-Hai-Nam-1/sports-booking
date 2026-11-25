import axios from 'axios';
import { ApiClientError, isApiEnvelope } from '../types/booking';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('accessToken') ?? localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (isApiEnvelope<unknown>(response.data)) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const body = error.response?.data as
        | { message?: string | string[]; error?: string }
        | undefined;
      const rawMessage = body?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : typeof rawMessage === 'string'
          ? rawMessage
          : error.message || 'Không thể kết nối đến máy chủ';
      return Promise.reject(new ApiClientError(message, status, body));
    }

    const fallbackMessage =
      error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định';
    return Promise.reject(new ApiClientError(fallbackMessage));
  },
);

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export default api;
