// ========== FILE: src/modules/admin/admin.service.js ==========
const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const { createNotification } = require('../../utils/notify');
const logger = require('../../utils/logger');

// ==========================================
// 1. USER MANAGEMENT
// ==========================================

const getAllUsers = async (filters) => {
  try {
    const { role, is_active, search, city, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = ['u.is_email_verified = true'];
    let values = [];
    let valueIdx = 1;

    if (role) {
      whereConditions.push(`u.role = $${valueIdx++}`);
      values.push(role);
    }
    if (is_active !== undefined) {
      whereConditions.push(`u.is_active = $${valueIdx++}`);
      values.push(is_active);
    }
    if (search) {
      whereConditions.push(`(u.full_name ILIKE $${valueIdx} OR u.email ILIKE $${valueIdx} OR u.phone ILIKE $${valueIdx})`);
      values.push(`%${search}%`);
      valueIdx++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM users u ${whereClause}`, values);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(`
      SELECT 
        u.id, u.full_name, u.email, u.phone, u.role, u.is_email_verified as is_verified, u.is_active, u.created_at,
        (SELECT COUNT(*) FROM subscription_plans us WHERE us.user_id = u.id AND us.status = 'active') as active_subscription_count,
        dp.is_verified as driver_verified, dp.rating as driver_rating
      FROM users u
      LEFT JOIN drivers dp ON u.id = dp.user_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${valueIdx++} OFFSET $${valueIdx}
    `, [...values, limit, offset]);

    return { users: dataRes.rows, total, page: parseInt(page, 10), limit: parseInt(limit, 10) };
  } catch (error) {
    logger.error(`getAllUsers error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const getUserDetails = async (userId) => {
  try {
    const userRes = await query(`SELECT id, full_name, email, phone, role, is_email_verified as is_verified, is_active, created_at FROM users WHERE id = $1`, [userId]);
    if (userRes.rows.length === 0) throw new Error('USER_NOT_FOUND');
    const user = userRes.rows[0];

    if (user.role === 'user') {
      const subs = await query(`SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
      const pays = await query(`SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
      const comps = await query(`SELECT * FROM complaints WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
      user.subscriptions = subs.rows;
      user.payments = pays.rows;
      user.complaints = comps.rows;
    } else if (user.role === 'driver') {
      const profile = await query(`SELECT * FROM drivers WHERE user_id = $1`, [userId]);
      const vehicles = await query(`SELECT * FROM vehicles WHERE driver_id = $1`, [profile.rows[0]?.id]);
      const subs = await query(`SELECT * FROM user_subscriptions WHERE driver_id = $1 AND status = 'active'`, [profile.rows[0]?.id]);
      user.driver_profile = profile.rows[0] || null;
      user.vehicles = vehicles.rows;
      user.assigned_subscriptions = subs.rows;
    }

    return user;
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') throw error;
    logger.error(`getUserDetails error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const updateUserStatus = async (userId, is_active, reason, requestingAdminId) => {
  try {
    const userRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (userRes.rows.length === 0) throw new Error('USER_NOT_FOUND');
    
    if (userId === requestingAdminId && !is_active) throw new Error('CANNOT_DEACTIVATE_SELF');
    if (userRes.rows[0].role === 'admin' && !is_active && userId !== requestingAdminId) {
       // Admins can deactivate other admins, but let's keep it allowing if specified
    }

    const updated = await query(`UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, is_active`, [is_active, userId]);

    if (!is_active) {
      createNotification(userId, 'Account Deactivated', `Your Smart Ride account has been deactivated. Reason: ${reason || 'Admin action'}. Contact support.`, 'system');
    } else {
      createNotification(userId, 'Account Reactivated', 'Your Smart Ride account has been reactivated. Welcome back!', 'system');
    }
    return updated.rows[0];
  } catch (error) {
    if (['USER_NOT_FOUND', 'CANNOT_MODIFY_ADMIN', 'CANNOT_DEACTIVATE_SELF'].includes(error.message)) throw error;
    logger.error(`updateUserStatus error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const createAdmin = async (data) => {
  try {
    const emailCheck = await query(`SELECT id FROM users WHERE email = $1`, [data.email]);
    if (emailCheck.rows.length > 0) throw new Error('EMAIL_EXISTS');

    const phoneCheck = await query(`SELECT id FROM users WHERE phone = $1`, [data.phone]);
    if (phoneCheck.rows.length > 0) throw new Error('PHONE_EXISTS');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const res = await query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_email_verified, is_phone_verified, is_active)
       VALUES ($1, $2, $3, $4, 'admin', true, true, true) RETURNING id, full_name, email, role, created_at`,
      [data.full_name, data.email, data.phone, passwordHash]
    );

    return res.rows[0];
  } catch (error) {
    if (['EMAIL_EXISTS', 'PHONE_EXISTS'].includes(error.message)) throw error;
    logger.error(`createAdmin error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const deleteUserPermanently = async (userId, adminId) => {
  const client = await require('../../config/db').pool.connect();
  try {
    await client.query('BEGIN');
    
    const userRes = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) throw new Error('USER_NOT_FOUND');
    if (userRes.rows[0].role === 'admin' && userId !== adminId) {
      throw new Error('CANNOT_MODIFY_ADMIN');
    }
    if (userId === adminId) {
      throw new Error('CANNOT_DEACTIVATE_SELF');
    }

    await client.query('DELETE FROM payments WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM complaints WHERE user_id = $1', [userId]);
    
    if (userRes.rows[0].role === 'driver') {
      const dp = await client.query('SELECT id FROM drivers WHERE user_id = $1', [userId]);
      if (dp.rows.length > 0) {
        await client.query('DELETE FROM complaints WHERE driver_id = $1', [dp.rows[0].id]);
        // Unassign driver from any active subscriptions
        await client.query('UPDATE subscription_plans SET driver_id = NULL, vehicle_id = NULL WHERE driver_id = $1', [dp.rows[0].id]);
      }
    }

    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
    return { id: userId, deleted: true };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`deleteUserPermanently error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
};

// ==========================================
// 2. DRIVER MANAGEMENT
// ==========================================

const getAllDrivers = async (filters) => {
  try {
    const { is_verified, is_available, city, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let conditions = ['u.is_email_verified = true'];
    let values = [];
    let idx = 1;

    if (is_verified !== undefined) {
      conditions.push(`dp.is_verified = $${idx++}`);
      values.push(is_verified);
    }
    if (is_available !== undefined) {
      conditions.push(`dp.is_available = $${idx++}`);
      values.push(is_available);
    }
    if (search) {
      conditions.push(`(u.full_name ILIKE $${idx} OR u.phone ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM drivers dp JOIN users u ON dp.user_id = u.id ${where}`, values);
    const total = parseInt(countRes.rows[0].count, 10);

    const res = await query(`
      SELECT dp.*, u.full_name, u.email, u.phone, u.is_active,
      (SELECT COUNT(*) FROM user_subscriptions us WHERE us.driver_id = dp.id AND us.status = 'active') as active_passengers_count
      FROM drivers dp
      JOIN users u ON dp.user_id = u.id
      ${where}
      ORDER BY dp.created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
    `, [...values, limit, offset]);

    for (let driver of res.rows) {
      const v = await query(`SELECT * FROM vehicles WHERE driver_id = $1`, [driver.id]);
      driver.vehicles = v.rows;
    }

    return { drivers: res.rows, total, page: parseInt(page, 10), limit: parseInt(limit, 10) };
  } catch (error) {
    logger.error(`getAllDrivers error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const getUnverifiedDrivers = async () => {
  try {
    const res = await query(`
      SELECT dp.*, u.full_name, u.phone, u.email
      FROM drivers dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.is_verified = false
      ORDER BY dp.created_at ASC
    `);
    return res.rows;
  } catch (error) {
    logger.error(`getUnverifiedDrivers error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const verifyDriver = async (driverProfileId) => {
  try {
    const driver = await query(`
      SELECT dp.*, u.email, u.full_name 
      FROM drivers dp 
      JOIN users u ON dp.user_id = u.id 
      WHERE dp.id = $1
    `, [driverProfileId]);
    if (driver.rows.length === 0) throw new Error('DRIVER_NOT_FOUND');

    const vehicles = await query(`SELECT id FROM vehicles WHERE driver_id = $1`, [driverProfileId]);
    if (vehicles.rows.length === 0) throw new Error('NO_VEHICLE');

    const updated = await query(`UPDATE drivers SET is_verified = true, updated_at = NOW() WHERE id = $1 RETURNING *`, [driverProfileId]);

    createNotification(driver.rows[0].user_id, 'Profile Verified', 'Congratulations! Your driver profile has been verified. You can now receive assignments.', 'driver_updates');
    
    // Send email notification
    const { sendDriverApprovalEmail } = require('../auth/auth.emails');
    await sendDriverApprovalEmail(driver.rows[0].email, driver.rows[0].full_name);

    return { message: 'Driver verified successfully', driver: updated.rows[0] };
  } catch (error) {
    if (['DRIVER_NOT_FOUND', 'NO_VEHICLE'].includes(error.message)) throw error;
    logger.error(`verifyDriver error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const rejectDriver = async (driverProfileId, reason) => {
  try {
    const driver = await query(`
      SELECT dp.user_id, u.email, u.full_name 
      FROM drivers dp 
      JOIN users u ON dp.user_id = u.id 
      WHERE dp.id = $1`, [driverProfileId]
    );
    if (driver.rows.length === 0) throw new Error('DRIVER_NOT_FOUND');

    await query(`UPDATE drivers SET is_verified = false, is_rejected = true, rejection_reason = $2, updated_at = NOW() WHERE id = $1`, [driverProfileId, reason]);

    createNotification(driver.rows[0].user_id, 'Profile Rejected', `Your driver profile verification was rejected. Reason: ${reason}. Please submit your details again.`, 'system');
    
    // Send email notification
    const { sendDriverRejectionEmail } = require('../auth/auth.emails');
    await sendDriverRejectionEmail(driver.rows[0].email, driver.rows[0].full_name, reason);

    return { message: 'Driver rejected and profile marked for re-submission', reason };
  } catch (error) {
    if (error.message === 'DRIVER_NOT_FOUND') throw error;
    logger.error(`rejectDriver error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

// ==========================================
// 3. DRIVER-ROUTE ASSIGNMENT
// ==========================================

const assignDriverToSubscription = async (subscriptionId, driverProfileId, vehicleId, estimatedPickupTime = null, driverRouteId = null, overrideReason = null) => {
  try {
    const subRes = await query(`SELECT * FROM subscription_plans WHERE id = $1`, [subscriptionId]);
    if (subRes.rows.length === 0) throw new Error('SUBSCRIPTION_NOT_FOUND');
    const sub = subRes.rows[0];
    if (sub.status !== 'waiting_driver_assignment' && sub.status !== 'active') throw new Error('SUBSCRIPTION_NOT_ACTIVE');

    const driverRes = await query(`SELECT * FROM drivers WHERE id = $1`, [driverProfileId]);
    if (driverRes.rows.length === 0) throw new Error('DRIVER_NOT_FOUND');
    const driver = driverRes.rows[0];
    if (!driver.is_verified) throw new Error('DRIVER_NOT_VERIFIED');
    if (!driver.is_available) throw new Error('DRIVER_NOT_AVAILABLE');

    const vehRes = await query(`SELECT * FROM vehicles WHERE id = $1 AND driver_id = $2`, [vehicleId, driverProfileId]);
    if (vehRes.rows.length === 0) throw new Error('VEHICLE_MISMATCH');
    const vehicle = vehRes.rows[0];

    if (sub.preferred_vehicle_type && sub.preferred_vehicle_type !== vehicle.vehicle_type) {
      throw new Error('VEHICLE_MISMATCH');
    }

    // Find driver's active route to deduct seats
    let routeQuery = `SELECT * FROM driver_routes WHERE driver_id = $1 AND status = 'active'`;
    let routeParams = [driver.user_id];
    if (driverRouteId) {
      routeQuery += ` AND id = $2`;
      routeParams.push(driverRouteId);
    }
    const routeRes = await query(routeQuery, routeParams);
    let route = routeRes.rows.length > 0 ? routeRes.rows[0] : null;

    if (route) {
      await query(`UPDATE driver_routes SET available_seats = GREATEST(0, available_seats - $1) WHERE id = $2`, [sub.number_of_passengers || 1, route.id]);
    }

    const updated = await query(`
      UPDATE subscription_plans 
      SET driver_id = $1, vehicle_id = $2, status = 'active', updated_at = NOW() 
      WHERE id = $3 RETURNING *
    `, [driverProfileId, vehicleId, subscriptionId]);

    // Admin override logging
    if (overrideReason) {
       await query(`
         INSERT INTO assignment_logs (subscription_id, new_driver_id, event_type, reason, created_at)
         VALUES ($1, $2, 'admin_override', $3, NOW())
       `, [subscriptionId, driverProfileId, overrideReason]);
    }

    const dUser = await query(`SELECT full_name FROM users WHERE id = $1`, [driver.user_id]);
    
    // Notification for user
    const etaStr = estimatedPickupTime || (route ? route.morning_time : 'your scheduled time');
    createNotification(sub.user_id, 'Driver Assigned!', `Your driver has been assigned! Driver: ${dUser.rows[0].full_name}, Vehicle: ${vehicle.brand} ${vehicle.model}, Plate: ${vehicle.vehicle_number}. Estimated pickup time: ${etaStr}. Track their location on your dashboard!`, 'subscription');
    
    // Notification for driver
    const pUser = await query(`SELECT full_name, phone FROM users WHERE id = $1`, [sub.user_id]);
    createNotification(
      driver.user_id, 
      'Approve New Request Location', 
      `New assignment! Passenger: ${pUser.rows[0].full_name}, Contact: ${pUser.rows[0].phone}, Route: ${sub.pickup_address} -> ${sub.drop_address}.`, 
      'driver_updates',
      {
        passenger_name: pUser.rows[0].full_name,
        passenger_phone: pUser.rows[0].phone,
        pickup_address: sub.pickup_address,
        drop_address: sub.drop_address
      }
    );

    return { message: 'Driver assigned successfully', subscription: updated.rows[0] };
  } catch (error) {
    if (['SUBSCRIPTION_NOT_FOUND', 'SUBSCRIPTION_NOT_ACTIVE', 'DRIVER_NOT_FOUND', 'DRIVER_NOT_VERIFIED', 'DRIVER_NOT_AVAILABLE', 'VEHICLE_MISMATCH'].includes(error.message)) throw error;
    logger.error(`assignDriverToSubscription error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const bulkAssignDrivers = async (assignments) => {
  let success_count = 0;
  let failure_count = 0;
  const results = [];

  // If assignments are provided, just process them directly.
  if (assignments && assignments.length > 0) {
    for (const assign of assignments) {
      try {
        await assignDriverToSubscription(assign.subscription_id, assign.driver_id, assign.vehicle_id);
        success_count++;
        results.push({ subscription_id: assign.subscription_id, status: 'success', error: null });
      } catch (err) {
        failure_count++;
        results.push({ subscription_id: assign.subscription_id, status: 'failed', error: err.message });
      }
    }
  } else {
    // AUTO-ASSIGN ALL
    // 1. Fetch unassigned active subscriptions
    const unassignedRes = await query(`
      SELECT sp.id, sp.user_id 
      FROM subscription_plans sp
      WHERE (sp.status = 'active' OR sp.status = 'waiting_driver_assignment')
        AND sp.driver_id IS NULL
      ORDER BY sp.created_at ASC
    `);

    const { smartMatchDriver } = require('../../utils/smartMatch');

    for (const sub of unassignedRes.rows) {
      try {
        const matchResult = await smartMatchDriver(sub.id);
        const bestMatch = matchResult.best_match;

        // If a good match is found (score > 70 for example)
        if (bestMatch && bestMatch.score > 70) {
          await assignDriverToSubscription(
            sub.id, 
            bestMatch.driver_profile_id, 
            bestMatch.vehicle.id, 
            bestMatch.estimated_pickup_time,
            bestMatch.driver_route_id
          );
          success_count++;
          results.push({ subscription_id: sub.id, status: 'success', error: null });
        } else {
          failure_count++;
          results.push({ subscription_id: sub.id, status: 'failed', error: 'No optimal driver found' });
        }
      } catch (err) {
        failure_count++;
        results.push({ subscription_id: sub.id, status: 'failed', error: err.message });
      }
    }
  }

  // The frontend toast looks for `res.data.successful` and `res.data.failed`.
  return { successful: success_count, failed: failure_count, results };
};

const unassignDriver = async (subscriptionId) => {
  try {
    const sub = await query(`SELECT * FROM user_subscriptions WHERE id = $1`, [subscriptionId]);
    if (sub.rows.length === 0 || !sub.rows[0].driver_id) return { message: 'No driver assigned' };

    const driver = await query(`SELECT user_id FROM drivers WHERE id = $1`, [sub.rows[0].driver_id]);

    await query(`UPDATE user_subscriptions SET driver_id = NULL, vehicle_id = NULL, updated_at = NOW() WHERE id = $1`, [subscriptionId]);

    createNotification(sub.rows[0].user_id, 'Driver Unassigned', 'Your driver has been unassigned. A new driver will be assigned shortly.', 'subscription');
    createNotification(driver.rows[0].user_id, 'Passenger Unassigned', `You have been unassigned from a passenger.`, 'driver_updates');

    return { message: 'Driver unassigned successfully' };
  } catch (error) {
    logger.error(`unassignDriver error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const getUnassignedSubscriptions = async (filters) => {
  try {
    const { city, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE sp.driver_id IS NULL AND (sp.status = 'active' OR sp.status = 'waiting_driver_assignment')`;
    let values = [];
    if (city) {
      whereClause += ` AND (sp.pickup_address ILIKE $1 OR sp.drop_address ILIKE $1)`;
      values.push(`%${city}%`);
    }

    const res = await query(`
      SELECT 
        sp.id, sp.user_id, sp.plan_type, sp.status, sp.start_date, sp.end_date,
        sp.pickup_address, sp.drop_address, sp.morning_pickup_time, sp.evening_return_time, sp.wants_evening_return,
        u.full_name as passenger_name, u.phone as passenger_phone, u.profile_photo as passenger_photo
      FROM subscription_plans sp
      JOIN users u ON sp.user_id = u.id
      ${whereClause}
      ORDER BY sp.created_at ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `, [...values, limit, offset]);

    return res.rows.map(row => {
      const slots_selected = [];
      if (row.morning_pickup_time) slots_selected.push('morning');
      if (row.wants_evening_return) slots_selected.push('evening');

      return {
        id: row.id,
        status: row.status,
        slots_selected,
        user: {
          id: row.user_id,
          full_name: row.passenger_name,
          phone: row.passenger_phone,
          profile_photo: row.passenger_photo
        },
        route: {
          pickup_city: row.pickup_address,
          drop_city: row.drop_address
        },
        plan: {
          name: row.plan_type
        }
      };
    });
  } catch (error) {
    logger.error(`getUnassignedSubscriptions error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const getDriverSchedule = async (driverProfileId) => {
  try {
    const subs = await query(`
      SELECT us.*, u.full_name, u.phone, r.route_name
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN routes r ON us.route_id = r.id
      WHERE us.driver_id = $1 AND us.status = 'active'
    `, [driverProfileId]);

    const driver = await query(`SELECT dp.*, u.full_name, u.phone FROM drivers dp JOIN users u ON dp.user_id = u.id WHERE dp.id = $1`, [driverProfileId]);

    return {
      driver: driver.rows[0],
      morning_passengers: subs.rows.filter(s => s.morning_slot),
      evening_passengers: subs.rows.filter(s => s.evening_slot),
      total_passengers: subs.rows.length
    };
  } catch (error) {
    logger.error(`getDriverSchedule error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

// ==========================================
// 4. SUBSCRIPTION & COMPLAINTS MANAGEMENT
// ==========================================

const getAllSubscriptions = async (filters) => {
  try {
    const { status, plan_type, city, driver_assigned, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let conditions = [];
    let values = [];
    let idx = 1;

    if (status) { conditions.push(`us.status = $${idx++}`); values.push(status); }
    if (plan_type) { conditions.push(`sp.plan_type = $${idx++}`); values.push(plan_type); }
    if (city) { conditions.push(`r.city = $${idx++}`); values.push(city); }
    
    if (driver_assigned === 'true') conditions.push(`us.driver_id IS NOT NULL`);
    if (driver_assigned === 'false') conditions.push(`us.driver_id IS NULL`);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`
      SELECT COUNT(*) FROM user_subscriptions us 
      JOIN subscription_plans sp ON us.plan_id = sp.id 
      JOIN routes r ON us.route_id = r.id ${where}
    `, values);
    
    const res = await query(`
      SELECT 
        us.*,
        sp.plan_name, sp.plan_type, sp.price,
        r.route_name, r.city, r.pickup_location, r.drop_location,
        r.morning_pickup_time, r.evening_pickup_time,
        u.full_name as passenger_name, u.email as passenger_email, u.phone as passenger_phone,
        d_user.full_name as driver_name, d_user.phone as driver_phone,
        dp.rating as driver_rating,
        v.brand, v.model, v.vehicle_number, v.color,
        p.amount as paid_amount, p.status as payment_status, p.invoice_number
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN routes r ON us.route_id = r.id
      JOIN users u ON us.user_id = u.id
      LEFT JOIN drivers dp ON us.driver_id = dp.id
      LEFT JOIN users d_user ON dp.user_id = d_user.id
      LEFT JOIN vehicles v ON us.vehicle_id = v.id
      LEFT JOIN payments p ON p.subscription_id = us.id AND p.status = 'success'
      ${where}
      ORDER BY us.created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
    `, [...values, limit, offset]);

    return { subscriptions: res.rows, total: parseInt(countRes.rows[0].count, 10), page: parseInt(page, 10), limit: parseInt(limit, 10) };
  } catch (error) {
    logger.error(`getAllSubscriptions error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const updateSubscriptionStatus = async (subscriptionId, status, reason) => {
  try {
    const sub = await query(`SELECT * FROM user_subscriptions WHERE id = $1`, [subscriptionId]);
    if (sub.rows.length === 0) throw new Error('SUBSCRIPTION_NOT_FOUND');
    const currentStatus = sub.rows[0].status;

    const validTransitions = {
      'pending': ['active', 'cancelled'],
      'active': ['paused', 'cancelled', 'expired'],
      'paused': ['active', 'cancelled'],
      'cancelled': [],
      'expired': []
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      throw new Error('INVALID_STATUS_TRANSITION');
    }

    const updated = await query(`UPDATE user_subscriptions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [status, subscriptionId]);

    const msgs = {
      paused: "Your subscription has been paused by admin. Contact support for details.",
      cancelled: `Your subscription has been cancelled. Reason: ${reason || 'Admin action'}`,
      active: "Your subscription has been reactivated!"
    };
    if (msgs[status]) createNotification(sub.rows[0].user_id, `Subscription ${status.toUpperCase()}`, msgs[status], 'subscription');

    return updated.rows[0];
  } catch (error) {
    if (['SUBSCRIPTION_NOT_FOUND', 'INVALID_STATUS_TRANSITION'].includes(error.message)) throw error;
    logger.error(`updateSubscriptionStatus error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const getAllComplaints = async (filters) => {
  try {
    const { status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let where = '';
    let values = [];
    if (status) { where = 'WHERE c.status = $1'; values.push(status); }

    const countRes = await query(`SELECT COUNT(*) FROM complaints c ${where}`, values);

    const res = await query(`
      SELECT c.*, u.full_name as complainant_name, u.email as complainant_email,
      d_user.full_name as driver_name
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN drivers dp ON c.driver_id = dp.id
      LEFT JOIN users d_user ON dp.user_id = d_user.id
      ${where}
      ORDER BY c.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `, [...values, limit, offset]);

    return { complaints: res.rows, total: parseInt(countRes.rows[0].count, 10), page: parseInt(page, 10), limit: parseInt(limit, 10) };
  } catch (error) {
    logger.error(`getAllComplaints error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const getComplaintById = async (complaintId) => {
  try {
    const res = await query(`
      SELECT c.*, u.full_name as complainant_name, u.phone as complainant_phone,
      d_user.full_name as driver_name, r.route_name
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN drivers dp ON c.driver_id = dp.id
      LEFT JOIN users d_user ON dp.user_id = d_user.id
      LEFT JOIN user_subscriptions us ON c.subscription_id = us.id
      LEFT JOIN routes r ON us.route_id = r.id
      WHERE c.id = $1
    `, [complaintId]);
    
    if (res.rows.length === 0) throw new Error('COMPLAINT_NOT_FOUND');
    return res.rows[0];
  } catch (error) {
    if (error.message === 'COMPLAINT_NOT_FOUND') throw error;
    logger.error(`getComplaintById error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const respondToComplaint = async (complaintId, adminResponse, status) => {
  try {
    const comp = await query(`SELECT * FROM complaints WHERE id = $1`, [complaintId]);
    if (comp.rows.length === 0) throw new Error('COMPLAINT_NOT_FOUND');
    if (comp.rows[0].status === 'closed') throw new Error('COMPLAINT_CLOSED');

    const updated = await query(`
      UPDATE complaints SET admin_response = $1, status = $2, updated_at = NOW() 
      WHERE id = $3 RETURNING *
    `, [adminResponse, status, complaintId]);

    const msgs = {
      resolved: `Your complaint has been resolved. Admin response: ${adminResponse}`,
      in_progress: `Your complaint is being investigated. We'll update you soon.`,
      closed: `Your complaint has been closed. Response: ${adminResponse}`
    };
    createNotification(comp.rows[0].user_id, 'Complaint Update', msgs[status], 'system');

    return updated.rows[0];
  } catch (error) {
    if (['COMPLAINT_NOT_FOUND', 'COMPLAINT_CLOSED'].includes(error.message)) throw error;
    logger.error(`respondToComplaint error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

// ==========================================
// 5. ANALYTICS & DASHBOARD
// ==========================================

const getDashboardStats = async () => {
  try {
    const queries = [
      query(`SELECT COUNT(*) FROM users WHERE role='user'`),
      query(`SELECT COUNT(*) FROM users WHERE role='user' AND is_active=true`),
      query(`SELECT COUNT(*) FROM users WHERE role='user' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`),
      query(`SELECT COUNT(*) FROM users WHERE role='user' AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', CURRENT_DATE)`),
      query(`SELECT COUNT(*) FROM users WHERE role='driver'`),
      query(`SELECT COUNT(*) FROM drivers WHERE is_verified=true`),
      query(`SELECT COUNT(*) FROM drivers WHERE is_available=true`),
      query(`SELECT COUNT(*) FROM drivers WHERE is_verified=false`),
      query(`SELECT COUNT(*) FROM subscription_plans`),
      query(`SELECT COUNT(*) FROM subscription_plans WHERE status='active'`),
      query(`SELECT COUNT(*) FROM subscription_requests WHERE status='pending_review'`),
      query(`SELECT COUNT(*) FROM subscription_plans WHERE status='active' AND driver_id IS NULL`),
      query(`SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status='success'`),
      query(`SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status='success' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`),
      query(`SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status='success' AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', CURRENT_DATE)`),
      query(`SELECT COUNT(*) FROM complaints WHERE status='open'`),
      Promise.resolve({ rows: [{ count: 0 }] }), // total_routes
      Promise.resolve({ rows: [{ count: 0 }] })  // active_routes
    ];

    const res = await Promise.all(queries);

    const results = {
      total_users: parseFloat(res[0].rows[0].count || 0),
      active_users: parseFloat(res[1].rows[0].count || 0),
      new_users_this_month: parseFloat(res[2].rows[0].count || 0),
      new_users_last_month: parseFloat(res[3].rows[0].count || 0),
      total_drivers: parseFloat(res[4].rows[0].count || 0),
      verified_drivers: parseFloat(res[5].rows[0].count || 0),
      available_drivers: parseFloat(res[6].rows[0].count || 0),
      unverified_pending: parseFloat(res[7].rows[0].count || 0),
      total_subscriptions: parseFloat(res[8].rows[0].count || 0),
      active_subscriptions: parseFloat(res[9].rows[0].count || 0),
      pending_subscriptions: parseFloat(res[10].rows[0].count || 0),
      unassigned_active: parseFloat(res[11].rows[0].count || 0),
      total_revenue: parseFloat(res[12].rows[0].coalesce || res[12].rows[0].sum || 0),
      this_month_revenue: parseFloat(res[13].rows[0].coalesce || res[13].rows[0].sum || 0),
      last_month_revenue: parseFloat(res[14].rows[0].coalesce || res[14].rows[0].sum || 0),
      open_complaints: parseFloat(res[15].rows[0].count || 0),
      total_routes: 0,
      active_routes: 0,
    };

    const last = results.new_users_last_month || 1; 
    results.user_growth_percent = ((results.new_users_this_month - results.new_users_last_month) / last) * 100;
    
    const lastRev = results.last_month_revenue || 1;
    results.revenue_growth_percent = ((results.this_month_revenue - results.last_month_revenue) / lastRev) * 100;

    return results;
  } catch (error) {
    logger.error(`getDashboardStats error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

const getRevenueAnalytics = async () => {
  try {
    const monthly_trend = await query(`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as name, SUM(amount) as revenue, COUNT(*) as transactions
      FROM payments WHERE status='success' GROUP BY DATE_TRUNC('month', created_at) ORDER BY DATE_TRUNC('month', created_at) ASC LIMIT 6
    `);
    const by_plan = await query(`
      SELECT sp.plan_type as name, SUM(p.amount) as value
      FROM payments p JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
      WHERE p.status='success' GROUP BY sp.plan_type
    `);
    const metrics = await query(`
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) as total_revenue,
        COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND created_at >= NOW() - INTERVAL '30 days'), 0) as mrr,
        COALESCE(AVG(amount) FILTER (WHERE status = 'success'), 0) as avg_order_value,
        CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'refunded')::NUMERIC / COUNT(*)) * 100, 1) ELSE 0 END as refund_rate
      FROM payments
    `);

    return {
      monthly_trend: monthly_trend.rows,
      by_plan_type: by_plan.rows,
      metrics: metrics.rows[0]
    };
  } catch (error) {
    logger.error(`getRevenueAnalytics error: ${error.message}`);
    return { partial_data: true, error: 'DB_ERROR' };
  }
};

const getSubscriptionAnalytics = async () => {
  try {
    const monthly_trend = await query(`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as name, 
             COUNT(*) FILTER (WHERE status = 'active') as active,
             COUNT(*) FILTER (WHERE status IN ('waiting_payment', 'waiting_driver_assignment')) as pending,
             COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM subscription_plans 
      GROUP BY DATE_TRUNC('month', created_at) 
      ORDER BY DATE_TRUNC('month', created_at) ASC LIMIT 6
    `);
    
    const stats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM subscription_plans
    `);
    
    return { monthly_trend: monthly_trend.rows, stats: stats.rows[0] };
  } catch (error) {
    logger.error(`getSubscriptionAnalytics error: ${error.message}`);
    return { partial_data: true, error: 'DB_ERROR' };
  }
};

const getDriverAnalytics = async () => {
  try {
    const top_drivers = await query(`
      SELECT 
        u.full_name,
        dp.id as driver_profile_id,
        dp.rating,
        dp.total_rides,
        COUNT(DISTINCT sp.id) FILTER (WHERE sp.status='active') as active_passengers,
        COUNT(t.id) as total_attendance_records,
        COUNT(t.id) FILTER (WHERE t.status='completed') as completed_rides,
        CASE 
          WHEN COUNT(t.id) > 0 
          THEN ROUND((COUNT(t.id) FILTER (WHERE t.status='completed')::NUMERIC / COUNT(t.id)) * 100, 1)
          ELSE 0 
        END as attendance_rate
      FROM drivers dp
      JOIN users u ON dp.user_id = u.id
      LEFT JOIN subscription_plans sp ON sp.driver_id = dp.id
      LEFT JOIN trips t ON t.driver_id = dp.id AND t.date >= NOW() - INTERVAL '30 days'
      WHERE dp.is_verified = true
      GROUP BY dp.id, u.full_name, dp.rating, dp.total_rides
      ORDER BY dp.total_rides DESC
      LIMIT 20
    `);
    
    const assigned = await query(`SELECT COUNT(DISTINCT driver_id) as count FROM subscription_plans WHERE status='active' AND driver_id IS NOT NULL`);
    const total_ver = await query(`SELECT COUNT(*) as count FROM drivers WHERE is_verified = true`);
    
    const unassigned_drivers = parseInt(total_ver.rows[0].count) - parseInt(assigned.rows[0].count);

    return { 
      top_drivers: top_drivers.rows, 
      utilization: { assigned: parseInt(assigned.rows[0].count), unassigned: unassigned_drivers } 
    };
  } catch (error) {
    logger.error(`getDriverAnalytics error: ${error.message}`);
    return { partial_data: true, error: 'DB_ERROR' };
  }
};

const getSystemHealth = async () => {
  try {
    const dbTest = await query(`SELECT 1 as healthy`);
    const db_status = dbTest.rows.length === 1 ? 'healthy' : 'error';
    
    const pending = await query(`SELECT COUNT(*) FROM payments WHERE status='pending' AND created_at < NOW() - INTERVAL '1 hour'`);
    const expiring = await query(`SELECT COUNT(*) FROM subscription_plans WHERE end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND status='active'`);

    return {
      db_status,
      pending_payments: parseInt(pending.rows[0].count),
      expiring_soon: parseInt(expiring.rows[0].count),
      server_uptime: process.uptime()
    };
  } catch (error) {
    logger.error(`getSystemHealth error: ${error.message}`);
    return { db_status: 'error', server_uptime: process.uptime() };
  }
};

// ==========================================
// DRIVER ROUTES MANAGEMENT
// ==========================================

const getAllDriverRoutes = async (filters = {}) => {
  try {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const countRes = await query(`SELECT COUNT(*) FROM driver_routes`);
    const total = parseInt(countRes.rows[0].count, 10);

    const res = await query(`
      SELECT dr.*, u.full_name, u.phone, u.email
      FROM driver_routes dr
      JOIN users u ON dr.driver_id = u.id
      ORDER BY dr.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return { routes: res.rows, total, page: parseInt(page, 10), limit: parseInt(limit, 10) };
  } catch (error) {
    logger.error(`getAllDriverRoutes error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

// ==========================================
// BROADCAST
// ==========================================

const broadcastNotification = async (title, message, target = 'all') => {
  try {
    let userCondition = '';
    if (target === 'drivers') {
      userCondition = `WHERE role = 'driver' AND is_active = true`;
    } else if (target === 'commuters') {
      userCondition = `WHERE role = 'vehicle_owner' AND is_active = true`;
    } else {
      userCondition = `WHERE is_active = true AND role != 'admin'`;
    }

    const usersResult = await query(`SELECT id FROM users ${userCondition}`);
    const userIds = usersResult.rows.map(u => u.id);

    if (userIds.length === 0) {
      return { sent_to: 0, target };
    }

    const { createBulkNotifications } = require('../../utils/notify');
    await createBulkNotifications(userIds, title, message, 'system');

    logger.info(`Broadcast sent to ${userIds.length} users (target: ${target})`);
    return { sent_to: userIds.length, target };
  } catch (error) {
    logger.error(`broadcastNotification error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

module.exports = {
  getAllUsers, getUserDetails, updateUserStatus, createAdmin, deleteUserPermanently,
  getAllDrivers, getUnverifiedDrivers, verifyDriver, rejectDriver,
  assignDriverToSubscription, bulkAssignDrivers, unassignDriver, getUnassignedSubscriptions, getDriverSchedule,
  getAllSubscriptions, updateSubscriptionStatus,
  getAllComplaints, getComplaintById, respondToComplaint,
  getDashboardStats, getRevenueAnalytics, getSubscriptionAnalytics, getDriverAnalytics, getSystemHealth,
  broadcastNotification, getAllDriverRoutes
};
// ========== END ==========

