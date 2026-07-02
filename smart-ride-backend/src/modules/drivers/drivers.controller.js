// ========== FILE: src/modules/drivers/drivers.controller.js ==========
const { successResponse, errorResponse } = require('../../utils/response');
const logger = require('../../utils/logger');
const driversService = require('./drivers.service');

// ───────────── Error Code → HTTP Response Map ─────────────
const ERROR_MAP = {
  UNAUTHORIZED:      { status: 403, message: 'Only drivers can create driver profile' },
  PROFILE_EXISTS:    { status: 409, message: 'Driver profile already exists' },
  LICENSE_EXISTS:    { status: 409, message: 'License number already registered' },
  AADHAR_EXISTS:     { status: 409, message: 'Aadhar number already registered' },
  VEHICLE_EXISTS:    { status: 409, message: 'Vehicle number already registered' },
  PROFILE_NOT_FOUND: { status: 404, message: 'Driver profile not found. Create profile first' },
  NOT_FOUND:         { status: 404, message: 'Resource not found' },
  ALREADY_MARKED:    { status: 409, message: 'Attendance already marked for this date and slot' },
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

// ───────────── Create Driver Profile ─────────────
const createProfile = async (req, res) => {
  try {
    const { 
      license_number, license_expiry, aadhar_number, 
      pan_card_number, bank_account_number, experience_years, 
      pan_card_image, license_image, aadhar_image, address
    } = req.body;
    
    const profile = await driversService.createDriverProfile(req.user.id, {
      license_number,
      license_expiry,
      aadhar_number,
      pan_card_number,
      bank_account_number,
      experience_years,
      pan_card_image,
      license_image,
      aadhar_image,
      address
    });
    return successResponse(res, profile, 'Driver profile created successfully', 201);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Add Vehicle ─────────────
const addVehicle = async (req, res) => {
  try {
    const { vehicle_number, vehicle_type, brand, model, year, color, seating_capacity } = req.body;
    const vehicle = await driversService.addVehicle(req.user.id, {
      vehicle_number,
      vehicle_type,
      brand,
      model,
      year,
      color,
      seating_capacity,
    });
    return successResponse(res, vehicle, 'Vehicle added successfully', 201);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Driver Profile ─────────────
const getProfile = async (req, res) => {
  try {
    const data = await driversService.getDriverProfile(req.user.id);
    return successResponse(res, data, 'Driver profile fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Update Driver Profile (Availability) ─────────────
const updateProfile = async (req, res) => {
  try {
    const { is_available } = req.body;
    const profile = await driversService.updateDriverProfile(req.user.id, { is_available });
    return successResponse(res, profile, 'Driver profile updated successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Update Live Location ─────────────
const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const result = await driversService.updateDriverLocation(req.user.id, lat, lng);
    return successResponse(res, result, 'Location updated successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Assigned Passengers ─────────────
const getAssignedPassengers = async (req, res) => {
  try {
    const subscriptions = await driversService.getAssignedSubscriptions(req.user.id);
    return successResponse(res, subscriptions, 'Assigned passengers fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Mark Attendance ─────────────
const markAttendance = async (req, res) => {
  try {
    const { subscription_id, date, slot, status, pickup_time, drop_time } = req.body;
    const attendance = await driversService.markAttendance(req.user.id, {
      subscription_id,
      date,
      slot,
      status,
      pickup_time,
      drop_time,
    });
    return successResponse(res, attendance, 'Attendance marked successfully', 201);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Attendance ─────────────
const getAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    const data = await driversService.getDriverAttendance(req.user.id, { month, year });
    return successResponse(res, data, 'Attendance fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Earnings ─────────────
const getEarnings = async (req, res) => {
  try {
    const earnings = await driversService.getDriverEarnings(req.user.id);
    return successResponse(res, earnings, 'Earnings fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Dashboard Stats ─────────────
const getDashboardStats = async (req, res) => {
  try {
    const stats = await driversService.getDriverDashboardStats(req.user.id);
    return successResponse(res, stats, 'Dashboard stats fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

module.exports = {
  createProfile,
  addVehicle,
  getProfile,
  updateProfile,
  updateLocation,
  getAssignedPassengers,
  markAttendance,
  getAttendance,
  getEarnings,
  getDashboardStats,
};
// ========== END ==========
