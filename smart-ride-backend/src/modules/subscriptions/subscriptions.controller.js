// ========== FILE: src/modules/subscriptions/subscriptions.controller.js ==========
const { successResponse, errorResponse, paginatedResponse } = require('../../utils/response');
const logger = require('../../utils/logger');
const subscriptionsService = require('./subscriptions.service');

// ───────────── Error Code → HTTP Response Map ─────────────
const ERROR_MAP = {
  PLAN_NOT_FOUND: { status: 404, message: 'Subscription plan not found' },
  PLAN_EXISTS: { status: 409, message: 'Plan with this name already exists' },
  PLAN_INACTIVE: { status: 400, message: 'This plan is currently unavailable' },
  ROUTE_NOT_FOUND: { status: 404, message: 'Route not found' },
  ROUTE_INACTIVE: { status: 400, message: 'This route is currently unavailable' },
  ALREADY_SUBSCRIBED: { status: 409, message: 'You already have an active subscription on this route' },
  CANNOT_CANCEL: { status: 400, message: 'Only active or pending subscriptions can be cancelled' },
  CANNOT_RENEW: { status: 400, message: 'Only expired or cancelled subscriptions can be renewed' },
  NOT_FOUND: { status: 404, message: 'Subscription not found' },
};

const handleServiceError = (res, error) => {
  const mapped = ERROR_MAP[error.message];
  if (mapped) {
    return errorResponse(res, mapped.message, mapped.status);
  }
  logger.error(error.message, { stack: error.stack });
  return errorResponse(res, 'Something went wrong', 500);
};

// ───────────── Plans Controllers ─────────────

const getAllPlans = async (req, res) => {
  try {
    const includeInactive = req.user && req.user.role === 'admin';
    const plans = await subscriptionsService.getAllPlans(includeInactive);
    return successResponse(res, plans, 'Plans fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getPlanById = async (req, res) => {
  try {
    const plan = await subscriptionsService.getPlanById(req.params.id);
    return successResponse(res, plan, 'Plan details fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const createPlan = async (req, res) => {
  try {
    const plan = await subscriptionsService.createPlan(req.body);
    return successResponse(res, plan, 'Plan created successfully', 201);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const updatePlan = async (req, res) => {
  try {
    const plan = await subscriptionsService.updatePlan(req.params.id, req.body);
    return successResponse(res, plan, 'Plan updated successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const togglePlan = async (req, res) => {
  try {
    const plan = await subscriptionsService.togglePlanStatus(req.params.id);
    const status = plan.is_active ? 'activated' : 'deactivated';
    return successResponse(res, plan, `Plan ${status} successfully`);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Subscription Controllers ─────────────

const createSubscription = async (req, res) => {
  try {
    const subscription = await subscriptionsService.createSubscription(req.user.id, req.body);
    return successResponse(res, subscription, 'Subscription created successfully. Please complete payment.', 201);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getMySubscriptions = async (req, res) => {
  try {
    const data = await subscriptionsService.getUserSubscriptions(req.user.id);
    return successResponse(res, data, 'Subscriptions fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await subscriptionsService.getSubscriptionById(req.params.id, req.user.id, req.user.role);
    return successResponse(res, subscription, 'Subscription details fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const result = await subscriptionsService.cancelSubscription(req.params.id, req.user.id);
    return successResponse(res, null, result.message);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const renewSubscription = async (req, res) => {
  try {
    const subscription = await subscriptionsService.renewSubscription(req.params.id, req.user.id);
    return successResponse(res, subscription, 'Subscription renewed successfully. Please complete payment.', 201);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await subscriptionsService.getSubscriptionStats();
    return successResponse(res, stats, 'Subscription stats fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const expireSubscriptions = async (req, res) => {
  try {
    const result = await subscriptionsService.checkAndExpireSubscriptions();
    return successResponse(res, result, `Expired ${result.expired_count} subscriptions`);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

module.exports = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  togglePlan,
  createSubscription,
  getMySubscriptions,
  getSubscriptionById,
  cancelSubscription,
  renewSubscription,
  getStats,
  expireSubscriptions,
};
// ========== END ==========
