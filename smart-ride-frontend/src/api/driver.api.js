import api from './axios';

export const createProfile = (data) => api.post('/drivers/profile', data);
export const addVehicle = (data) => api.post('/drivers/vehicles', data);
export const getProfile = () => api.get('/drivers/profile');
export const updateProfile = (data) => api.patch('/drivers/profile', data);
export const updateLocation = (data) => api.patch('/drivers/location', data);
export const getAssignedPassengers = () => api.get('/drivers/passengers');
export const markAttendance = (data) => api.post('/drivers/attendance', data);
export const getAttendance = (params) => api.get('/drivers/attendance', { params });
export const getEarnings = () => api.get('/drivers/earnings');
export const getDashboardStats = () => api.get('/drivers/dashboard');
export const getMyVehicles = () => api.get('/drivers/vehicles');
export const uploadDocuments = (formData) => api.post('/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});
