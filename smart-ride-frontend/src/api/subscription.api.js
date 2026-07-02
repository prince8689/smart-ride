import api from './axios';

export const getAllPlans = (includeInactive) =>
  api.get('/subscriptions/plans', { params: { includeInactive } });
export const getPlanById = (id) => api.get(`/subscriptions/plans/${id}`);
export const createSubscription = (data) => api.post('/subscriptions', data);
export const getMySubscriptions = (params) => api.get('/subscriptions/my', { params });
export const getSubscriptionById = (id) => api.get(`/subscriptions/${id}`);
export const cancelSubscription = (id, data) =>
  api.patch(`/subscriptions/${id}/cancel`, data);
export const renewSubscription = (id) => api.post(`/subscriptions/${id}/renew`);
export const getSubscriptionStats = () => api.get('/subscriptions/stats');
