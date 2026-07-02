// ========== FILE: src/modules/v2/driverRoute/driverRoute.v2.controller.js ==========
const { successResponse, errorResponse } = require('../../../utils/response');
const logger = require('../../../utils/logger');
const { query } = require('../../../config/db');
const mapsService = require('../../../services/mapsService');

// POST /api/v2/driver/route/register
const registerRoute = async (req, res) => {
  try {
    const driverId = req.user.id;
    const {
      startAddress, endAddress,
      workingDays, morningTime, eveningTime,
      vehicleType, vehicleCapacity,
    } = req.body;

    if (!startAddress || !endAddress || !vehicleType) {
      return errorResponse(res, 'startAddress, endAddress, and vehicleType are required', 400);
    }

    // 1. Geocode start and end addresses
    const startGeo = await mapsService.geocodeAddress(startAddress);
    const endGeo = await mapsService.geocodeAddress(endAddress);

    // 2. Get directions for distance/duration
    const directions = await mapsService.getDirections(
      startGeo.lat, startGeo.lng, endGeo.lat, endGeo.lng
    );

    // 2.5 Set previous active routes to inactive
    await query(
      `UPDATE driver_routes SET status = 'inactive', updated_at = NOW() WHERE driver_id = $1 AND status = 'active'`,
      [driverId]
    );

    // 3. Save to driver_routes
    const routeResult = await query(
      `INSERT INTO driver_routes
        (driver_id, start_lat, start_lng, start_address, start_place_id,
         end_lat, end_lng, end_address, end_place_id,
         working_days, morning_time, evening_time,
         total_distance, estimated_duration,
         vehicle_type, vehicle_capacity, available_seats)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
       RETURNING *`,
      [
        driverId,
        startGeo.lat, startGeo.lng, startGeo.formatted_address, startGeo.place_id,
        endGeo.lat, endGeo.lng, endGeo.formatted_address, endGeo.place_id,
        workingDays || [1, 2, 3, 4, 5],
        morningTime || '08:00',
        eveningTime || null,
        directions.distance_km,
        directions.duration_minutes,
        vehicleType,
        vehicleCapacity || 4,
      ]
    );

    const route = routeResult.rows[0];

    // 4. Generate 1km route segments
    const segments = await mapsService.generateRouteSegments(
      route.id, startGeo.lat, startGeo.lng, endGeo.lat, endGeo.lng
    );

    // 5. Create driver_availability if not exists
    await query(
      `INSERT INTO driver_availability (driver_id, status, last_updated)
       VALUES ($1, 'offline', NOW())
       ON CONFLICT (driver_id) DO NOTHING`,
      [driverId]
    );

    return successResponse(res, {
      route,
      segments_count: segments.length,
    }, 'Route registered successfully', 201);
  } catch (error) {
    if (error.message === 'GEOCODE_FAILED') {
      return errorResponse(res, 'Failed to geocode address. Please check the address and try again.', 400);
    }
    if (error.message === 'DIRECTIONS_FAILED') {
      return errorResponse(res, 'Failed to get route directions. Please try again.', 400);
    }
    logger.error('registerRoute error:', error);
    return errorResponse(res, 'Failed to register route', 500);
  }
};

// GET /api/v2/driver/route/my-routes
const getMyRoutes = async (req, res) => {
  try {
    const result = await query(
      `SELECT dr.*, 
        (SELECT COUNT(*) FROM route_segments rs WHERE rs.driver_route_id = dr.id) AS segments_count
       FROM driver_routes dr
       WHERE dr.driver_id = $1
       ORDER BY dr.created_at DESC`,
      [req.user.id]
    );
    return successResponse(res, result.rows, 'Routes fetched successfully');
  } catch (error) {
    logger.error('getMyRoutes error:', error);
    return errorResponse(res, 'Failed to fetch routes', 500);
  }
};

// GET /api/v2/driver/route/:id
const getRouteById = async (req, res) => {
  try {
    const routeResult = await query('SELECT * FROM driver_routes WHERE id = $1', [req.params.id]);
    if (routeResult.rows.length === 0) {
      return errorResponse(res, 'Route not found', 404);
    }

    const segmentsResult = await query(
      'SELECT * FROM route_segments WHERE driver_route_id = $1 ORDER BY sequence_number',
      [req.params.id]
    );

    return successResponse(res, {
      route: routeResult.rows[0],
      segments: segmentsResult.rows,
    }, 'Route details fetched successfully');
  } catch (error) {
    logger.error('getRouteById error:', error);
    return errorResponse(res, 'Failed to fetch route', 500);
  }
};

// PUT /api/v2/driver/route/:id
const updateRoute = async (req, res) => {
  try {
    // Verify ownership
    const existing = await query('SELECT * FROM driver_routes WHERE id = $1 AND driver_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) {
      return errorResponse(res, 'Route not found or not authorized', 404);
    }

    const { workingDays, morningTime, eveningTime, vehicleCapacity, availableSeats } = req.body;

    const result = await query(
      `UPDATE driver_routes SET
        working_days = COALESCE($1, working_days),
        morning_time = COALESCE($2, morning_time),
        evening_time = COALESCE($3, evening_time),
        vehicle_capacity = COALESCE($4, vehicle_capacity),
        available_seats = COALESCE($5, available_seats),
        updated_at = NOW()
       WHERE id = $6 AND driver_id = $7
       RETURNING *`,
      [workingDays, morningTime, eveningTime, vehicleCapacity, availableSeats, req.params.id, req.user.id]
    );

    return successResponse(res, result.rows[0], 'Route updated successfully');
  } catch (error) {
    logger.error('updateRoute error:', error);
    return errorResponse(res, 'Failed to update route', 500);
  }
};

// PUT /api/v2/driver/route/:id/status
const updateRouteStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'online' | 'offline'
    if (!['online', 'offline'].includes(status)) {
      return errorResponse(res, 'Status must be online or offline', 400);
    }

    // Verify ownership
    const existing = await query('SELECT * FROM driver_routes WHERE id = $1 AND driver_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) {
      return errorResponse(res, 'Route not found or not authorized', 404);
    }

    // Update driver_availability
    await query(
      `INSERT INTO driver_availability (driver_id, status, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (driver_id) DO UPDATE SET status = $2, last_updated = NOW()`,
      [req.user.id, status]
    );

    // Log status change
    await query(
      `INSERT INTO driver_status_history (driver_id, old_status, new_status, reason)
       VALUES ($1, NULL, $2, 'Driver toggled status')`,
      [req.user.id, status]
    );

    // Update route status
    const routeStatus = status === 'online' ? 'active' : 'inactive';
    await query(
      'UPDATE driver_routes SET status = $1, updated_at = NOW() WHERE id = $2',
      [routeStatus, req.params.id]
    );

    return successResponse(res, { status }, `Driver status set to ${status}`);
  } catch (error) {
    logger.error('updateRouteStatus error:', error);
    return errorResponse(res, 'Failed to update status', 500);
  }
};

module.exports = {
  registerRoute,
  getMyRoutes,
  getRouteById,
  updateRoute,
  updateRouteStatus,
};
// ========== END ==========
