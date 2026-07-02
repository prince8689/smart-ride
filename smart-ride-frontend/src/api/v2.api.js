import api from './axios';

// ─── V2 Pricing ─────────────────────────────────────────────────────────────
export const calculateV2Pricing = (data) => api.post('/v2/pricing/calculate', data);

// ─── V2 Driver Route ────────────────────────────────────────────────────────
export const registerDriverRoute = (data) => api.post('/v2/driver/route/register', data);
export const getMyDriverRoutes = () => api.get('/v2/driver/route/my-routes');
export const getDriverRouteById = (id) => api.get(`/v2/driver/route/${id}`);
export const updateDriverRoute = (id, data) => api.put(`/v2/driver/route/${id}`, data);
export const updateDriverRouteStatus = (id, data) => api.put(`/v2/driver/route/${id}/status`, data);

// ─── V2 Subscription / Matching ─────────────────────────────────────────────
export const findMatchingDrivers = (data) => api.post('/v2/subscription/find-drivers', data);
export const confirmSubscriptionDriver = (data) => api.post('/v2/subscription/confirm-driver', data);

// ─── V2 Attendance ──────────────────────────────────────────────────────────
export const markV2Attendance = (data) => api.post('/v2/driver/attendance/mark', data);
export const getV2TodayAttendance = () => api.get('/v2/driver/attendance/today');
export const getV2AttendanceHistory = (month) => api.get(`/v2/driver/attendance/history?month=${month}`);

// ─── V2 Wallet ──────────────────────────────────────────────────────────────
export const getDriverWalletBalance = () => api.get('/v2/wallet/driver/balance');
export const getDriverWalletTransactions = (page = 1, limit = 20) =>
  api.get(`/v2/wallet/driver/transactions?page=${page}&limit=${limit}`);
export const getPlatformWalletStats = () => api.get('/v2/wallet/platform/stats');
export const settleDriverWallet = (driverId) => api.post(`/v2/wallet/admin/settle/${driverId}`);

// ─── V2 Admin ───────────────────────────────────────────────────────────────
export const triggerDriverReplacement = (data) => api.post('/v2/admin/replacement/trigger', data);
export const manualDriverAssignment = (data) => api.post('/v2/admin/assignment/manual', data);
export const getAdminAttendanceSummary = (date) => api.get(`/v2/admin/attendance/summary?date=${date}`);

// ─── V2 Driver Emergency ────────────────────────────────────────────────────
export const reportDriverEmergency = (data) => api.post('/v2/driver/emergency/report', data);
