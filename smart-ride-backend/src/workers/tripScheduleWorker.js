// ========== FILE: src/workers/tripScheduleWorker.js ==========
const logger = require('../utils/logger');
const { query } = require('../config/db');

/**
 * Trip Schedule Worker
 * Runs daily at 11 PM.
 *
 * For each active subscription with an assigned driver,
 * creates tomorrow's trip_schedule record if it doesn't exist.
 */
const processTripScheduleCreation = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayOfWeek = tomorrow.getDay(); // 0=Sun,1=Mon,...

    logger.info('tripScheduleWorker: Creating tomorrow trip schedules', { date: tomorrowStr, dayOfWeek });

    // Find active subscriptions with assigned drivers
    const subsResult = await query(`
      SELECT sp.id AS subscription_id, sp.user_id, sp.morning_pickup_time,
        sp.pickup_lat, sp.pickup_lng, sp.pickup_address,
        sp.drop_lat, sp.drop_lng, sp.drop_address,
        d.user_id AS driver_user_id,
        dr.id AS driver_route_id, dr.working_days
      FROM subscription_plans sp
      JOIN drivers d ON sp.driver_id = d.id
      LEFT JOIN driver_routes dr ON dr.driver_id = d.user_id AND dr.status = 'active'
      WHERE sp.status = 'active'
        AND sp.driver_id IS NOT NULL
        AND sp.end_date >= $1
    `, [tomorrowStr]);

    let createdCount = 0;

    for (const sub of subsResult.rows) {
      // Check if tomorrow's day is a working day for this driver
      const workingDays = sub.working_days || [1, 2, 3, 4, 5];
      if (!workingDays.includes(dayOfWeek)) continue;

      // Check if trip_schedule already exists for tomorrow
      const existing = await query(
        `SELECT id FROM trip_schedules
         WHERE subscription_id = $1 AND scheduled_date = $2 AND status != 'cancelled'`,
        [sub.subscription_id, tomorrowStr]
      );

      if (existing.rows.length > 0) continue;

      // Create trip_schedule
      await query(
        `INSERT INTO trip_schedules
          (subscription_id, driver_id, driver_route_id, user_id, scheduled_date,
           pickup_time, pickup_lat, pickup_lng, pickup_address,
           drop_lat, drop_lng, drop_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          sub.subscription_id,
          sub.driver_user_id,
          sub.driver_route_id,
          sub.user_id,
          tomorrowStr,
          sub.morning_pickup_time,
          sub.pickup_lat,
          sub.pickup_lng,
          sub.pickup_address,
          sub.drop_lat,
          sub.drop_lng,
          sub.drop_address,
        ]
      );

      createdCount++;
    }

    logger.info('tripScheduleWorker: Completed', {
      date: tomorrowStr,
      totalSubscriptions: subsResult.rows.length,
      tripsCreated: createdCount,
    });

    return { tripsCreated: createdCount };
  } catch (error) {
    logger.error('tripScheduleWorker error:', error);
    throw error;
  }
};

module.exports = { processTripScheduleCreation };
// ========== END ==========
