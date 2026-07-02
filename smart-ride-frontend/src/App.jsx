import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import NetworkStatus from './components/ui/NetworkStatus';
import PageLoader from './components/ui/PageLoader';
import ProtectedRoute from './components/shared/ProtectedRoute';
import RoleRoute from './components/shared/RoleRoute';
import UserLayout from './components/layout/UserLayout';
import DriverLayout from './components/layout/DriverLayout';
import AdminLayout from './components/layout/AdminLayout';
import OnboardingGuard from './components/driver/OnboardingGuard';

// PWA Components
import InstallPrompt from './components/pwa/InstallPrompt';
import UpdatePrompt from './components/pwa/UpdatePrompt';
import OfflineIndicator from './components/pwa/OfflineIndicator';

import {
  Home, Login, Register, VerifyOTP, ForgotPassword, ResetPassword, NotFound,
  UserDashboard as Dashboard, BookSubscription, MySubscriptions, UserPayments, UserNotifications, UserComplaints, UserProfile, InvoicePrint,
  DriverDashboard, DriverMap, Passengers, Attendance, Earnings, DriverProfile,
  AdminDashboard, AdminUsers as Users, AdminDrivers as Drivers, AdminUnverifiedDrivers as UnverifiedDrivers,
  AdminDriverAssignment as DriverAssignment, AdminSubscriptions, AdminRoutes, AdminPlans,
  AdminComplaints, AdminAnalytics as Analytics, SystemHealth, AdminBroadcast as Broadcast, AdminAccounts, AdminSettings, AdminQueries, AdminPriceConfiguration, AdminPendingPayments
} from './utils/lazyImports';
import ChunkErrorBoundary from './components/shared/ChunkErrorBoundary';

// Helper to wrap user pages in layout
const UserPage = ({ title, component: Component }) => (
  <ProtectedRoute>
    <RoleRoute allowedRoles={['user']}>
      <UserLayout pageTitle={title}>
        <Component />
      </UserLayout>
    </RoleRoute>
  </ProtectedRoute>
);

// Helper to wrap driver pages in layout
const DriverPage = ({ title, component: Component }) => (
  <ProtectedRoute>
    <RoleRoute allowedRoles={['driver']}>
      <OnboardingGuard>
        <DriverLayout pageTitle={title}>
          <Component />
        </DriverLayout>
      </OnboardingGuard>
    </RoleRoute>
  </ProtectedRoute>
);

// Helper to wrap admin pages in layout
const AdminPage = ({ title, component: Component }) => (
  <ProtectedRoute>
    <RoleRoute allowedRoles={['admin']}>
      <AdminLayout pageTitle={title}>
        <Component />
      </AdminLayout>
    </RoleRoute>
  </ProtectedRoute>
);

export default function App() {
  return (
    <ErrorBoundary>
      <div id="sr-announcer" aria-live="polite" className="sr-only"></div>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <NetworkStatus />
            <OfflineIndicator />
            <InstallPrompt />
            <UpdatePrompt />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '12px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                },
                success: {
                  iconTheme: { primary: '#2563EB', secondary: '#fff' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#fff' },
                },
              }}
            />
            <ChunkErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-otp" element={<VerifyOTP />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* User Dashboard */}
                  <Route path="/dashboard" element={<UserPage title="Dashboard" component={Dashboard} />} />
                  <Route path="/dashboard/book" element={<UserPage title="Book Subscription" component={BookSubscription} />} />
                  <Route path="/dashboard/subscriptions" element={<UserPage title="My Subscriptions" component={MySubscriptions} />} />
                  <Route path="/dashboard/payments" element={<UserPage title="Payments" component={UserPayments} />} />
                  <Route path="/dashboard/notifications" element={<UserPage title="Notifications" component={UserNotifications} />} />
                  <Route path="/dashboard/complaints" element={<UserPage title="Complaints" component={UserComplaints} />} />
                  <Route path="/dashboard/profile" element={<UserPage title="Profile" component={UserProfile} />} />

                  {/* Driver Dashboard */}
                  <Route path="/driver" element={<DriverPage title="Dashboard" component={DriverDashboard} />} />
                  <Route path="/driver/map" element={<DriverPage title="Live Map" component={DriverMap} />} />
                  <Route path="/driver/passengers" element={<DriverPage title="My Passengers" component={Passengers} />} />
                  <Route path="/driver/attendance" element={<DriverPage title="Attendance" component={Attendance} />} />
                  <Route path="/driver/earnings" element={<DriverPage title="Earnings" component={Earnings} />} />
                  <Route path="/driver/profile" element={<DriverPage title="Profile" component={DriverProfile} />} />

                  {/* Admin Dashboard */}
                  <Route path="/admin" element={<AdminPage title="Dashboard" component={AdminDashboard} />} />
                  <Route path="/admin/users" element={<AdminPage title="Users" component={Users} />} />
                  <Route path="/admin/drivers" element={<AdminPage title="Drivers" component={Drivers} />} />
                  <Route path="/admin/drivers/unverified" element={<AdminPage title="Pending Verification" component={UnverifiedDrivers} />} />
                  <Route path="/admin/subscriptions" element={<AdminPage title="Subscriptions" component={AdminSubscriptions} />} />
                  <Route path="/admin/subscriptions/unassigned" element={<AdminPage title="Unassigned Subscriptions" component={DriverAssignment} />} />
                  <Route path="/admin/routes" element={<AdminPage title="Routes" component={AdminRoutes} />} />
                  <Route path="/admin/plans" element={<AdminPage title="Subscription Plans" component={AdminPlans} />} />
                  <Route path="/admin/pricing" element={<AdminPage title="Price Configuration" component={AdminPriceConfiguration} />} />
                  <Route path="/admin/pending-payments" element={<AdminPage title="Pending Payments" component={AdminPendingPayments} />} />
                  <Route path="/admin/complaints" element={<AdminPage title="Complaints" component={AdminComplaints} />} />
                  <Route path="/admin/analytics" element={<AdminPage title="Analytics" component={Analytics} />} />
                  <Route path="/admin/health" element={<AdminPage title="System Health" component={SystemHealth} />} />
                  <Route path="/admin/settings" element={<AdminPage title="Settings" component={AdminSettings} />} />
                  <Route path="/admin/queries" element={<AdminPage title="Queries" component={AdminQueries} />} />
                  <Route path="/admin/broadcast" element={<AdminPage title="Broadcast" component={Broadcast} />} />
                  <Route path="/admin/admins" element={<AdminPage title="Admin Accounts" component={AdminAccounts} />} />

                  {/* Invoice */}
                  <Route path="/invoice/:paymentId" element={<ProtectedRoute><InvoicePrint /></ProtectedRoute>} />

                  {/* Fallback */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ChunkErrorBoundary>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
