// ========== FILE: src/modules/drivers/drivers.service.js ==========
const { query } = require('../../config/db');
const logger = require('../../utils/logger');
const { createNotification, notifyAdmins } = require('../../utils/notify');

// ───────────── Helper: Get driver_profile by user_id ─────────────
const getDriverProfileByUserId = async (userId) => {
  const result = await query(
    'SELECT * FROM drivers WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
};

// ───────────── Create Driver Profile ─────────────
const createDriverProfile = async (userId, data) => {
  try {
    const { license_number, license_expiry, aadhar_number, pan_card_number, bank_account_number, experience_years, pan_card_image, license_image, aadhar_image, address } = data;

    // 1. Check user role is 'driver'
    const userResult = await query('SELECT role, full_name FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'driver') {
      throw new Error('UNAUTHORIZED');
    }

    // 2. Check license uniqueness
    const licenseCheck = await query(
      'SELECT id FROM drivers WHERE license_number = $1 AND user_id != $2',
      [license_number, userId]
    );
    if (licenseCheck.rows.length > 0) {
      throw new Error('LICENSE_EXISTS');
    }

    // 3. Check aadhar uniqueness
    const aadharCheck = await query(
      'SELECT id FROM drivers WHERE aadhar_number = $1 AND user_id != $2',
      [aadhar_number, userId]
    );
    if (aadharCheck.rows.length > 0) {
      throw new Error('AADHAR_EXISTS');
    }

    // 4. Check driver profile doesn't already exist or update if rejected
    const existingProfile = await getDriverProfileByUserId(userId);
    if (existingProfile) {
      if (existingProfile.is_rejected) {
        // Update the rejected profile instead of failing
        const updated = await query(
          `UPDATE drivers 
           SET license_number = $2, license_expiry = $3, aadhar_number = $4, 
               pan_card_number = $5, bank_account_number = $6, experience_years = $7, 
               pan_card_image = $8, license_image = $9, aadhar_image = $10, address = $11,
               is_rejected = false, rejection_reason = NULL, updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [existingProfile.id, license_number, license_expiry, aadhar_number, pan_card_number, bank_account_number, experience_years, pan_card_image, license_image, aadhar_image, address]
        );
        return updated.rows[0];
      }
      throw new Error('PROFILE_EXISTS');
    }

    // 5. Insert driver profile
    const result = await query(
      `INSERT INTO drivers (user_id, license_number, license_expiry, aadhar_number, pan_card_number, bank_account_number, experience_years, pan_card_image, license_image, aadhar_image, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, license_number, license_expiry, aadhar_number, pan_card_number, bank_account_number, experience_years, pan_card_image, license_image, aadhar_image, address]
    );

    // Notify Admins
    notifyAdmins(
      'New Driver Verification Request',
      `A new driver (${userResult.rows[0].full_name || 'Driver'}) has submitted their profile for verification.`,
      'system'
    );

    return result.rows[0];
  } catch (error) {
    if (['UNAUTHORIZED', 'PROFILE_EXISTS', 'LICENSE_EXISTS', 'AADHAR_EXISTS'].includes(error.message)) {
      throw error;
    }
    logger.error(`createDriverProfile error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Add Vehicle ─────────────
const addVehicle = async (userId, data) => {
  try {
    const { vehicle_number, vehicle_type, brand, model, year, color, seating_capacity } = data;

    // 1. Get driver profile
    const driverProfile = await getDriverProfileByUserId(userId);
    if (!driverProfile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    // 2. Check vehicle number uniqueness
    const vehicleCheck = await query(
      'SELECT id FROM vehicles WHERE vehicle_number = $1',
      [vehicle_number]
    );
    if (vehicleCheck.rows.length > 0) {
      throw new Error('VEHICLE_EXISTS');
    }

    // 3. Insert vehicle
    const result = await query(
      `INSERT INTO vehicles (driver_id, vehicle_number, vehicle_type, brand, model, year, color, seating_capacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, driver_id, vehicle_number, vehicle_type, brand, model,
                 year, color, seating_capacity, is_active, created_at`,
      [driverProfile.id, vehicle_number, vehicle_type, brand, model, year, color, seating_capacity]
    );

    return result.rows[0];
  } catch (error) {
    if (['PROFILE_NOT_FOUND', 'VEHICLE_EXISTS'].includes(error.message)) {
      throw error;
    }
    logger.error(`addVehicle error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get Driver Profile (Full) ─────────────
const getDriverProfile = async (userId) => {
  try {
    // User info
    const userResult = await query(
      `SELECT id, full_name, email, phone, role, profile_photo,
              is_active, is_email_verified, is_phone_verified, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    const user_info = userResult.rows[0];

    // Driver profile
    const profileResult = await query(
      `SELECT * FROM drivers WHERE user_id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    const profile = profileResult.rows[0];

    // Vehicles
    const vehiclesResult = await query(
      `SELECT id, vehicle_number, vehicle_type, brand, model,
              year, color, seating_capacity, is_active, created_at
       FROM vehicles WHERE driver_id = $1 ORDER BY created_at DESC`,
      [profile.id]
    );

    return {
      profile,
      user_info,
      vehicles: vehiclesResult.rows,
    };
  } catch (error) {
    if (['NOT_FOUND', 'PROFILE_NOT_FOUND'].includes(error.message)) throw error;
    logger.error(`getDriverProfile error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Update Driver Profile (Availability Toggle) ─────────────
const updateDriverProfile = async (userId, data) => {
  try {
    const driverProfile = await getDriverProfileByUserId(userId);
    if (!driverProfile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    const { is_available } = data;
    const result = await query(
      `UPDATE drivers SET is_available = $1 WHERE user_id = $2
       RETURNING id, user_id, license_number, license_expiry, aadhar_number,
                 is_verified, is_available, current_lat, current_lng,
                 rating, created_at`,
      [is_available, userId]
    );

    // If driver marked as offline/unavailable, trigger reassignment for their active subscriptions
    if (is_available === false) {
      const activeSubs = await query(`SELECT id FROM subscription_plans WHERE driver_id = $1 AND status = 'active'`, [driverProfile.id]);
      if (activeSubs.rows.length > 0) {
        try {
          const { addJob } = require('../../workers');
          for (const sub of activeSubs.rows) {
            await addJob('driver-reassignment', 'reassign', {
              subscriptionId: sub.id,
              oldDriverId: driverProfile.id,
              reason: 'Driver went offline / marked unavailable'
            });
          }
          logger.info(`Queued ${activeSubs.rows.length} reassignment(s) for driver ${driverProfile.id} going offline`);
        } catch (queueErr) {
          logger.error('Failed to queue reassignment when driver went offline:', queueErr);
        }
      }
    }

    return result.rows[0];
  } catch (error) {
    if (error.message === 'PROFILE_NOT_FOUND') throw error;
    logger.error(`updateDriverProfile error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Update Driver Location ─────────────
const updateDriverLocation = async (userId, lat, lng) => {
  try {
    const driverProfile = await getDriverProfileByUserId(userId);
    if (!driverProfile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    await query(
      'UPDATE drivers SET current_lat = $1, current_lng = $2 WHERE user_id = $3',
      [lat, lng, userId]
    );

    return { message: 'Location updated', lat, lng };
  } catch (error) {
    if (error.message === 'PROFILE_NOT_FOUND') throw error;
    logger.error(`updateDriverLocation error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get Assigned Subscriptions (Active Passengers) ─────────────
const getAssignedSubscriptions = async (userId) => {
  try {
    const driverProfile = await getDriverProfileByUserId(userId);
    if (!driverProfile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    const result = await query(
      `SELECT
         sp.id AS subscription_id,
         sp.status, sp.start_date, sp.end_date,
         sp.pickup_address, sp.pickup_lat, sp.pickup_lng,
         sp.drop_address, sp.drop_lat, sp.drop_lng,
         true AS morning_slot, sp.wants_evening_return AS evening_slot, sp.total_amount AS amount_paid,
         pu.full_name AS passenger_name, pu.phone AS passenger_phone,
         pu.email AS passenger_email,
         'Standard Route' AS route_name, sp.pickup_address AS route_pickup, sp.drop_address AS route_drop,
         sp.distance_km, null AS estimated_duration_min,
         sp.morning_pickup_time, sp.evening_return_time AS evening_pickup_time,
         v.brand AS vehicle_brand, v.model AS vehicle_model,
         v.vehicle_number, v.color AS vehicle_color
       FROM subscription_plans sp
       JOIN users pu ON sp.user_id = pu.id
       LEFT JOIN vehicles v ON sp.vehicle_id = v.id
       WHERE sp.driver_id = $1 AND sp.status = 'active'
       ORDER BY sp.start_date ASC`,
      [driverProfile.id]
    );

    return result.rows;
  } catch (error) {
    if (error.message === 'PROFILE_NOT_FOUND') throw error;
    logger.error(`getAssignedSubscriptions error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Mark Attendance ─────────────
const markAttendance = async (userId, data) => {
  try {
    const { subscription_id, date, slot, status, pickup_time, drop_time } = data;

    // 1. Get driver profile
    const driverProfile = await getDriverProfileByUserId(userId);
    if (!driverProfile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    // 2. Verify this subscription belongs to this driver
    const subResult = await query(
      `SELECT us.id, us.user_id, us.driver_id
       FROM user_subscriptions us
       WHERE us.id = $1 AND us.driver_id = $2`,
      [subscription_id, driverProfile.id]
    );
    if (subResult.rows.length === 0) {
      throw new Error('UNAUTHORIZED');
    }

    const subscription = subResult.rows[0];

    // 3. Check attendance not already marked
    const existingAttendance = await query(
      `SELECT id FROM trips
       WHERE driver_id = $1 AND subscription_plan_id = $2 AND date = $3 AND slot = $4`,
      [driverProfile.id, subscription_id, date, slot]
    );
    if (existingAttendance.rows.length > 0) {
      throw new Error('ALREADY_MARKED');
    }

    // 4. Insert attendance record
    const attendanceResult = await query(
      `INSERT INTO trips
         (driver_id, subscription_plan_id, date, slot, status, actual_pickup_time, actual_drop_time,
          driver_lat_at_pickup, driver_lng_at_pickup)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, driver_id, subscription_plan_id as subscription_id, date, slot, status,
                 actual_pickup_time as pickup_time, actual_drop_time as drop_time, created_at`,
      [
        driverProfile.id, subscription_id, date, slot, status,
        pickup_time || null, drop_time || null,
        driverProfile.current_lat, driverProfile.current_lng,
      ]
    );

    // 5. If completed, increment total_rides
    if (status === 'completed') {
      await query(
        'UPDATE drivers SET total_rides = total_rides + 1 WHERE id = $1',
        [driverProfile.id]
      );
    }

    // 6. Get driver's name for notification
    const driverUser = await query('SELECT full_name FROM users WHERE id = $1', [userId]);
    const driverName = driverUser.rows[0]?.full_name || 'Your driver';

    // 7. Create notification for the passenger
    const passengerId = subscription.user_id;
    if (status === 'completed') {
      createNotification(
        passengerId,
        'Ride Completed ✅',
        `Your ride on ${date} (${slot}) was completed by driver ${driverName}.`,
        'ride'
      );
    } else if (status === 'missed') {
      createNotification(
        passengerId,
        'Ride Missed ⚠️',
        `Your driver marked as missed for ${date} (${slot}). Contact support if needed.`,
        'ride'
      );
    }

    return attendanceResult.rows[0];
  } catch (error) {
    if (['PROFILE_NOT_FOUND', 'UNAUTHORIZED', 'NOT_FOUND', 'ALREADY_MARKED'].includes(error.message)) {
      throw error;
    }
    logger.error(`markAttendance error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get Driver Attendance ─────────────
const getDriverAttendance = async (userId, filters = {}) => {
  try {
    const driverProfile = await getDriverProfileByUserId(userId);
    if (!driverProfile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    const now = new Date();
    const month = parseInt(filters.month, 10) || (now.getMonth() + 1);
    const year = parseInt(filters.year, 10) || now.getFullYear();

    // Build date range for the specified month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // End of month: first day of next month
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    // Get attendance records
    const attendanceResult = await query(
      `SELECT
         da.id, da.date, da.slot, da.status,
         da.actual_pickup_time AS pickup_time, da.actual_drop_time AS drop_time, da.created_at,
         pu.full_name AS passenger_name,
         us.pickup_address, us.drop_address
       FROM trips da
       JOIN subscription_plans us ON da.subscription_plan_id = us.id
       JOIN users pu ON us.user_id = pu.id
       WHERE da.driver_id = $1 AND da.date >= $2 AND da.date < $3
       ORDER BY da.date DESC, da.slot ASC`,
      [driverProfile.id, startDate, endDate]
    );

    // Get summary counts
    const summaryResult = await query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE status = 'missed') AS missed,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending
       FROM trips
       WHERE driver_id = $1 AND date >= $2 AND date < $3`,
      [driverProfile.id, startDate, endDate]
    );

    const summary = summaryResult.rows[0];

    return {
      attendance: attendanceResult.rows,
      summary: {
        total: parseInt(summary.total, 10),
        completed: parseInt(summary.completed, 10),
        missed: parseInt(summary.missed, 10),
        pending: parseInt(summary.pending, 10),
      },
      month,
      year,
    };
  } catch (error) {
    if (error.message === 'PROFILE_NOT_FOUND') throw error;
    logger.error(`getDriverAttendance error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get Driver Earnings ─────────────
const getDriverEarnings = async (userId) => {
  try {
    const driverProfile = await getDriverProfileByUserId(userId);
    if (!driverProfile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    const now = new Date();
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonthStart = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`;
    const lastMonthEnd = thisMonthStart;

    // Driver gets 80% of subscription amount
    const DRIVER_SHARE = 0.80;

    // Total earned (all time)
    const totalResult = await query(
      `SELECT COALESCE(SUM(p.driver_amount), 0) AS total
       FROM payments p
       JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
       WHERE sp.driver_id = $1 AND p.status = 'success'`,
      [driverProfile.id]
    );
    const total_earned = parseFloat(totalResult.rows[0].total) * DRIVER_SHARE;

    // This month earnings
    const thisMonthResult = await query(
      `SELECT COALESCE(SUM(p.driver_amount), 0) AS total
       FROM payments p
       JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
       WHERE sp.driver_id = $1 AND p.status = 'success' AND p.created_at >= $2`,
      [driverProfile.id, thisMonthStart]
    );
    const this_month = parseFloat(thisMonthResult.rows[0].total) * DRIVER_SHARE;

    // Last month earnings
    const lastMonthResult = await query(
      `SELECT COALESCE(SUM(p.driver_amount), 0) AS total
       FROM payments p
       JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
       WHERE sp.driver_id = $1 AND p.status = 'success'
         AND p.created_at >= $2 AND p.created_at < $3`,
      [driverProfile.id, lastMonthStart, lastMonthEnd]
    );
    const last_month = parseFloat(lastMonthResult.rows[0].total) * DRIVER_SHARE;

    // Recent payment records
    const recordsResult = await query(
      `SELECT
         p.id AS payment_id, p.amount, p.status AS payment_status,
         p.created_at AS payment_date,
         sp.plan_type AS plan_name,
         pu.full_name AS passenger_name
       FROM payments p
       JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
       JOIN users pu ON sp.user_id = pu.id
       WHERE sp.driver_id = $1 AND p.status = 'success'
       ORDER BY p.created_at DESC
       LIMIT 20`,
      [driverProfile.id]
    );

    return {
      total_earned: Math.round(total_earned * 100) / 100,
      this_month: Math.round(this_month * 100) / 100,
      last_month: Math.round(last_month * 100) / 100,
      driver_share_percentage: DRIVER_SHARE * 100,
      payment_records: recordsResult.rows,
    };
  } catch (error) {
    if (error.message === 'PROFILE_NOT_FOUND') throw error;
    logger.error(`getDriverEarnings error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get Driver Dashboard Stats ─────────────
const getDriverDashboardStats = async (userId) => {
  try {
    const driverProfile = await getDriverProfileByUserId(userId);
    if (!driverProfile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const now = new Date();
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Active passengers
    const activeResult = await query(
      `SELECT COUNT(*) AS count FROM subscription_plans
       WHERE driver_id = $1 AND status = 'active'`,
      [driverProfile.id]
    );

    // Today's total rides
    const todayResult = await query(
      `SELECT COUNT(*) AS count FROM trips
       WHERE driver_id = $1 AND date = $2`,
      [driverProfile.id, today]
    );

    // Completed today
    const completedTodayResult = await query(
      `SELECT COUNT(*) AS count FROM trips
       WHERE driver_id = $1 AND date = $2 AND status = 'completed'`,
      [driverProfile.id, today]
    );

    // This month completed rides
    const thisMonthResult = await query(
      `SELECT COUNT(*) AS count FROM trips
       WHERE driver_id = $1 AND date >= $2 AND status = 'completed'`,
      [driverProfile.id, thisMonthStart]
    );

    return {
      active_passengers: parseInt(activeResult.rows[0].count, 10),
      today_rides: parseInt(todayResult.rows[0].count, 10),
      completed_today: parseInt(completedTodayResult.rows[0].count, 10),
      this_month_rides: parseInt(thisMonthResult.rows[0].count, 10),
      rating: parseFloat(driverProfile.rating) || 0,
      total_rides: driverProfile.total_rides,
      is_available: driverProfile.is_available,
      is_verified: driverProfile.is_verified,
    };
  } catch (error) {
    if (error.message === 'PROFILE_NOT_FOUND') throw error;
    logger.error(`getDriverDashboardStats error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

module.exports = {
  createDriverProfile,
  addVehicle,
  getDriverProfile,
  updateDriverProfile,
  updateDriverLocation,
  getAssignedSubscriptions,
  markAttendance,
  getDriverAttendance,
  getDriverEarnings,
  getDriverDashboardStats,
};
// ========== END ==========
