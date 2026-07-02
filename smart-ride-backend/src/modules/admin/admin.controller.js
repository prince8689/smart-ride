// ========== FILE: src/modules/admin/admin.controller.js ==========
const { successResponse, errorResponse, paginatedResponse } = require('../../utils/response');
const logger = require('../../utils/logger');
const adminService = require('./admin.service');

const ERROR_MAP = {
  USER_NOT_FOUND: { status: 404, message: 'User not found' },
  CANNOT_MODIFY_ADMIN: { status: 403, message: 'Cannot modify admin account' },
  CANNOT_DEACTIVATE_SELF: { status: 403, message: 'You cannot deactivate your own account' },
  EMAIL_EXISTS: { status: 409, message: 'Email already registered' },
  PHONE_EXISTS: { status: 409, message: 'Phone already registered' },
  DRIVER_NOT_FOUND: { status: 404, message: 'Driver not found' },
  NO_VEHICLE: { status: 400, message: 'Driver must have at least one vehicle before verification' },
  SUBSCRIPTION_NOT_FOUND: { status: 404, message: 'Subscription not found' },
  SUBSCRIPTION_NOT_ACTIVE: { status: 400, message: 'Can only assign driver to active subscriptions' },
  DRIVER_NOT_VERIFIED: { status: 400, message: 'Driver must be verified before assignment' },
  DRIVER_NOT_AVAILABLE: { status: 400, message: 'Driver is not available' },
  VEHICLE_MISMATCH: { status: 400, message: 'Vehicle does not belong to this driver' },
  DRIVER_SLOT_CONFLICT: { status: 409, message: 'Driver already assigned to another subscription route' },
  INVALID_STATUS_TRANSITION: { status: 400, message: 'Invalid subscription status transition' },
  COMPLAINT_NOT_FOUND: { status: 404, message: 'Complaint not found' },
  COMPLAINT_CLOSED: { status: 400, message: 'Cannot respond to a closed complaint' }
};

const handleAdminError = (res, error) => {
  const mapped = ERROR_MAP[error.message];
  if (mapped) return errorResponse(res, mapped.message, mapped.status);
  logger.error(error.message, { stack: error.stack });
  return errorResponse(res, 'Something went wrong on the server', 500);
};

// ───────────── Users ─────────────
const getUsers = async (req, res) => {
  try {
    const data = await adminService.getAllUsers(req.query);
    return paginatedResponse(res, data.users, data.total, data.page, data.limit);
  } catch (error) { return handleAdminError(res, error); }
};

const getUserDetails = async (req, res) => {
  try {
    const user = await adminService.getUserDetails(req.params.id);
    return successResponse(res, user, 'User details fetched');
  } catch (error) { return handleAdminError(res, error); }
};

const updateUserStatus = async (req, res) => {
  try {
    const user = await adminService.updateUserStatus(req.params.id, req.body.is_active, req.body.reason, req.user.id);
    return successResponse(res, user, 'User status updated');
  } catch (error) { return handleAdminError(res, error); }
};

const createAdmin = async (req, res) => {
  try {
    const admin = await adminService.createAdmin(req.body);
    return successResponse(res, admin, 'Admin created successfully', 201);
  } catch (error) { return handleAdminError(res, error); }
};

const deleteUser = async (req, res) => {
  try {
    const result = await adminService.deleteUserPermanently(req.params.id, req.user.id);
    return successResponse(res, result, 'User deleted permanently');
  } catch (error) { return handleAdminError(res, error); }
};

// ───────────── Drivers ─────────────
const getDrivers = async (req, res) => {
  try {
    const data = await adminService.getAllDrivers(req.query);
    return paginatedResponse(res, data.drivers, data.total, data.page, data.limit);
  } catch (error) { return handleAdminError(res, error); }
};

const getUnverifiedDrivers = async (req, res) => {
  try {
    const data = await adminService.getUnverifiedDrivers();
    return successResponse(res, data, 'Unverified drivers fetched');
  } catch (error) { return handleAdminError(res, error); }
};

const verifyDriver = async (req, res) => {
  try {
    const result = await adminService.verifyDriver(req.params.id);
    return successResponse(res, result.driver, result.message);
  } catch (error) { return handleAdminError(res, error); }
};

const rejectDriver = async (req, res) => {
  try {
    const result = await adminService.rejectDriver(req.params.id, req.body.reason);
    return successResponse(res, result, result.message);
  } catch (error) { return handleAdminError(res, error); }
};

// ───────────── Assignments ─────────────
const assignDriver = async (req, res, next) => {
    try {
      const { subscription_id, driver_id, vehicle_id, estimated_pickup_time, driver_route_id, overrideReason } = req.body;
      if (!subscription_id || !driver_id || !vehicle_id) {
        return errorResponse(res, 'Missing required fields', 400);
      }

      const result = await adminService.assignDriverToSubscription(
        subscription_id, 
        driver_id, 
        vehicle_id, 
        estimated_pickup_time, 
        driver_route_id, 
        overrideReason
      );
      return successResponse(res, result.subscription, result.message);
    } catch (error) { return handleAdminError(res, error); }
};

