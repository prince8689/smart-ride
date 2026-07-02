// ========== FILE: src/services/attendanceService.js ==========
const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Mark driver attendance for today. Only once per day.
 *
 * @param {string} driverId - users.id (driver's user ID)
 * @param {string} driverRouteId - driver_routes.id (optional)
 * @param {string} status - 'ready' | 'unavailable'
 * @returns {object}
 */
const markAttendance = async (driverId, driverRouteId, status) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if already marked today
    const existing = await query(
      'SELECT * FROM driver_attendance_v2 WHERE driver_id = $1 AND date = $2',
      [driverId, today]
    );

    if (existing.rows.length > 0) {
      throw new Error('ALREADY_MARKED');
    }

    // Insert attendance
    const result = await query(
      `INSERT INTO driver_attendance_v2 (driver_id, driver_route_id, date, status, marked_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [driverId, driverRouteId || null, today, status]
    );

    // Update driver_availability based on attendance
    const availabilityStatus = status === 'ready' ? 'online' : 'unavailable';
    await query(
      `INSERT INTO driver_availability (driver_id, status, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (driver_id) DO UPDATE SET status = $2, last_updated = NOW()`,
      [driverId, availabilityStatus]
    );

    // Log status change
    await query(
      `INSERT INTO driver_status_history (driver_id, old_status, new_status, reason)
       VALUES ($1, NULL, $2, $3)`,
      [driverId, availabilityStatus, `Attendance marked as ${status}`]
    );

    logger.info('markAttendance completed', { driverId, status });

    return result.rows[0];
  } catch (error) {
    if (error.message === 'ALREADY_MARKED') throw error;
    logger.error('markAttendance error:', error);
    throw error;
  }
};

/**
 * Get today's attendance for a driver.
 */
const getTodayAttendance = async (driverId) => {
  const today = new Date().toISOString().split('T')[0];
  const result = await query(
    'SELECT * FROM driver_attendance_v2 WHERE driver_id = $1 AND date = $2',
    [driverId, today]
  );
  return result.rows[0] || null;
};

/**
 * Get attendance history for a driver by month.
 * @param {string} driverId
 * @param {string} month - YYYY-MM format
 */
const getAttendanceHistory = async (driverId, month) => {
  // Parse month to get start and end dates
  const [year, mon] = month.split('-').map(Number);
  const startDate = new Date(year, mon - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, mon, 0).toISOString().split('T')[0]; // Last day of month

  const result = await query(
    `SELECT * FROM driver_attendance_v2
     WHERE driver_id = $1 AND date >= $2 AND date <= $3
     ORDER BY date DESC`,
    [driverId, startDate, endDate]
  );

  // Summary
  const total = result.rows.length;
  const ready = result.rows.filter(r => r.status === 'ready').length;
  const unavailable = result.rows.filter(r => r.status === 'unavailable').length;
  const autoUnavailable = result.rows.filter(r => r.status === 'auto_unavailable').length;

  return {
    records: result.rows,
    summary: { total, ready, unavailable, auto_unavailable: autoUnavailable },
  };
};

/**
 * Get admin attendance summary for a specific date.
 * @param {string} date - YYYY-MM-DD
 */
const getAdminAttendanceSummary = async (date) => {
  const result = await query(`
    SELECT
      da.*, u.full_name, u.phone, u.profile_photo,
      dr.start_address, dr.end_address
    FROM driver_attendance_v2 da
    JOIN users u ON da.driver_id = u.id
    LEFT JOIN driver_routes dr ON da.driver_route_id = dr.id
    WHERE da.date = $1
    ORDER BY da.marked_at DESC
  `, [date]);

  const totalMarked = result.rows.length;
  const readyCount = result.rows.filter(r => r.status === 'ready').length;
  const unavailableCount = result.rows.filter(r => r.status === 'unavailable').length;
  const autoUnavailableCount = result.rows.filter(r => r.status === 'auto_unavailable').length;

  // Count total active drivers who should have marked
  const activeDriversResult = await query(`
    SELECT COUNT(DISTINCT dr.driver_id) AS total
    FROM driver_routes dr
    WHERE dr.status = 'active'
  `);
  const totalActiveDrivers = parseInt(activeDriversResult.rows[0]?.total || 0);
  const notMarked = totalActiveDrivers - totalMarked;

  return {
    records: result.rows,
    summary: {
      total_active_drivers: totalActiveDrivers,
      marked: totalMarked,
      ready: readyCount,
      unavailable: unavailableCount,
      auto_unavailable: autoUnavailableCount,
      not_marked: Math.max(0, notMarked),
    },
  };
};

module.exports = {
  markAttendance,
  getTodayAttendance,
  getAttendanceHistory,
  getAdminAttendanceSummary,
};
// ========== END ==========
