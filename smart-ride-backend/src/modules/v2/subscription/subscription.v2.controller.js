// ========== FILE: src/modules/v2/subscription/subscription.v2.controller.js ==========
const { successResponse, errorResponse } = require('../../../utils/response');
const logger = require('../../../utils/logger');
const { findBestDrivers, autoAssignDriver } = require('../../../services/driverMatchingEngine');

// POST /api/v2/subscription/find-drivers
const findDrivers = async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropLat, dropLng, requiredDays, requiredTime } = req.body;

    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      return errorResponse(res, 'Pickup and drop coordinates are required', 400);
    }

    const drivers = await findBestDrivers({
      userPickupLat: parseFloat(pickupLat),
      userPickupLng: parseFloat(pickupLng),
      userDropLat: parseFloat(dropLat),
      userDropLng: parseFloat(dropLng),
      requiredDays: requiredDays || [1, 2, 3, 4, 5],
      requiredTime: requiredTime || '08:00',
    });

    return successResponse(res, {
      drivers,
      total: drivers.length,
    }, drivers.length > 0 ? 'Matching drivers found' : 'No matching drivers found');
  } catch (error) {
    logger.error('findDrivers error:', error);
    return errorResponse(res, 'Failed to find drivers', 500);
  }
};

// POST /api/v2/subscription/confirm-driver
const confirmDriver = async (req, res) => {
  try {
    const { subscriptionId, driverRouteId } = req.body;

    if (!subscriptionId || !driverRouteId) {
      return errorResponse(res, 'subscriptionId and driverRouteId are required', 400);
    }

    // Get the driver route
    const { query: dbQuery } = require('../../../config/db');
    const routeResult = await dbQuery('SELECT * FROM driver_routes WHERE id = $1', [driverRouteId]);
    if (routeResult.rows.length === 0) {
      return errorResponse(res, 'Driver route not found', 404);
    }

    const driverRoute = routeResult.rows[0];

    // Get driver details
    const driverResult = await dbQuery(
      'SELECT u.full_name, u.phone, u.profile_photo FROM users u WHERE u.id = $1',
      [driverRoute.driver_id]
    );

    const driverInfo = {
      ...driverRoute,
      driver_name: driverResult.rows[0]?.full_name,
      driver_phone: driverResult.rows[0]?.phone,
      driver_photo: driverResult.rows[0]?.profile_photo,
      matching_score: 100, // Manual selection = full score
    };

    const result = await autoAssignDriver(subscriptionId, driverInfo, 'auto_initial');

    return successResponse(res, result, 'Driver confirmed and assigned successfully');
  } catch (error) {
    if (error.message === 'SUBSCRIPTION_NOT_FOUND') {
      return errorResponse(res, 'Subscription not found', 404);
    }
    logger.error('confirmDriver error:', error);
    return errorResponse(res, 'Failed to confirm driver', 500);
  }
};

// POST /api/v2/admin/assignment/manual
const manualAssignment = async (req, res) => {
  try {
    const { subscriptionId, driverRouteId, reason } = req.body;

    if (!subscriptionId || !driverRouteId) {
      return errorResponse(res, 'subscriptionId and driverRouteId are required', 400);
    }

    const { query: dbQuery } = require('../../../config/db');
    const routeResult = await dbQuery('SELECT * FROM driver_routes WHERE id = $1', [driverRouteId]);
    if (routeResult.rows.length === 0) {
      return errorResponse(res, 'Driver route not found', 404);
    }

    const driverRoute = routeResult.rows[0];

    const driverResult = await dbQuery(
      'SELECT u.full_name, u.phone FROM users u WHERE u.id = $1',
      [driverRoute.driver_id]
    );

    const driverInfo = {
      ...driverRoute,
      driver_name: driverResult.rows[0]?.full_name,
      matching_score: 100,
    };

    const result = await autoAssignDriver(subscriptionId, driverInfo, 'manual');

    return successResponse(res, result, 'Driver manually assigned successfully');
  } catch (error) {
    logger.error('manualAssignment error:', error);
    return errorResponse(res, 'Failed to assign driver', 500);
  }
};

module.exports = { findDrivers, confirmDriver, manualAssignment };
// ========== END ==========
