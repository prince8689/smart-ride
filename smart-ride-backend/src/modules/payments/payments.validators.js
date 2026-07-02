// ========== FILE: src/modules/payments/payments.validators.js ==========
const { body } = require('express-validator');

// ───────────── Create Razorpay Order ─────────────
const createOrderValidator = [
  body('subscription_id')
    .notEmpty()
    .withMessage('Subscription ID is required')
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),
];

// ───────────── Verify Razorpay Payment ─────────────
const verifyPaymentValidator = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay Order ID is required')
    .trim(),

  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay Payment ID is required')
    .trim(),

  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay Signature is required')
    .trim(),

  body('subscription_id')
    .notEmpty()
    .withMessage('Subscription ID is required')
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),
];

// ───────────── Initiate Refund ─────────────
const refundValidator = [
  body('payment_id')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isUUID()
    .withMessage('Payment ID must be a valid UUID'),

  body('reason')
    .notEmpty()
    .withMessage('Refund reason is required')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
];

module.exports = {
  createOrderValidator,
  verifyPaymentValidator,
  refundValidator,
};
// ========== END ==========
