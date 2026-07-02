import axiosInstance from './axios';

export const getPricingConfig = () => axiosInstance.get('/pricing/config');
export const updatePricingConfig = (data) => axiosInstance.patch('/pricing/config', data);
export const calculatePricing = (distance_km, vehicle_type, trip_type = 'round_trip') => 
  axiosInstance.get(`/pricing/calculate?distance_km=${distance_km}&vehicle_type=${vehicle_type}&trip_type=${trip_type}`);
export const calculateSamplePricing = (data) => axiosInstance.post('/pricing/calculate-sample', data);
