import api from './axios';

export const register = (data) => api.post('/auth/register', data);
export const verifyOTP = (data) => api.post('/auth/verify-email-otp', data);
export const resendOTP = (data) => api.post('/auth/resend-email-otp', data);
export const login = (data) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout').catch(() => {});
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);
export const changePassword = (data) => api.post('/auth/change-password', data);
export const getMe = () => api.get('/auth/me');
export const googleLogin = (data) => api.post('/auth/google', data);
