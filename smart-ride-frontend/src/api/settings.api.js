import api from './axios';

export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.patch('/settings', data);

export const submitQuery = (data) => api.post('/queries', data);
export const getQueries = () => api.get('/queries');
export const resolveQuery = (id, data) => api.patch(`/queries/${id}/resolve`, data);
