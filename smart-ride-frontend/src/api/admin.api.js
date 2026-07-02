import api from './axios';

// Users
export const getUsers = (params) => api.get('/admin/users', { params });
export const getUserDetails = (id) => api.get(`/admin/users/${id}`);
export const updateUserStatus = (id, data) => api.patch(`/admin/users/${id}/status`, data);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
export const createAdmin = (data) => api.post('/admin/admins', data);

// Drivers
export const getDrivers = (params) => api.get('/admin/drivers', { params });
export const getUnverifiedDrivers = () => api.get('/admin/drivers/unverified');
export const verifyDriver = (id) => api.patch(`/admin/drivers/${id}/verify`);
export const rejectDriver = (id, data) => api.patch(`/admin/drivers/${id}/reject`, data);
export const getDriverSchedule = (id) => api.get(`/admin/drivers/${id}/schedule`);

// Assignment
export const assignDriver = (data) => api.post('/admin/assign', data);
export const bulkAssignDrivers = (data) => api.post('/admin/assign/bulk', data);
export const unassignDriver = (subscriptionId) =>
  api.delete(`/admin/assign/${subscriptionId}`);
export const getUnassignedSubscriptions = (params) =>
  api.get('/admin/subscriptions/unassigned', { params });

// Subscriptions
export const getAdminSubscriptions = (params) =>
  api.get('/admin/subscriptions', { params });
export const updateSubscriptionStatus = (id, data) =>
  api.patch(`/admin/subscriptions/${id}/status`, data);

// Complaints
export const getAdminComplaints = (params) =>
  api.get('/admin/complaints', { params });
export const getComplaintById = (id) => api.get(`/admin/complaints/${id}`);
export const respondToComplaint = (id, data) =>
  api.patch(`/admin/complaints/${id}/respond`, data);

// Analytics
export const getDashboardStats = () => api.get('/admin/dashboard');
export const getRevenueAnalytics = (params) =>
  api.get('/admin/analytics/revenue', { params });
export const getSubscriptionAnalytics = (params) =>
  api.get('/admin/analytics/subscriptions', { params });
export const getDriverAnalytics = () => api.get('/admin/analytics/drivers');
export const getSystemHealth = () => api.get('/admin/analytics/health');

// Routes (admin)
export const getAllDriverRoutes = (params) => api.get('/admin/driver-routes', { params });

// Plans (admin)
export const createPlan = (data) => api.post('/subscriptions/plans', data);
export const updatePlan = (id, data) => api.patch(`/subscriptions/plans/${id}`, data);
export const togglePlan = (id) => api.patch(`/subscriptions/plans/${id}/toggle`);

// Broadcast
export const sendBroadcast = (data) => api.post('/admin/broadcast', data);

// Expire check
export const runExpireCheck = () => api.post('/subscriptions/expire-check');

// Admin accounts
export const getAdminAccounts = () => api.get('/admin/users', { params: { role: 'admin' } });
