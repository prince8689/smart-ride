// ========== FILE: src/modules/users/users.controller.js ==========
const { successResponse, errorResponse, paginatedResponse } = require('../../utils/response');
const logger = require('../../utils/logger');
const usersService = require('./users.service');

// ───────────── Error Code → HTTP Response Map ─────────────
const ERROR_MAP = {
  NOT_FOUND:    { status: 404, message: 'Resource not found' },
  PHONE_EXISTS: { status: 409, message: 'Phone number already in use' },
  NO_FIELDS:    { status: 400, message: 'No fields provided to update' },
};

/**
 * Maps service-layer Error strings to HTTP error responses.
 */
const handleServiceError = (res, error) => {
  const mapped = ERROR_MAP[error.message];

  if (mapped) {
    return errorResponse(res, mapped.message, mapped.status);
  }

  logger.error(error.message, { stack: error.stack });
  return errorResponse(res, 'Something went wrong', 500);
};

// ───────────── Get Profile ─────────────
const getProfile = async (req, res) => {
  try {
    const user = await usersService.getUserProfile(req.user.id);
    return successResponse(res, user, 'Profile fetched successfully');
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return errorResponse(res, 'Session invalid. User not found.', 401);
    }
    return handleServiceError(res, error);
  }
};

// ───────────── Update Profile ─────────────
const updateProfile = async (req, res) => {
  try {
    const { full_name, phone, profile_photo } = req.body;
    const user = await usersService.updateUserProfile(req.user.id, {
      full_name,
      phone,
      profile_photo,
    });
    return successResponse(res, user, 'Profile updated successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get My Subscriptions ─────────────
const getMySubscriptions = async (req, res) => {
  try {
    const subscriptions = await usersService.getUserSubscriptions(req.user.id);
    return successResponse(res, subscriptions, 'Subscriptions fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Active Driver Location ─────────────
const getActiveDriverLocation = async (req, res) => {
  try {
    const location = await usersService.getActiveDriverLocation(req.user.id);
    if (!location) {
      return errorResponse(res, 'No active driver found', 404);
    }
    return successResponse(res, location, 'Driver location fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get My Payments ─────────────
const getMyPayments = async (req, res) => {
  try {
    const payments = await usersService.getUserPayments(req.user.id);
    return successResponse(res, payments, 'Payment history fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Notifications (Paginated) ─────────────
const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const { notifications, total, unread_count } = await usersService.getUserNotifications(
      req.user.id,
      page,
      limit
    );

    return res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully',
      data: notifications,
      unread_count,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Mark Single Notification Read ─────────────
const markNotificationRead = async (req, res) => {
  try {
    const result = await usersService.markNotificationRead(req.user.id, req.params.id);
    return successResponse(res, null, result.message);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Mark All Notifications Read ─────────────
const markAllRead = async (req, res) => {
  try {
    const result = await usersService.markAllNotificationsRead(req.user.id);
    return successResponse(res, null, result.message);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Submit Complaint ─────────────
const submitComplaint = async (req, res) => {
  try {
    const { subscription_id, driver_id, subject, description } = req.body;
    const complaint = await usersService.submitComplaint(req.user.id, {
      subscription_id,
      driver_id,
      subject,
      description,
    });
    return successResponse(res, complaint, 'Complaint submitted successfully', 201);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get My Complaints ─────────────
const getComplaints = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const data = await usersService.getUserComplaints(req.user.id, page, limit);
    return paginatedResponse(res, data.complaints, data.total, data.page, data.limit);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Delete (Deactivate) Account ─────────────
const deleteAccount = async (req, res) => {
  try {
    const result = await usersService.deleteAccount(req.user.id);
    return successResponse(res, null, result.message);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getMySubscriptions,
  getActiveDriverLocation,
  getMyPayments,
  getNotifications,
  markNotificationRead,
  markAllRead,
  submitComplaint,
  getComplaints,
  deleteAccount,
};
// ========== END ==========
