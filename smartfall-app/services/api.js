import axios from 'axios';

// For physical devices, use your computer's LAN IP
// Options: http://192.168.14.65:4000 (Wi-Fi) or http://192.168.10.210:4000 (Ethernet)
// For Android emulator, use http://10.0.2.2:4000
// For iOS simulator, use http://localhost:4000

// Use environment variable if set, otherwise use correct Wi-Fi IP
let API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.14.65:4000';

// Fix incorrect IP if set to old/wrong value
if (API_BASE.includes('192.168.0.42')) {
  API_BASE = 'http://192.168.14.65:4000';
  console.warn('⚠️  Fixed incorrect API URL to:', API_BASE);
}

console.log('API Base URL:', API_BASE);

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000, // Increased timeout to 15 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add error interceptor to log network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      console.warn('Network error: Backend may not be running or API URL is incorrect.');
      console.warn('Current API URL:', API_BASE);
      console.warn('To fix: Set EXPO_PUBLIC_API_URL to your computer\'s LAN IP (e.g., http://192.168.14.65:4000)');
    }
    return Promise.reject(error);
  }
);

export const sendFallEvent = (payload) => api.post('/api/events', payload);

