import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const vocabularyApi = {
  dashboard: async () => (await api.get('/vocabulary')).data.data,
  words: async () => (await api.get('/vocabulary/words')).data.data,
  learn: async (payload) => (await api.post('/vocabulary/learn', payload)).data.data,
  startTest: async () => (await api.post('/vocabulary/test/start')).data.data,
  submitTest: async (payload) => (await api.post('/vocabulary/test/submit', payload)).data.data,
};

export default api;
