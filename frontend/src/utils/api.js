import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  getMe: () => api.get('/auth/me'),
};

export const placesAPI = {
  getAll: (params) => api.get('/places', { params }),
  getById: (id) => api.get(`/places/${id}`),
  search: (q) => api.get('/places/search', { params: { q } }),
  getTypes: () => api.get('/places/types'),
  getRandom: (count, type_id) => api.get('/places/random', { params: { count, type_id: type_id || undefined } }),
  create: (formData) => api.post('/places', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/places/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/places/${id}`),
};

export const reviewsAPI = {
  getByPlace: (placeId, params) => api.get(`/reviews/place/${placeId}`, { params }),
  getStats: (placeId) => api.get(`/reviews/place/${placeId}/stats`),
  create: (formData) => api.post('/reviews', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  vote: (id) => api.post(`/reviews/${id}/vote`),
  delete: (id) => api.delete(`/reviews/${id}`),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAllPlaces: () => api.get('/admin/places'),
  getAllReviews: () => api.get('/admin/reviews'),
  getAllUsers: () => api.get('/admin/users'),
};

export default api;
