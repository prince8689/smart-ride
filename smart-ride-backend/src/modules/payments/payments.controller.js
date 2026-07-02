// ========== FILE: src/modules/payments/payments.controller.js ==========
const { successResponse, errorResponse, paginatedResponse } = require('../../utils/response');
const logger = require('../../utils/logger');
const paymentsService = require('./payments.service');

// ───────────── Error Code → HTTP Response Map ─────────────
const ERROR_MAP = {
  SUBSCRIPTION_NOT_PENDING: { status: 400, message: 'Subscription is not in pending state' },
  ALREADY_PAID: { status: 409, message: 'Payment already completed for this subscription' },
  INVALID_SIGNATURE: { status: 400, message: 'Payment verification failed. Invalid signature' },
  PAYMENT_NOT_FOUND: { status: 404, message: 'Payment record not found' },
  CANNOT_REFUND: { status: 400, message: 'Only successful payments can be refunded' },
  REFUND_WINDOW_EXPIRED: { status: 400, message: 'Refund window has expired (24 hours after payment)' },
  INVALID_WEBHOOK: { status: 400, message: 'Invalid webhook signature' },
  NOT_FOUND: { status: 404, message: 'Resource not found' },
};

const handleServiceError = (res, error) => {
  const mapped = ERROR_MAP[error.message];
  if (mapped) {
    return errorResponse(res, mapped.message, mapped.status);
  }
  logger.error(error.message, { stack: error.stack });
  return errorResponse(res, 'Something went wrong', 500);
};

// ───────────── Create Razorpay Order ─────────────
const createOrder = async (req, res) => {
  try {
    const { subscription_id } = req.body;
    const orderData = await paymentsService.createRazorpayOrder(req.user.id, subscription_id);
    return successResponse(res, orderData, 'Order created successfully', 201);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Verify Payment ─────────────
const verifyPayment = async (req, res) => {
  try {
    const result = await paymentsService.verifyPayment(req.user.id, req.body);
    return successResponse(res, result, result.message);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get My Payments ─────────────
const getMyPayments = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const data = await paymentsService.getUserPayments(req.user.id, { status, page, limit });
    return paginatedResponse(res, data.payments, data.total, data.page, data.limit);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Payment by ID ─────────────
const getPaymentById = async (req, res) => {
  try {
    const payment = await paymentsService.getPaymentById(req.params.id, req.user.id, req.user.role);
    return successResponse(res, payment, 'Payment details fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Invoice HTML ─────────────
const getInvoice = async (req, res) => {
  try {
    const html = await paymentsService.getInvoiceHTML(req.params.id, req.user.id, req.user.role);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Initiate Refund ─────────────
const initiateRefund = async (req, res) => {
  try {
    const { payment_id, reason } = req.body;
    const result = await paymentsService.initiateRefund(payment_id, req.user.id, reason);
    return successResponse(res, result, result.message);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Admin: Get Stats ─────────────
const getPaymentStats = async (req, res) => {
  try {
    const stats = await paymentsService.getPaymentStats();
    return successResponse(res, stats, 'Payment statistics fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Handle Webhook ─────────────
const handleWebhook = async (req, res) => {
  try {
    // req.body is a raw buffer because we used express.raw() in the router
    const signature = req.headers['x-razorpay-signature'];
    
    // Pass raw body and signature to service
    await paymentsService.handleWebhook(req.body, signature);
    
    // Webhooks must always return 200 OK to prevent infinite retries
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    // Return 200 even on error to stop retries, but we logged it
    return res.status(200).json({ status: 'error', message: 'Webhook processing failed' });
  }
};

// ───────────── Manual UPI Payments ─────────────
const createManualPayment = async (req, res) => {
  try {
    const { subscription_plan_id, payment_receipt_url } = req.body;
    if (!payment_receipt_url) return errorResponse(res, 'Payment receipt is required', 400);
    const result = await paymentsService.createManualPayment(req.user.id, subscription_plan_id, payment_receipt_url);
    return successResponse(res, result, 'Manual payment submitted successfully. Waiting for admin approval.', 201);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getPendingPayments = async (req, res) => {
  try {
    const result = await paymentsService.getPendingManualPayments();
    return successResponse(res, result, 'Pending payments fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const approveManualPayment = async (req, res) => {
  try {
    const result = await paymentsService.approveManualPayment(req.params.id);
    return successResponse(res, result, 'Payment approved successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

module.exports = {
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
};
// ========== END ==========
