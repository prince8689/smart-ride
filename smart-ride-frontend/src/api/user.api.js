import api from './axios';

export const getProfile = () => api.get('/users/profile');
export const updateProfile = (data) => api.patch('/users/profile', data);
export const getMySubscriptions = (params) => api.get('/users/subscriptions', { params });
export const getActiveDriverLocation = () => api.get('/users/active-driver-location');
export const getMyPayments = (params) => api.get('/users/payments', { params });
export const getNotifications = (params) => api.get('/users/notifications', { params });
export const markNotificationRead = (id) => api.patch(`/users/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/users/notifications/read-all');
export const submitComplaint = (data) => api.post('/users/complaints', data);
export const getComplaints = () => api.get('/users/complaints');
export const deleteAccount = () => api.delete('/users/account');
