import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => {
    if (
      typeof response.data === 'object'
      && response.data !== null
      && 'success' in response.data
      && response.data.success === true
      && 'data' in response.data
    ) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error: unknown) => Promise.reject(error),
);
