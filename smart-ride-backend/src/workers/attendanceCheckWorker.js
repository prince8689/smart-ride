// ========== FILE: src/workers/attendanceCheckWorker.js ==========
const logger = require('../utils/logger');
const { query } = require('../config/db');

/**
 * Attendance Check Worker
 * Runs daily at 7:30 AM.
 *
 * - Finds drivers with active routes who haven't marked attendance today.
 * - Auto-marks them as 'auto_unavailable'.
 * - Sets driver_availability status to 'unavailable'.
 * - Adds each to replacement queue for their active subscriptions.
 */
const processAttendanceCheck = async (replacementQueue) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    logger.info('attendanceCheckWorker: Starting attendance check', { date: today });

    // Find drivers with active routes who haven't marked attendance today
    const unmarkedResult = await query(`
      SELECT DISTINCT dr.driver_id, dr.id AS driver_route_id
      FROM driver_routes dr
      WHERE dr.status = 'active'
        AND dr.driver_id NOT IN (
          SELECT driver_id FROM driver_attendance_v2 WHERE date = $1
        )
    `, [today]);

    let autoMarkedCount = 0;

    for (const driver of unmarkedResult.rows) {
      // Auto-mark as 'auto_unavailable'
      await query(
        `INSERT INTO driver_attendance_v2 (driver_id, driver_route_id, date, status, marked_at)
         VALUES ($1, $2, $3, 'auto_unavailable', NOW())
         ON CONFLICT (driver_id, date) DO NOTHING`,
        [driver.driver_id, driver.driver_route_id, today]
      );

      // Update driver_availability
      await query(
        `INSERT INTO driver_availability (driver_id, status, last_updated)
         VALUES ($1, 'unavailable', NOW())
         ON CONFLICT (driver_id) DO UPDATE SET status = 'unavailable', last_updated = NOW()`,
        [driver.driver_id]
      );

      // Log status change
      await query(
        `INSERT INTO driver_status_history (driver_id, old_status, new_status, reason)
         VALUES ($1, NULL, 'unavailable', 'Auto-marked unavailable: no attendance')`,
        [driver.driver_id]
      );

      // Find active subscriptions for this driver and add to replacement queue
      const subsResult = await query(`
        SELECT sp.id AS subscription_id
        FROM subscription_plans sp
        JOIN drivers d ON sp.driver_id = d.id
        WHERE d.user_id = $1 AND sp.status = 'active'
      `, [driver.driver_id]);

      for (const sub of subsResult.rows) {
        try {
          const { addJob } = require('./index');
          await addJob('driver-reassignment', 'reassign', {
            subscriptionId: sub.subscription_id,
            oldDriverId: driver.driver_id,
            reason: 'Driver auto-marked unavailable (no attendance)'
          });
        } catch (e) {
          logger.error('Failed to queue reassignment for attendance failure:', e);
        }
      }

      autoMarkedCount++;
    }

    logger.info('attendanceCheckWorker: Completed', {
      date: today,
      driversChecked: unmarkedResult.rows.length,
      autoMarked: autoMarkedCount,
    });

    return { autoMarked: autoMarkedCount };
  } catch (error) {
    logger.error('attendanceCheckWorker error:', error);
    throw error;
  }
};

module.exports = { processAttendanceCheck };
// ========== END ==========
