// ========== FILE: src/modules/routes/routes.service.js ==========
const { query } = require('../../config/db');
const logger = require('../../utils/logger');
const { getDistanceMatrix } = require('../../utils/mapProvider');

// ───────────── Create Route ─────────────
const createRoute = async (data) => {
  try {
    let {
      route_name,
      pickup_location,
      pickup_lat,
      pickup_lng,
      drop_location,
      drop_lat,
      drop_lng,
      distance_km,
      estimated_duration_min,
      morning_pickup_time,
      evening_pickup_time,
      city,
    } = data;

    // 1. Check route_name uniqueness in same city
    const existingCheck = await query(
      'SELECT id FROM routes WHERE route_name = $1 AND city = $2',
      [route_name, city]
    );
    if (existingCheck.rows.length > 0) {
      throw new Error('ROUTE_EXISTS');
    }

    // 2. Auto-fill distance and duration via mapProvider if missing
    if (distance_km === undefined || estimated_duration_min === undefined) {
      try {
        const matrixResult = await getDistanceMatrix(
          { lat: pickup_lat, lng: pickup_lng },
          { lat: drop_lat, lng: drop_lng }
        );
        distance_km = distance_km || matrixResult.distance_km;
        estimated_duration_min = estimated_duration_min || matrixResult.duration_min;
      } catch (mapError) {
        logger.warn(`Failed to auto-fetch route distance: ${mapError.message}`);
        // Proceed with nulls if map API fails
        distance_km = distance_km || null;
        estimated_duration_min = estimated_duration_min || null;
      }
    }

    // 3. Insert route
    const result = await query(
      `INSERT INTO routes (
        route_name, pickup_location, pickup_lat, pickup_lng,
        drop_location, drop_lat, drop_lng, distance_km, estimated_duration_min,
        morning_pickup_time, evening_pickup_time, city
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        route_name,
        pickup_location,
        pickup_lat,
        pickup_lng,
        drop_location,
        drop_lat,
        drop_lng,
        distance_km,
        estimated_duration_min,
        morning_pickup_time || null,
        evening_pickup_time || null,
        city,
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.message === 'ROUTE_EXISTS') throw error;
    logger.error(`createRoute error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get All Routes (Paginated + Filtered) ─────────────
const getAllRoutes = async (filters = {}) => {
  try {
    const { city, pickup_query, drop_query, is_active } = filters;
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Apply filters
    if (is_active !== undefined) {
      // is_active might be string 'true'/'false' or boolean
      const isActiveBool = String(is_active).toLowerCase() === 'true';
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(isActiveBool);
    } else {
      // Default to active only for public search
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(true);
    }

    if (city) {
      conditions.push(`city ILIKE $${paramIndex++}`);
      values.push(`%${city}%`);
    }

    if (pickup_query) {
      conditions.push(`pickup_location ILIKE $${paramIndex++}`);
      values.push(`%${pickup_query}%`);
    }

    if (drop_query) {
      conditions.push(`drop_location ILIKE $${paramIndex++}`);
      values.push(`%${drop_query}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total rows
    const countResult = await query(
      `SELECT COUNT(*) AS total FROM routes ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated rows
    // Clone values array for pagination params
    const queryValues = [...values, limit, offset];
    const result = await query(
      `SELECT * FROM routes ${whereClause}
       ORDER BY city ASC, route_name ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      queryValues
    );

    return {
      routes: result.rows,
      total,
      page,
      limit,
    };
  } catch (error) {
    logger.error(`getAllRoutes error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get Route By ID (with relations) ─────────────
const getRouteById = async (routeId) => {
  try {
    // 1. Get route details
    const routeResult = await query('SELECT * FROM routes WHERE id = $1', [routeId]);

    if (routeResult.rows.length === 0) {
      throw new Error('ROUTE_NOT_FOUND');
    }

    const route = routeResult.rows[0];

    // 2. Get active subscriptions count
    const subCountResult = await query(
      `SELECT COUNT(*) AS active_count
       FROM user_subscriptions
       WHERE route_id = $1 AND status = 'active'`,
      [routeId]
    );

    // 3. Get assigned drivers
    const driversResult = await query(
      `SELECT DISTINCT dp.id AS driver_id, u.full_name, u.phone, dp.rating
       FROM user_subscriptions us
       JOIN drivers dp ON us.driver_id = dp.id
       JOIN users u ON dp.user_id = u.id
       WHERE us.route_id = $1 AND us.status = 'active'`,
      [routeId]
    );

    return {
      route,
      active_subscriptions_count: parseInt(subCountResult.rows[0].active_count, 10),
      assigned_drivers: driversResult.rows,
    };
  } catch (error) {
    if (error.message === 'ROUTE_NOT_FOUND') throw error;
    logger.error(`getRouteById error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Update Route ─────────────
const updateRoute = async (routeId, data) => {
  try {
    // 1. Check if route exists
    const routeResult = await query('SELECT * FROM routes WHERE id = $1', [routeId]);
    if (routeResult.rows.length === 0) {
      throw new Error('ROUTE_NOT_FOUND');
    }
    const currentRoute = routeResult.rows[0];

    // 2. If route_name and city changed, check uniqueness
    const newName = data.route_name || currentRoute.route_name;
    const newCity = data.city || currentRoute.city;

    if (data.route_name || data.city) {
      const existingCheck = await query(
        'SELECT id FROM routes WHERE route_name = $1 AND city = $2 AND id != $3',
        [newName, newCity, routeId]
      );
      if (existingCheck.rows.length > 0) {
        throw new Error('ROUTE_EXISTS');
      }
    }

    // 3. If lat/lng changed and distance not explicitly provided, recalculate
    let { distance_km, estimated_duration_min } = data;
    const pickupLatChanged = data.pickup_lat !== undefined && data.pickup_lat !== currentRoute.pickup_lat;
    const pickupLngChanged = data.pickup_lng !== undefined && data.pickup_lng !== currentRoute.pickup_lng;
    const dropLatChanged = data.drop_lat !== undefined && data.drop_lat !== currentRoute.drop_lat;
    const dropLngChanged = data.drop_lng !== undefined && data.drop_lng !== currentRoute.drop_lng;

    if (
      (pickupLatChanged || pickupLngChanged || dropLatChanged || dropLngChanged) &&
      distance_km === undefined
    ) {
      try {
        const matrixResult = await getDistanceMatrix(
          {
            lat: data.pickup_lat || currentRoute.pickup_lat,
            lng: data.pickup_lng || currentRoute.pickup_lng,
          },
          {
            lat: data.drop_lat || currentRoute.drop_lat,
            lng: data.drop_lng || currentRoute.drop_lng,
          }
        );
        distance_km = matrixResult.distance_km;
        estimated_duration_min = matrixResult.duration_min;
      } catch (mapError) {
        logger.warn(`Failed to auto-fetch route distance on update: ${mapError.message}`);
      }
    }

    // 4. Build dynamic UPDATE query
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Merge calculated distance/duration into data object for looping
    if (distance_km !== undefined) data.distance_km = distance_km;
    if (estimated_duration_min !== undefined) data.estimated_duration_min = estimated_duration_min;

    // Allowed fields for update
    const allowedFields = [
      'route_name', 'pickup_location', 'pickup_lat', 'pickup_lng',
      'drop_location', 'drop_lat', 'drop_lng', 'distance_km',
      'estimated_duration_min', 'morning_pickup_time', 'evening_pickup_time',
      'city', 'is_active'
    ];

    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex++}`);
        values.push(data[field]);
      }
    });

    if (fields.length === 0) {
      return currentRoute; // Nothing to update
    }

    // Add updated_at manually if missing from schema (schema has created_at but not updated_at for routes)
    // Actually the schema for routes: created_at TIMESTAMP DEFAULT NOW()
    // No updated_at field in routes table. So we skip adding it.

    values.push(routeId);

    const updateResult = await query(
      `UPDATE routes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return updateResult.rows[0];
  } catch (error) {
    if (['ROUTE_NOT_FOUND', 'ROUTE_EXISTS'].includes(error.message)) throw error;
    logger.error(`updateRoute error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Delete Route (Soft Delete) ─────────────
const deleteRoute = async (routeId) => {
  try {
    // 1. Check if route exists
    const routeCheck = await query('SELECT id FROM routes WHERE id = $1', [routeId]);
    if (routeCheck.rows.length === 0) {
      throw new Error('ROUTE_NOT_FOUND');
    }

    // 2. Check for active subscriptions
    const subCheck = await query(
      `SELECT id FROM user_subscriptions WHERE route_id = $1 AND status IN ('active', 'pending') LIMIT 1`,
      [routeId]
    );

    if (subCheck.rows.length > 0) {
      throw new Error('ROUTE_HAS_ACTIVE_SUBSCRIPTIONS');
    }

    // 3. Soft delete
    await query('UPDATE routes SET is_active = false WHERE id = $1', [routeId]);

    return { message: 'Route deactivated successfully' };
  } catch (error) {
    if (['ROUTE_NOT_FOUND', 'ROUTE_HAS_ACTIVE_SUBSCRIPTIONS'].includes(error.message)) {
      throw error;
    }
    logger.error(`deleteRoute error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get Unique Cities ─────────────
const getCitiesWithRoutes = async () => {
  try {
    const result = await query(
      'SELECT DISTINCT city FROM routes WHERE is_active = true ORDER BY city ASC'
    );
    return result.rows.map((row) => row.city);
  } catch (error) {
    logger.error(`getCitiesWithRoutes error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get Routes By City ─────────────
const getRoutesByCity = async (city) => {
  try {
    const result = await query(
      `SELECT * FROM routes WHERE city ILIKE $1 AND is_active = true ORDER BY route_name ASC`,
      [city]
    );
    return result.rows;
  } catch (error) {
    logger.error(`getRoutesByCity error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

module.exports = {
  createRoute,
  getAllRoutes,
  getRouteById,
  updateRoute,
  deleteRoute,
  getCitiesWithRoutes,
  getRoutesByCity,
};
// ========== END ==========
