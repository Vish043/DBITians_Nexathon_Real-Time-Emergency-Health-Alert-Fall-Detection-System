import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 7000
});

export const sendFallEvent = (payload) => api.post('/api/events', payload);

