// ========== FILE: src/services/driverMatchingEngine.js ==========
const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Find the best drivers for a user's subscription based on route proximity,
 * schedule overlap, and availability.
 *
 * Scoring (100 total):
 *   Pickup proximity:  25 pts
 *   Drop proximity:    25 pts
 *   Driver rating:     20 pts (default 15 if no reviews)
 *   Available seats:   15 pts
 *   Time match:        15 pts
 *
 * @param {object} params
 * @param {number} params.userPickupLat
 * @param {number} params.userPickupLng
 * @param {number} params.userDropLat
 * @param {number} params.userDropLng
 * @param {number[]} params.requiredDays - array of day numbers (0=Sun,1=Mon,...6=Sat)
 * @param {string} params.requiredTime - HH:mm format
 * @param {string[]} [params.excludeDriverIds] - driver IDs to exclude
 * @returns {Array} top 3 scored drivers
 */
const findBestDrivers = async ({
  userPickupLat,
  userPickupLng,
  userDropLat,
  userDropLng,
  requiredDays = [1, 2, 3, 4, 5],
  requiredTime = '08:00',
  excludeDriverIds = [],
}) => {
  try {
    // Step 1: Find drivers whose route_segments pass within 1.5km of BOTH pickup and drop
    // Using Haversine formula in SQL
    const excludePlaceholders = excludeDriverIds.length > 0
      ? `AND dr.driver_id NOT IN (${excludeDriverIds.map((_, i) => `$${i + 5}`).join(',')})`
      : '';

    const params = [userPickupLat, userPickupLng, userDropLat, userDropLng, ...excludeDriverIds];

    const candidatesResult = await query(`
      WITH pickup_matches AS (
        SELECT DISTINCT rs.driver_route_id,
          MIN(
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians($1)) * cos(radians(rs.lat)) *
                cos(radians(rs.lng) - radians($2)) +
                sin(radians($1)) * sin(radians(rs.lat))
              ))
            )
          ) AS pickup_distance_km
        FROM route_segments rs
        JOIN driver_routes dr ON rs.driver_route_id = dr.id
        WHERE dr.status = 'active'
          AND dr.available_seats > 0
          ${excludePlaceholders}
        GROUP BY rs.driver_route_id
        HAVING MIN(
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians($1)) * cos(radians(rs.lat)) *
              cos(radians(rs.lng) - radians($2)) +
              sin(radians($1)) * sin(radians(rs.lat))
            ))
          )
        ) <= 1.5
      ),
      drop_matches AS (
        SELECT DISTINCT rs.driver_route_id,
          MIN(
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians($3)) * cos(radians(rs.lat)) *
                cos(radians(rs.lng) - radians($4)) +
                sin(radians($3)) * sin(radians(rs.lat))
              ))
            )
          ) AS drop_distance_km
        FROM route_segments rs
        JOIN driver_routes dr ON rs.driver_route_id = dr.id
        WHERE dr.status = 'active'
          AND dr.available_seats > 0
          ${excludePlaceholders}
        GROUP BY rs.driver_route_id
        HAVING MIN(
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians($3)) * cos(radians(rs.lat)) *
              cos(radians(rs.lng) - radians($4)) +
              sin(radians($3)) * sin(radians(rs.lat))
            ))
          )
        ) <= 1.5
      )
      SELECT
        dr.*,
        u.full_name AS driver_name,
        u.phone AS driver_phone,
        u.profile_photo AS driver_photo,
        pm.pickup_distance_km,
        dm.drop_distance_km,
        da.status AS availability_status,
        COALESCE(d.rating, 0) AS driver_rating,
        COALESCE(d.total_trips, 0) AS total_trips
      FROM pickup_matches pm
      JOIN drop_matches dm ON pm.driver_route_id = dm.driver_route_id
      JOIN driver_routes dr ON pm.driver_route_id = dr.id
      JOIN users u ON dr.driver_id = u.id
      LEFT JOIN drivers d ON d.user_id = dr.driver_id
      LEFT JOIN driver_availability da ON da.driver_id = dr.driver_id
      WHERE (da.status IS NULL OR da.status != 'unavailable')
    `, params);

    if (candidatesResult.rows.length === 0) {
      return [];
    }

    // Step 2: Filter and score
    const requiredHour = parseInt(requiredTime.split(':')[0], 10);
    const requiredMinute = parseInt(requiredTime.split(':')[1], 10);
    const requiredTotalMinutes = requiredHour * 60 + requiredMinute;

    const scoredCandidates = candidatesResult.rows
      .filter((driver) => {
        // Filter: working_days must overlap with requiredDays
        const driverDays = driver.working_days || [1, 2, 3, 4, 5];
        const hasOverlap = requiredDays.some((d) => driverDays.includes(d));
        if (!hasOverlap) return false;

        // Filter: morning_time within ±45 minutes
        if (driver.morning_time) {
          const driverTimeParts = driver.morning_time.split(':');
          const driverTotalMinutes = parseInt(driverTimeParts[0], 10) * 60 + parseInt(driverTimeParts[1], 10);
          if (Math.abs(driverTotalMinutes - requiredTotalMinutes) > 45) return false;
        }

        return true;
      })
      .map((driver) => {
        let score = 0;

        // Pickup proximity: 25 pts (0km = 25, 1.5km = 0)
        const pickupDist = parseFloat(driver.pickup_distance_km);
        score += Math.max(0, 25 * (1 - pickupDist / 1.5));

        // Drop proximity: 25 pts
        const dropDist = parseFloat(driver.drop_distance_km);
        score += Math.max(0, 25 * (1 - dropDist / 1.5));

        // Driver rating: 20 pts (rating out of 5, default 3 → 15 if no reviews)
        const rating = parseFloat(driver.driver_rating) || 0;
        if (rating > 0) {
          score += (rating / 5) * 20;
        } else {
          score += 15; // Default score for unrated drivers
        }

        // Available seats: 15 pts (more seats = higher score)
        const seats = parseInt(driver.available_seats, 10);
        const capacity = parseInt(driver.vehicle_capacity, 10) || 4;
        score += (seats / capacity) * 15;

        // Time match: 15 pts (exact match = 15, 45 min diff = 0)
        if (driver.morning_time) {
          const driverTimeParts = driver.morning_time.split(':');
          const driverTotalMinutes = parseInt(driverTimeParts[0], 10) * 60 + parseInt(driverTimeParts[1], 10);
          const timeDiff = Math.abs(driverTotalMinutes - requiredTotalMinutes);
          score += Math.max(0, 15 * (1 - timeDiff / 45));
        }

        return {
          ...driver,
          matching_score: parseFloat(score.toFixed(2)),
        };
      });

    // Step 3: Sort by score DESC, return top 3
    scoredCandidates.sort((a, b) => b.matching_score - a.matching_score);
    return scoredCandidates.slice(0, 3);
  } catch (error) {
    logger.error('findBestDrivers error:', error);
    throw error;
  }
};

