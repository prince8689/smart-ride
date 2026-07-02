// ========== FILE: src/modules/users/users.routes.js ==========
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const usersController = require('./users.controller');
const {
  updateProfileValidator,
  submitComplaintValidator,
} = require('./users.validators');

// All routes require authentication
router.use(verifyToken);

// ───────────── Profile ─────────────
// GET  /api/users/profile
router.get('/profile', usersController.getProfile);

// PATCH /api/users/profile
router.patch('/profile', validate(updateProfileValidator), usersController.updateProfile);

// ───────────── Subscriptions & Payments ─────────────
// GET /api/users/subscriptions
router.get('/subscriptions', usersController.getMySubscriptions);

// GET /api/users/active-driver-location
router.get('/active-driver-location', usersController.getActiveDriverLocation);

// GET /api/users/payments
router.get('/payments', usersController.getMyPayments);

// ───────────── Notifications ─────────────
// PATCH /api/users/notifications/read-all  (must come BEFORE /:id to avoid route collision)
router.patch('/notifications/read-all', usersController.markAllRead);

// GET  /api/users/notifications
router.get('/notifications', usersController.getNotifications);

// PATCH /api/users/notifications/:id/read
router.patch('/notifications/:id/read', usersController.markNotificationRead);

// ───────────── Complaints ─────────────
// POST /api/users/complaints
router.post('/complaints', validate(submitComplaintValidator), usersController.submitComplaint);

// GET /api/users/complaints
router.get('/complaints', usersController.getComplaints);

// ───────────── Account ─────────────
// DELETE /api/users/account
router.delete('/account', usersController.deleteAccount);

module.exports = router;
// ========== END ==========
