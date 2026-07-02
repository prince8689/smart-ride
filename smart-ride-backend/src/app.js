const express = require('express');
const compression = require('compression');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./utils/logger');
const { query } = require('./config/db');
const { errorResponse } = require('./utils/response');

const { helmetConfig, corsConfig, sanitizeInput, requestId } = require('./middleware/security');
const { authLimiter, otpLimiter, apiLimiter, pricingLimiter, adminLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./modules/auth/auth.routes');
const pricingRoutes = require('./modules/pricing/pricing.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const driversRoutes = require('./modules/drivers/drivers.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const pushRoutes = require('./modules/notifications/push.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const queriesRoutes = require('./modules/queries/queries.routes');
const ratingsRoutes = require('./modules/ratings/ratings.routes');
const routesRoutes = require('./modules/routes/routes.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const subscriptionsRoutes = require('./modules/subscriptions/subscriptions.routes');
const uploadRoutes = require('./modules/upload/upload.routes');
const usersRoutes = require('./modules/users/users.routes');

const app = express();

// Apply middleware
app.use(helmetConfig);
app.use(corsConfig);
app.use(compression());
app.use(requestId);
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeInput);
app.use(morgan('combined', { stream: logger.stream }));

// Serve uploaded files statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'healthy';
  try {
    await query('SELECT 1');
  } catch (error) {
    dbStatus = 'error';
  }

  res.json({
    status: 'ok',
    database: dbStatus,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime()
  });
});

// Rate limiting
app.use('/api/auth/verify-email-otp', otpLimiter);
app.use('/api/auth/verify-phone-otp', otpLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/pricing/calculate', pricingLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api', apiLimiter);

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/queries', queriesRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', usersRoutes);

// ─── V2 API Routes ──────────────────────────────────────────────────────────
const v2PricingRoutes = require('./modules/v2/pricing/pricing.v2.routes');
const v2DriverRouteRoutes = require('./modules/v2/driverRoute/driverRoute.v2.routes');
const v2SubscriptionRoutes = require('./modules/v2/subscription/subscription.v2.routes');
const v2AttendanceRoutes = require('./modules/v2/attendance/attendance.v2.routes');
const v2ReplacementRoutes = require('./modules/v2/replacement/replacement.v2.routes');
const v2WalletRoutes = require('./modules/v2/wallet/wallet.v2.routes');
const v2AttendanceController = require('./modules/v2/attendance/attendance.v2.controller');
const v2ReplacementController = require('./modules/v2/replacement/replacement.v2.controller');
const v2SubscriptionController = require('./modules/v2/subscription/subscription.v2.controller');

app.use('/api/v2/pricing', v2PricingRoutes);
app.use('/api/v2/driver/route', v2DriverRouteRoutes);
app.use('/api/v2/subscription', v2SubscriptionRoutes);
app.use('/api/v2/driver/attendance', v2AttendanceRoutes);
app.use('/api/v2/wallet', v2WalletRoutes);

// V2 admin routes (mounted individually)
const { verifyToken: v2VerifyToken, requireRole: v2RequireRole } = require('./middleware/auth');
app.post('/api/v2/admin/replacement/trigger', v2VerifyToken, v2RequireRole('admin'), v2ReplacementController.triggerReplacement);
app.post('/api/v2/admin/assignment/manual', v2VerifyToken, v2RequireRole('admin'), v2SubscriptionController.manualAssignment);
app.get('/api/v2/admin/attendance/summary', v2VerifyToken, v2RequireRole('admin'), v2AttendanceController.getAdminSummary);

// V2 driver emergency route
app.post('/api/v2/driver/emergency/report', v2VerifyToken, v2RequireRole('driver'), v2ReplacementController.reportEmergency);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `${req.method} ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', { message: err.message, stack: err.stack, id: req.id });
  return errorResponse(res, 'Internal Server Error', 500);
});

module.exports = app;

