// ========== FILE: src/workers/driverStatusWorker.js ==========
const logger = require('../utils/logger');
const { query } = require('../config/db');

/**
 * Driver Status Worker
 * Runs every 2 minutes.
 *
 * - Checks drivers marked 'online' whose last_updated is older than 10 minutes.
 * - Marks them as potentially offline.
 * - If driver has active trip today and last_updated > 15 mins → trigger replacement.
 */
const processDriverStatusCheck = async (replacementQueue) => {
  try {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const today = now.toISOString().split('T')[0];

    // Find stale online drivers (last_updated > 10 minutes)
    const staleResult = await query(`
      SELECT da.driver_id, da.last_updated
      FROM driver_availability da
      WHERE da.status = 'online'
        AND da.last_updated < $1
    `, [tenMinutesAgo]);

    for (const driver of staleResult.rows) {
      // Mark as offline
      await query(
        `UPDATE driver_availability SET status = 'offline', last_updated = NOW() WHERE driver_id = $1`,
        [driver.driver_id]
      );

      // Log status change
      await query(
        `INSERT INTO driver_status_history (driver_id, old_status, new_status, reason)
         VALUES ($1, 'online', 'offline', 'Auto-marked offline: no heartbeat for 10+ minutes')`,
        [driver.driver_id]
      );
    }

    // Find drivers with active trips today who have been offline > 15 minutes
    const criticalResult = await query(`
      SELECT DISTINCT ts.subscription_id, ts.driver_id
      FROM trip_schedules ts
      JOIN driver_availability da ON da.driver_id = ts.driver_id
      WHERE ts.scheduled_date = $1
        AND ts.status = 'scheduled'
        AND da.status IN ('offline', 'unavailable')
        AND da.last_updated < $2
    `, [today, fifteenMinutesAgo]);

    for (const trip of criticalResult.rows) {
      if (replacementQueue) {
        await replacementQueue.add('replace-driver', {
          subscriptionId: trip.subscription_id,
          reason: 'Driver offline for 15+ minutes with active trip scheduled',
        });
      }
    }

    // Find drivers whose shift has ended
    const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const shiftEndedResult = await query(`
      SELECT dp.user_id, dr.evening_time
      FROM drivers dp
      JOIN driver_routes dr ON dr.driver_id = dp.user_id
      WHERE dp.is_available = true
        AND dr.status = 'active'
        AND dr.evening_time < $1::TIME
    `, [currentTimeStr]);

    for (const driver of shiftEndedResult.rows) {
      // Mark as offline in drivers
      await query(
        `UPDATE drivers SET is_available = false WHERE user_id = $1`,
        [driver.user_id]
      );
      // Mark as offline in driver_availability
      await query(
        `UPDATE driver_availability SET status = 'offline', last_updated = NOW() WHERE driver_id = $1`,
        [driver.user_id]
      );
      // Log status change
      await query(
        `INSERT INTO driver_status_history (driver_id, old_status, new_status, reason)
         VALUES ($1, 'online', 'offline', 'Auto-marked offline: Shift ended')`,
        [driver.user_id]
      );
    }

    if (staleResult.rows.length > 0 || criticalResult.rows.length > 0 || shiftEndedResult.rows.length > 0) {
      logger.info('driverStatusWorker: Completed', {
        staleDriversMarkedOffline: staleResult.rows.length,
        criticalReplacements: criticalResult.rows.length,
        shiftEndedOffline: shiftEndedResult.rows.length,
      });
    }

    return {
      staleDrivers: staleResult.rows.length,
      replacementsTriggered: criticalResult.rows.length,
      shiftEndedOffline: shiftEndedResult.rows.length,
    };
  } catch (error) {
    logger.error('driverStatusWorker error:', error);
    throw error;
  }
};

module.exports = { processDriverStatusCheck };
// ========== END ==========