/**
 * Auto-assign a driver to a subscription.
 * - Update subscription with driver_id
 * - Decrement driver's available_seats
 * - Create trip_schedules for next 30 days
 * - Log to assignment_logs
 *
 * @param {string} subscriptionId - subscription_plans.id
 * @param {object} bestDriver - driver object from findBestDrivers
 * @param {string} [assignmentType] - 'auto_initial' | 'auto_replacement' | 'manual'
 */
const autoAssignDriver = async (subscriptionId, bestDriver, assignmentType = 'auto_initial') => {
  try {
    // 1. Get subscription details
    const subResult = await query('SELECT * FROM subscription_plans WHERE id = $1', [subscriptionId]);
    if (subResult.rows.length === 0) throw new Error('SUBSCRIPTION_NOT_FOUND');
    const subscription = subResult.rows[0];

    const oldDriverId = subscription.driver_id || null;

    // 2. Update subscription with new driver
    await query(
      `UPDATE subscription_plans SET driver_id = (
        SELECT id FROM drivers WHERE user_id = $1 LIMIT 1
       ), status = 'active', updated_at = NOW()
       WHERE id = $2`,
      [bestDriver.driver_id, subscriptionId]
    );

    // 3. Decrement driver's available_seats
    await query(
      'UPDATE driver_routes SET available_seats = available_seats - 1, updated_at = NOW() WHERE id = $1',
      [bestDriver.id]
    );

    // 4. Create trip_schedules for next 30 days
    const workingDays = bestDriver.working_days || [1, 2, 3, 4, 5];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const scheduleDate = new Date(today);
      scheduleDate.setDate(today.getDate() + i);
      const dayOfWeek = scheduleDate.getDay(); // 0=Sun

      if (workingDays.includes(dayOfWeek)) {
        const dateStr = scheduleDate.toISOString().split('T')[0];
        await query(
          `INSERT INTO trip_schedules
            (subscription_id, driver_id, driver_route_id, user_id, scheduled_date,
             pickup_time, pickup_lat, pickup_lng, pickup_address, drop_lat, drop_lng, drop_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT DO NOTHING`,
          [
            subscriptionId,
            bestDriver.driver_id,
            bestDriver.id,
            subscription.user_id,
            dateStr,
            bestDriver.morning_time || subscription.morning_pickup_time,
            subscription.pickup_lat,
            subscription.pickup_lng,
            subscription.pickup_address,
            subscription.drop_lat,
            subscription.drop_lng,
            subscription.drop_address,
          ]
        );
      }
    }

    // 5. Log to assignment_logs
    await query(
      `INSERT INTO assignment_logs
        (subscription_id, user_id, old_driver_id, new_driver_id, assignment_type, reason, matching_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        subscriptionId,
        subscription.user_id,
        oldDriverId,
        bestDriver.driver_id,
        assignmentType,
        `Auto-assigned with score ${bestDriver.matching_score}`,
        bestDriver.matching_score,
      ]
    );

    logger.info('autoAssignDriver completed', {
      subscriptionId,
      driverId: bestDriver.driver_id,
      score: bestDriver.matching_score,
    });

    return {
      subscription_id: subscriptionId,
      driver_id: bestDriver.driver_id,
      driver_name: bestDriver.driver_name,
      matching_score: bestDriver.matching_score,
    };
  } catch (error) {
    logger.error('autoAssignDriver error:', error);
    throw error;
  }
};

module.exports = {
  findBestDrivers,
  autoAssignDriver,
};
// ========== END ==========
