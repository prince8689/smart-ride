import axios from 'axios';
import toast from '../utils/toastConfig';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Track if we are already redirecting (prevent multiple redirects)
let isRedirecting = false;

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sr_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      // Network error
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        isNetworkError: true
      });
    }

    const { status, data } = error.response;

    if (status === 401 && !isRedirecting) {
      isRedirecting = true;
      localStorage.removeItem('sr_token');
      localStorage.removeItem('sr_user');
      sessionStorage.clear();
      toast.error('Session expired. Please login again.');
      setTimeout(() => {
        window.location.href = '/login';
        isRedirecting = false;
      }, 1500);
      return Promise.reject(data);
    }

    if (status === 429) {
      return Promise.reject({
        message: data?.message || 'Too many requests. Please slow down.'
      });
    }

    return Promise.reject(data || { message: 'Something went wrong' });
  }
);

export default api;
