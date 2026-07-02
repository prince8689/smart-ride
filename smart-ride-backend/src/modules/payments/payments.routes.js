// ========== FILE: src/modules/payments/payments.routes.js ==========
const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  createOrderValidator,
  verifyPaymentValidator,
  refundValidator,
} = require('./payments.validators');
const {
  createOrder,
  verifyPayment,
  getMyPayments,
  getPaymentById,
  getInvoice,
  initiateRefund,
  getPaymentStats,
  handleWebhook,
  createManualPayment,
  getPendingPayments,
  approveManualPayment,
} = require('./payments.controller');

// ───────────── Webhook Route ─────────────
// Webhook must use raw body parser — BEFORE json middleware
// so that signature validation works correctly.
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// ───────────── Vehicle Owner Routes ─────────────

router.post(
  '/order',
  verifyToken,
  requireRole('user'),
  validate(createOrderValidator),
  createOrder
);

router.post(
  '/verify',
  verifyToken,
  requireRole('user'),
  validate(verifyPaymentValidator),
  verifyPayment
);

router.post(
  '/manual',
  verifyToken,
  requireRole('user'),
  createManualPayment
);

router.get(
  '/my',
  verifyToken,
  requireRole('user'),
  getMyPayments
);

// getInvoice returns HTML, not JSON
router.get(
  '/invoice/:id',
  verifyToken,
  getInvoice
);

router.get(
  '/:id',
  verifyToken,
  getPaymentById
);

router.post(
  '/:id/refund',
  verifyToken,
  requireRole('user'),
  validate(refundValidator),
  initiateRefund
);

// ───────────── Admin Routes ─────────────

router.get(
  '/admin/stats',
  verifyToken,
  requireRole('admin'),
  getPaymentStats
);

router.get(
  '/admin/pending',
  verifyToken,
  requireRole('admin'),
  getPendingPayments
);

router.patch(
  '/admin/:id/approve',
  verifyToken,
  requireRole('admin'),
  approveManualPayment
);

module.exports = router;
// ========== END ==========
