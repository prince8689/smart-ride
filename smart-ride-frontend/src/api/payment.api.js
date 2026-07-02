import api from './axios';

export const createOrder = (data) => api.post('/payments/order', data);
export const verifyPayment = (data) => api.post('/payments/verify', data);
export const getMyPayments = (params) => api.get('/payments/my', { params });
export const getPaymentById = (id) => api.get(`/payments/${id}`);
export const getInvoiceHTML = (id) => api.get(`/payments/invoice/${id}`);
export const initiateRefund = (id, data) => api.post(`/payments/${id}/refund`, data);
export const getPaymentStats = () => api.get('/payments/admin/stats');

// Manual UPI Payments
export const createManualPayment = (data) => api.post('/payments/manual', data);
export const getPendingManualPayments = () => api.get('/payments/admin/pending');
export const approveManualPayment = (id) => api.patch(`/payments/admin/${id}/approve`);
