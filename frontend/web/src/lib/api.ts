/**
 * Axios instance — all calls target the FastAPI backend.
 * The auth token is automatically injected from localStorage.
 */
import axios, { type InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: 'http://127.0.0.1:8001',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

/* Attach Bearer token to every request */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('lumina_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* Global error handler */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lumina_token');
      window.location.replace('/login');
    }
    return Promise.reject(err);
  }
);
