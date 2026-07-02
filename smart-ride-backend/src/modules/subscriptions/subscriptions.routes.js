// ========== FILE: src/modules/subscriptions/subscriptions.routes.js ==========
const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const subscriptionsController = require('./subscriptions.controller');
const {
  createPlanValidator,
  updatePlanValidator,
  createSubscriptionValidator,
  cancelSubscriptionValidator,
} = require('./subscriptions.validators');

// Optional auth for plan fetching (admins see inactive plans too)
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return verifyToken(req, res, next);
  }
  next();
};

// ───────────── Public Routes ─────────────

// GET /api/subscriptions/plans
router.get('/plans', optionalAuth, subscriptionsController.getAllPlans);

// GET /api/subscriptions/plans/:id
router.get('/plans/:id', subscriptionsController.getPlanById);

// ───────────── Admin Routes (Plans & Stats) ─────────────

// POST /api/subscriptions/plans
router.post(
  '/plans',
  verifyToken,
  requireRole('admin'),
  validate(createPlanValidator),
  subscriptionsController.createPlan
);

// PATCH /api/subscriptions/plans/:id
router.patch(
  '/plans/:id',
  verifyToken,
  requireRole('admin'),
  validate(updatePlanValidator),
  subscriptionsController.updatePlan
);

// PATCH /api/subscriptions/plans/:id/toggle
router.patch(
  '/plans/:id/toggle',
  verifyToken,
  requireRole('admin'),
  subscriptionsController.togglePlan
);

// GET /api/subscriptions/stats
router.get('/stats', verifyToken, requireRole('admin'), subscriptionsController.getStats);

// POST /api/subscriptions/expire-check (Manual trigger for admin)
router.post('/expire-check', verifyToken, requireRole('admin'), subscriptionsController.expireSubscriptions);

// ───────────── User Routes (Subscriptions) ─────────────

// POST /api/subscriptions
router.post(
  '/',
  verifyToken,
  requireRole('user'),
  validate(createSubscriptionValidator),
  subscriptionsController.createSubscription
);

// GET /api/subscriptions/my
router.get(
  '/my',
  verifyToken,
  requireRole('user'),
  subscriptionsController.getMySubscriptions
);

// GET /api/subscriptions/:id
router.get(
  '/:id',
  verifyToken,
  subscriptionsController.getSubscriptionById
);

// PATCH /api/subscriptions/:id/cancel
router.patch(
  '/:id/cancel',
  verifyToken,
  requireRole('user'),
  validate(cancelSubscriptionValidator),
  subscriptionsController.cancelSubscription
);

// POST /api/subscriptions/:id/renew
router.post(
  '/:id/renew',
  verifyToken,
  requireRole('user'),
  subscriptionsController.renewSubscription
);

module.exports = router;
// ========== END ==========