const bulkAssignDrivers = async (req, res) => {
  try {
    const result = await adminService.bulkAssignDrivers(req.body.assignments);
    return successResponse(res, result, 'Bulk assignment process completed');
  } catch (error) { return handleAdminError(res, error); }
};

const unassignDriver = async (req, res) => {
  try {
    const result = await adminService.unassignDriver(req.params.subscriptionId);
    return successResponse(res, null, result.message);
  } catch (error) { return handleAdminError(res, error); }
};

const getUnassignedSubscriptions = async (req, res) => {
  try {
    const data = await adminService.getUnassignedSubscriptions(req.query);
    return successResponse(res, data, 'Unassigned subscriptions fetched');
  } catch (error) { return handleAdminError(res, error); }
};

const getDriverSchedule = async (req, res) => {
  try {
    const schedule = await adminService.getDriverSchedule(req.params.id);
    return successResponse(res, schedule, 'Driver schedule fetched');
  } catch (error) { return handleAdminError(res, error); }
};

// ───────────── Subscriptions ─────────────
const getSubscriptions = async (req, res) => {
  try {
    const data = await adminService.getAllSubscriptions(req.query);
    return paginatedResponse(res, data.subscriptions, data.total, data.page, data.limit);
  } catch (error) { return handleAdminError(res, error); }
};

const updateSubscriptionStatus = async (req, res) => {
  try {
    const result = await adminService.updateSubscriptionStatus(req.params.id, req.body.status, req.body.reason);
    return successResponse(res, result, 'Subscription status updated');
  } catch (error) { return handleAdminError(res, error); }
};

// ───────────── Complaints ─────────────
const getComplaints = async (req, res) => {
  try {
    const data = await adminService.getAllComplaints(req.query);
    return paginatedResponse(res, data.complaints, data.total, data.page, data.limit);
  } catch (error) { return handleAdminError(res, error); }
};

const getComplaintById = async (req, res) => {
  try {
    const result = await adminService.getComplaintById(req.params.id);
    return successResponse(res, result, 'Complaint details fetched');
  } catch (error) { return handleAdminError(res, error); }
};

const respondToComplaint = async (req, res) => {
  try {
    const { admin_response, status } = req.body;
    const result = await adminService.respondToComplaint(req.params.id, admin_response, status);
    return successResponse(res, result, 'Complaint responded successfully');
  } catch (error) { return handleAdminError(res, error); }
};

// ───────────── Analytics ─────────────
const getDashboardStats = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    return successResponse(res, stats, 'Dashboard stats fetched');
  } catch (error) { return handleAdminError(res, error); }
};

const getRevenueAnalytics = async (req, res) => {
  try {
    const data = await adminService.getRevenueAnalytics();
    return successResponse(res, data, 'Revenue analytics fetched');
  } catch (error) { return handleAdminError(res, error); }
};

const getSubscriptionAnalytics = async (req, res) => {
  try {
    const data = await adminService.getSubscriptionAnalytics();
    return successResponse(res, data, 'Subscription analytics fetched');
  } catch (error) { return handleAdminError(res, error); }
};

const getDriverAnalytics = async (req, res) => {
  try {
    const data = await adminService.getDriverAnalytics();
    return successResponse(res, data, 'Driver analytics fetched');
  } catch (error) { return handleAdminError(res, error); }
};

const getSystemHealth = async (req, res) => {
  try {
    const health = await adminService.getSystemHealth();
    return successResponse(res, health, 'System health fetched');
  } catch (error) { return handleAdminError(res, error); }
};

const sendBroadcast = async (req, res) => {
  try {
    const { title, body, target } = req.body;
    if (!title || !body) return errorResponse(res, 'Title and body are required', 400);
    
    const result = await adminService.broadcastNotification(title, body, target);
    return successResponse(res, result, 'Broadcast sent successfully');
  } catch (error) { return handleAdminError(res, error); }
};

const getDriverRoutes = async (req, res) => {
  try {
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || 20
    };
    const data = await adminService.getAllDriverRoutes(filters);
    return successResponse(res, data, 'Driver routes fetched');
  } catch (error) { return handleAdminError(res, error); }
};

module.exports = {
  getUsers,
  getUserDetails,
  updateUserStatus,
  createAdmin,
  deleteUser,
  getDrivers,
  getUnverifiedDrivers, verifyDriver, rejectDriver,
  assignDriver, bulkAssignDrivers, unassignDriver, getUnassignedSubscriptions, getDriverSchedule,
  getSubscriptions, updateSubscriptionStatus,
  getComplaints, getComplaintById, respondToComplaint,
  getDashboardStats, getRevenueAnalytics, getSubscriptionAnalytics, getDriverAnalytics, getSystemHealth,
  sendBroadcast, getDriverRoutes
};
// ========== END ==========
