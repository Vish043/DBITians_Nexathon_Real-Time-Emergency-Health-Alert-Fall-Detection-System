import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

console.log('[API] Using API base URL:', API_BASE);

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000, // Increased timeout to 15 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or context
    const token = localStorage.getItem('firebase_id_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors and network issues
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('[API] Network Error - Backend may not be running');
      console.error('[API] Attempted URL:', error.config?.url);
      console.error('[API] Full URL:', error.config?.baseURL + error.config?.url);
      console.error('[API] Check if backend is running on:', API_BASE);
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('firebase_id_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Health check function to test backend connectivity
export const checkBackendHealth = async () => {
  try {
    const response = await api.get('/health');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[API] Health check failed:', error);
    return { success: false, error: error.message || 'Backend not reachable' };
  }
};

export const fetchEvents = () => api.get('/api/events');

export const deleteEvent = (eventId) => api.delete(`/api/events/${eventId}`);

export const updateEventStatus = (eventId, status) => 
  api.patch(`/api/events/${eventId}`, { status });

