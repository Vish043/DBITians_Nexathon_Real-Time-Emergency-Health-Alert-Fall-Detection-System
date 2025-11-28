import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 7000
});

export const fetchEvents = () => api.get('/api/events');

export const deleteEvent = (eventId) => api.delete(`/api/events/${eventId}`);

export const updateEventStatus = (eventId, status) => 
  api.patch(`/api/events/${eventId}`, { status });

