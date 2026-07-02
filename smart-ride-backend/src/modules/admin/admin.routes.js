// ========== FILE: src/modules/admin/admin.routes.js ==========
const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const adminController = require('./admin.controller');
const adminService = require('./admin.service');
const smartMatchController = require('./admin.smartmatch');

const {
  assignDriverValidator,
  bulkAssignDriverValidator,
  updateSubscriptionStatusValidator,
  updateUserStatusValidator,
  respondComplaintValidator,
  createAdminValidator,
  analyticsQueryValidator,
  rejectDriverValidator
} = require('./admin.validators');

const {
  getUsers, getUserDetails, updateUserStatus, createAdmin, deleteUser,
  getDrivers, getUnverifiedDrivers, verifyDriver, rejectDriver, getDriverSchedule,
  assignDriver, bulkAssignDrivers, unassignDriver, getUnassignedSubscriptions,
  getSubscriptions, updateSubscriptionStatus,
  getComplaints, getComplaintById, respondToComplaint,
  getDashboardStats, getRevenueAnalytics, getSubscriptionAnalytics, getDriverAnalytics, getSystemHealth,
  getDriverRoutes
} = require('./admin.controller');

// ALL routes require admin role
router.use(verifyToken, requireRole('admin'));

// ───────────── USER MANAGEMENT ─────────────
router.get('/users', validate(analyticsQueryValidator), getUsers);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/status', validate(updateUserStatusValidator), updateUserStatus);
router.delete('/users/:id', deleteUser);
router.post('/admins', validate(createAdminValidator), createAdmin);

// ───────────── DRIVER MANAGEMENT ─────────────
router.get('/drivers', getDrivers);
router.get('/drivers/unverified', getUnverifiedDrivers);
router.patch('/drivers/:id/verify', verifyDriver);
router.patch('/drivers/:id/reject', validate(rejectDriverValidator), rejectDriver);
router.get('/drivers/:id/schedule', getDriverSchedule);
router.get('/driver-routes', getDriverRoutes);

// ───────────── ASSIGNMENT ─────────────
router.get('/smart-match/:subscriptionId', smartMatchController.getSmartMatch);
router.post('/assign', validate(assignDriverValidator), assignDriver);
router.post('/assign/bulk', validate(bulkAssignDriverValidator), bulkAssignDrivers);
router.delete('/assign/:subscriptionId', unassignDriver);
router.get('/subscriptions/unassigned', getUnassignedSubscriptions);

// ───────────── SUBSCRIPTION MANAGEMENT ─────────────
router.get('/subscriptions', getSubscriptions);
router.patch('/subscriptions/:id/status', validate(updateSubscriptionStatusValidator), updateSubscriptionStatus);

// ───────────── COMPLAINT MANAGEMENT ─────────────
router.get('/complaints', getComplaints);
router.get('/complaints/:id', getComplaintById);
router.patch('/complaints/:id/respond', validate(respondComplaintValidator), respondToComplaint);

// ───────────── ANALYTICS ─────────────
router.get('/dashboard', getDashboardStats);
router.get('/analytics/revenue', validate(analyticsQueryValidator), getRevenueAnalytics);
router.get('/analytics/subscriptions', validate(analyticsQueryValidator), getSubscriptionAnalytics);
router.get('/analytics/drivers', getDriverAnalytics);
router.get('/analytics/health', getSystemHealth);

// ───────────── Broadcast ─────────────
// POST /api/admin/broadcast
router.post('/broadcast', adminController.sendBroadcast);

module.exports = router;
// ========== END ==========
