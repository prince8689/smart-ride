import api from './axios';

export const getAllRoutes = (params) => api.get('/routes', { params });
export const getRouteById = (id) => api.get(`/routes/${id}`);
export const getCities = () => api.get('/routes/cities');
export const getRoutesByCity = (city) => api.get(`/routes/city/${city}`);
export const createRoute = (data) => api.post('/routes', data);
export const updateRoute = (id, data) => api.patch(`/routes/${id}`, data);
export const deleteRoute = (id) => api.delete(`/routes/${id}`);
