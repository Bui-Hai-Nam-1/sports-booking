import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') ?? localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && body.success === true && 'data' in body) {
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    const raw = error.response?.data?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : raw || error.message || 'Lỗi kết nối máy chủ';
    return Promise.reject(new Error(message));
  },
);

export function extractErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export default api;
