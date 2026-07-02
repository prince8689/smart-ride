// ========== FILE: src/modules/users/users.service.js ==========
const { query } = require('../../config/db');
const logger = require('../../utils/logger');
const { notifyAdmins } = require('../../utils/notify');

// ───────────── Get User Profile ─────────────
const getUserProfile = async (userId) => {
  try {
    const result = await query(
      `SELECT id, full_name, email, phone, role, profile_photo,
              is_active, is_email_verified, is_phone_verified, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    const user = result.rows[0];

    // If driver, also fetch driver_profile and vehicles
    if (user.role === 'driver') {
      const driverResult = await query(
        `SELECT dp.id AS driver_profile_id, dp.license_number, dp.license_expiry,
                dp.aadhar_number, dp.is_verified AS driver_verified,
                dp.is_available, dp.current_lat, dp.current_lng,
                dp.rating, dp.created_at AS driver_since
         FROM drivers dp
         WHERE dp.user_id = $1`,
        [userId]
      );

      if (driverResult.rows.length > 0) {
        user.driver_profile = driverResult.rows[0];

        const vehiclesResult = await query(
          `SELECT id, vehicle_number, vehicle_type, brand, model,
                  year, color, seating_capacity, is_active, created_at
           FROM vehicles WHERE driver_id = $1 ORDER BY created_at DESC`,
          [user.driver_profile.driver_profile_id]
        );

        user.vehicles = vehiclesResult.rows;
      }
    }

    return user;
  } catch (error) {
    if (error.message === 'NOT_FOUND') throw error;
    logger.error(`getUserProfile error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Update User Profile ─────────────
const updateUserProfile = async (userId, data) => {
  try {
    const { full_name, phone, profile_photo } = data;

    // Check phone uniqueness if being updated
    if (phone) {
      const phoneCheck = await query(
        'SELECT id FROM users WHERE phone = $1 AND id != $2',
        [phone, userId]
      );
      if (phoneCheck.rows.length > 0) {
        throw new Error('PHONE_EXISTS');
      }
    }

    // Build dynamic UPDATE query from provided fields only
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      fields.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }
    if (phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (profile_photo !== undefined) {
      fields.push(`profile_photo = $${paramIndex++}`);
      values.push(profile_photo);
    }

    if (fields.length === 0) {
      throw new Error('NO_FIELDS');
    }

    // Always update updated_at
    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, full_name, email, phone, role, profile_photo,
                 is_active, is_email_verified, is_phone_verified, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    return result.rows[0];
  } catch (error) {
    if (['PHONE_EXISTS', 'NOT_FOUND', 'NO_FIELDS'].includes(error.message)) throw error;
    logger.error(`updateUserProfile error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get User Subscriptions ─────────────
const getUserSubscriptions = async (userId) => {
  try {
    const result = await query(
      `SELECT
         us.id AS subscription_id,
         us.status, us.start_date, us.end_date,
         us.pickup_address, us.pickup_lat, us.pickup_lng,
         us.drop_address, us.drop_lat, us.drop_lng,
         us.morning_slot, us.evening_slot, us.amount_paid,
         us.created_at,
         sp.plan_name, sp.plan_type, sp.price AS plan_price, sp.duration_days,
         r.route_name, r.pickup_location AS route_pickup, r.drop_location AS route_drop,
         r.distance_km, r.estimated_duration_min,
         r.morning_pickup_time, r.evening_pickup_time,
         du.full_name AS driver_name, du.phone AS driver_phone,
         dp.rating AS driver_rating, dp.id AS driver_profile_id,
         v.brand AS vehicle_brand, v.model AS vehicle_model,
         v.vehicle_number, v.color AS vehicle_color, v.vehicle_type
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       JOIN routes r ON us.route_id = r.id
       LEFT JOIN drivers dp ON us.driver_id = dp.id
       LEFT JOIN users du ON dp.user_id = du.id
       LEFT JOIN vehicles v ON us.vehicle_id = v.id
       WHERE us.user_id = $1
       ORDER BY us.created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error(`getUserSubscriptions error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

const getActiveDriverLocation = async (userId) => {
  try {
    const result = await query(
      `SELECT d.current_lat, d.current_lng, d.is_available, u.full_name, u.phone, v.brand, v.model, v.vehicle_number 
       FROM subscription_plans sp
       JOIN drivers d ON sp.driver_id = d.id
       JOIN users u ON d.user_id = u.id
       LEFT JOIN vehicles v ON sp.vehicle_id = v.id
       WHERE sp.user_id = $1 AND sp.status = 'active'
       LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch (error) {
    logger.error(`getActiveDriverLocation error: ${error.message}`);
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get User Payments ─────────────
const getUserPayments = async (userId) => {
  try {
    const result = await query(
      `SELECT
         p.id AS payment_id, p.amount, p.currency, p.status AS payment_status,
         p.payment_method, p.invoice_number,
         p.razorpay_order_id, p.razorpay_payment_id,
         p.created_at AS payment_date,
         sp.plan_name, sp.plan_type,
         us.start_date, us.end_date, us.status AS subscription_status
       FROM payments p
       JOIN user_subscriptions us ON p.subscription_id = us.id
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error(`getUserPayments error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get User Notifications (Paginated) ─────────────
const getUserNotifications = async (userId, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get unread count
    const unreadResult = await query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    const unread_count = parseInt(unreadResult.rows[0].unread, 10);

    // Get paginated notifications
    const result = await query(
      `SELECT id, title, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      notifications: result.rows,
      total,
      unread_count,
    };
  } catch (error) {
    logger.error(`getUserNotifications error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Mark Notification Read ─────────────
const markNotificationRead = async (userId, notificationId) => {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    return { message: 'Marked as read' };
  } catch (error) {
    if (error.message === 'NOT_FOUND') throw error;
    logger.error(`markNotificationRead error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Mark All Notifications Read ─────────────
const markAllNotificationsRead = async (userId) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    return { message: 'All marked as read' };
  } catch (error) {
    logger.error(`markAllNotificationsRead error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Submit Complaint ─────────────
const submitComplaint = async (userId, data) => {
  try {
    const { subscription_id, driver_id, subject, description } = data;

    const result = await query(
      `INSERT INTO complaints (user_id, subscription_id, driver_id, subject, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, subscription_id, driver_id, subject, description, status, created_at`,
      [userId, subscription_id || null, driver_id || null, subject, description]
    );

    const complaint = result.rows[0];

    // Notify admins about the new complaint (fire-and-forget)
    notifyAdmins(
      'New Complaint Received',
      `Complaint #${complaint.id.substring(0, 8)}: "${subject}" — requires attention.`,
      'complaint'
    );

    return complaint;
  } catch (error) {
    logger.error(`submitComplaint error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Get User Complaints ─────────────
const getUserComplaints = async (userId, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;

    const countResult = await query('SELECT COUNT(*) AS total FROM complaints WHERE user_id = $1', [userId]);
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await query(
      `SELECT
         c.id, c.subject, c.description, c.status,
         c.admin_response, c.created_at, c.updated_at,
         c.subscription_id, c.driver_id,
         du.full_name AS driver_name
       FROM complaints c
       LEFT JOIN drivers dp ON c.driver_id = dp.id
       LEFT JOIN users du ON dp.user_id = du.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      complaints: result.rows,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
  } catch (error) {
    logger.error(`getUserComplaints error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

// ───────────── Delete (Deactivate) Account ─────────────
const deleteAccount = async (userId) => {
  try {
    const result = await query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    return { message: 'Account deactivated' };
  } catch (error) {
    if (error.message === 'NOT_FOUND') throw error;
    logger.error(`deleteAccount error: ${error.message}`, { stack: error.stack });
    throw new Error('DB_ERROR');
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserSubscriptions,
  getActiveDriverLocation,
  getUserPayments,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  submitComplaint,
  getUserComplaints,
  deleteAccount
};
// ========== END ==========
