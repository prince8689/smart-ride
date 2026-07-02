import React from 'react';

// Shared
export const Home = React.lazy(() => import('../pages/Home'));
export const Login = React.lazy(() => import('../pages/auth/Login'));
export const Register = React.lazy(() => import('../pages/auth/Register'));
export const VerifyOTP = React.lazy(() => import('../pages/auth/VerifyOTP'));
export const ForgotPassword = React.lazy(() => import('../pages/auth/ForgotPassword'));
export const ResetPassword = React.lazy(() => import('../pages/auth/ResetPassword'));
export const NotFound = React.lazy(() => import('../pages/NotFound'));

// User
export const UserDashboard = React.lazy(() => import('../pages/user/Dashboard'));
export const UserProfile = React.lazy(() => import('../pages/user/Profile'));
export const BookSubscription = React.lazy(() => import('../pages/user/BookSubscription'));
export const MySubscriptions = React.lazy(() => import('../pages/user/MySubscriptions'));
export const UserPayments = React.lazy(() => import('../pages/user/Payments'));
export const UserNotifications = React.lazy(() => import('../pages/user/Notifications'));
export const UserComplaints = React.lazy(() => import('../pages/user/Complaints'));
export const InvoicePrint = React.lazy(() => import('../pages/InvoicePrint'));

// Driver
export const DriverDashboard = React.lazy(() => import('../pages/driver/DriverDashboard'));
export const DriverProfile = React.lazy(() => import('../pages/driver/DriverProfile'));
export const Passengers = React.lazy(() => import('../pages/driver/Passengers'));
export const Attendance = React.lazy(() => import('../pages/driver/Attendance'));
export const DriverMap = React.lazy(() => import('../pages/driver/DriverMap'));
export const Earnings = React.lazy(() => import('../pages/driver/Earnings'));

// Admin
export const AdminDashboard = React.lazy(() => import('../pages/admin/AdminDashboard'));
export const AdminUsers = React.lazy(() => import('../pages/admin/Users'));
export const AdminDrivers = React.lazy(() => import('../pages/admin/Drivers'));
export const AdminUnverifiedDrivers = React.lazy(() => import('../pages/admin/UnverifiedDrivers'));
export const AdminDriverAssignment = React.lazy(() => import('../pages/admin/DriverAssignment'));
export const AdminSubscriptions = React.lazy(() => import('../pages/admin/AdminSubscriptions'));
export const AdminPlans = React.lazy(() => import('../pages/admin/AdminPlans'));
export const AdminRoutes = React.lazy(() => import('../pages/admin/AdminRoutes'));
export const AdminComplaints = React.lazy(() => import('../pages/admin/AdminComplaints'));
export const AdminAccounts = React.lazy(() => import('../pages/admin/AdminAccounts'));
export const AdminAnalytics = React.lazy(() => import('../pages/admin/Analytics'));
export const AdminBroadcast = React.lazy(() => import('../pages/admin/Broadcast'));
export const SystemHealth = React.lazy(() => import('../pages/admin/SystemHealth'));
export const AdminSettings = React.lazy(() => import('../pages/admin/SiteSettings'));
export const AdminQueries = React.lazy(() => import('../pages/admin/AdminQueries'));
export const AdminPriceConfiguration = React.lazy(() => import('../pages/admin/PriceConfiguration'));
export const AdminPendingPayments = React.lazy(() => import('../pages/admin/PendingPayments'));
