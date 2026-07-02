export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
export const MAP_PROVIDER = process.env.REACT_APP_MAP_PROVIDER || 'google';
export const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;
export const MAPPLS_KEY = process.env.REACT_APP_MAPPLS_KEY;
export const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;

export const ROLES = { USER: 'user', DRIVER: 'driver', ADMIN: 'admin' };

export const SUBSCRIPTION_STATUS = {
  PENDING: 'pending', ACTIVE: 'active', PAUSED: 'paused',
  CANCELLED: 'cancelled', EXPIRED: 'expired'
};

export const SUBSCRIPTION_STATUS_COLORS = {
  pending: 'yellow', active: 'green', paused: 'blue',
  cancelled: 'red', expired: 'gray'
};

export const PAYMENT_STATUS = { PENDING: 'pending', SUCCESS: 'success', FAILED: 'failed', REFUNDED: 'refunded' };

export const PLAN_TYPES = { MONTHLY: 'monthly', QUARTERLY: 'quarterly', YEARLY: 'yearly' };

export const COMPLAINT_STATUS = { OPEN: 'open', IN_PROGRESS: 'in_progress', RESOLVED: 'resolved', CLOSED: 'closed' };

export const SOCKET_EVENTS = {
  DRIVER_LOCATION_UPDATE: 'location:driver_update',
  DRIVER_LOCATION_BROADCAST: 'location:broadcast',
  DRIVER_ARRIVED: 'location:driver_arrived',
  RIDE_STARTED: 'ride:started',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_ETA_UPDATE: 'ride:eta_update',
  NEW_NOTIFICATION: 'notification:new',
  NOTIFICATION_COUNT: 'notification:count',
  MARK_READ: 'notification:mark_read',
  ADMIN_BROADCAST: 'admin:broadcast',
  ADMIN_STATS_UPDATE: 'admin:stats_update',
  DRIVER_ONLINE: 'driver:online',
  DRIVER_OFFLINE: 'driver:offline',
  PING: 'ping',
  PONG: 'pong',
  JOIN_ROOM: 'room:join',
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_OTP: '/verify-otp',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  USER_DASHBOARD: '/dashboard',
  USER_SUBSCRIPTIONS: '/dashboard/subscriptions',
  USER_PAYMENTS: '/dashboard/payments',
  USER_PROFILE: '/dashboard/profile',
  USER_NOTIFICATIONS: '/dashboard/notifications',
  USER_COMPLAINTS: '/dashboard/complaints',
  DRIVER_DASHBOARD: '/driver',
  DRIVER_PASSENGERS: '/driver/passengers',
  DRIVER_ATTENDANCE: '/driver/attendance',
  DRIVER_EARNINGS: '/driver/earnings',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_DRIVERS: '/admin/drivers',
  ADMIN_SUBSCRIPTIONS: '/admin/subscriptions',
  ADMIN_ROUTES: '/admin/routes',
  ADMIN_COMPLAINTS: '/admin/complaints',
  ADMIN_ANALYTICS: '/admin/analytics',
};
