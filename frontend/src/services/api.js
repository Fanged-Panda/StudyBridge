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
  setGoal: async (dailyGoal) => (await api.patch('/vocabulary/goal', { dailyGoal })).data.data,
  startTest: async () => (await api.post('/vocabulary/test/start')).data.data,
  submitTest: async (payload) => (await api.post('/vocabulary/test/submit', payload)).data.data,
};

export const communityApi = {
  journeys: async (params) => (await api.get('/community/journeys', { params })).data.data,
  journey: async (slug) => (await api.get(`/community/journeys/${slug}`)).data.data,
  tags: async () => (await api.get('/community/tags')).data.data,
  reportReasons: async () => (await api.get('/community/report-reasons')).data.data,
  submit: async (payload) => (await api.post('/community/journeys', payload)).data.data,
  vote: async (slug, value) => (await api.post(`/community/journeys/${slug}/vote`, { value })).data.data,
  remove: async (slug) => (await api.delete(`/community/journeys/${slug}`)).data.data,
  contact: async (slug, payload) => (await api.post(`/community/journeys/${slug}/contact`, payload)).data.data,
  report: async (slug, payload) => (await api.post(`/community/journeys/${slug}/report`, payload)).data.data,
  comments: async (slug) => (await api.get(`/community/journeys/${slug}/comments`)).data.data,
  addComment: async (slug, payload) => (await api.post(`/community/journeys/${slug}/comments`, payload)).data.data,
  manage: async (token) => (await api.get(`/community/manage/${token}`)).data.data,
  updateManaged: async (token, payload) => (await api.patch(`/community/manage/${token}`, payload)).data.data,
  deleteManaged: async (token) => (await api.delete(`/community/manage/${token}`)).data.data,
};

export const communityAdminApi = {
  journeys: async (params) => (await api.get('/community/admin/journeys', { params })).data.data,
  review: async (id, payload) => (await api.post(`/community/admin/journeys/${id}/review`, payload)).data.data,
  update: async (id, payload) => (await api.patch(`/community/admin/journeys/${id}`, payload)).data.data,
  remove: async (id) => (await api.delete(`/community/admin/journeys/${id}`)).data.data,
  reports: async (params) => (await api.get('/community/admin/reports', { params })).data.data,
  resolveReport: async (id, payload) => (await api.patch(`/community/admin/reports/${id}`, payload)).data.data,
  comments: async (id) => (await api.get(`/community/admin/journeys/${id}/comments`)).data.data,
  deleteComment: async (id) => (await api.delete(`/community/admin/comments/${id}`)).data.data,
};

export const professorsApi = {
  list: async (params) => (await api.get('/professors', { params })).data.data,
  fields: async () => (await api.get('/professors/fields')).data.data,
  forUniversity: async (universityId, params) =>
    (await api.get(`/professors/university/${universityId}`, { params })).data.data,
};

export default api;
