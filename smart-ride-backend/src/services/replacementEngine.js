// ========== FILE: src/services/replacementEngine.js ==========
const { query } = require('../config/db');
const logger = require('../utils/logger');
const { findBestDrivers, autoAssignDriver } = require('./driverMatchingEngine');

// Lazy-load socketHelper to avoid circular dependency at module load time
let socketHelper = null;
const getSocketHelper = () => {
  if (!socketHelper) {
    try {
      socketHelper = require('../helpers/socketHelper');
    } catch (e) {
      logger.warn('socketHelper not available');
    }
  }
  return socketHelper;
};

/**
 * Replace a driver for a subscription.
 *
 * Steps:
 * 1. Get current subscription + driver + user details
 * 2. Find replacement drivers (excluding current)
 * 3. If no replacement found → mark subscription pending, notify admin/user
 * 4. If found → auto-assign, update trip_schedules, adjust seat counts
 * 5. Log to assignment_logs
 * 6. Emit socket events
 * 7. Add to subscription_history
 *
 * @param {string} subscriptionId
 * @param {string} reason
 * @returns {object} result
 */
const replaceDriver = async (subscriptionId, reason = 'Driver replacement requested') => {
  try {
    // 1. Get subscription details
    const subResult = await query(`
      SELECT sp.*,
        u.full_name AS user_name, u.email AS user_email,
        d.user_id AS driver_user_id,
        du.full_name AS driver_name
      FROM subscription_plans sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN drivers d ON sp.driver_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
      WHERE sp.id = $1
    `, [subscriptionId]);

    if (subResult.rows.length === 0) {
      throw new Error('SUBSCRIPTION_NOT_FOUND');
    }
    const subscription = subResult.rows[0];
    const oldDriverUserId = subscription.driver_user_id;

    // 2. Find replacement drivers
    const candidates = await findBestDrivers({
      userPickupLat: parseFloat(subscription.pickup_lat),
      userPickupLng: parseFloat(subscription.pickup_lng),
      userDropLat: parseFloat(subscription.drop_lat),
      userDropLng: parseFloat(subscription.drop_lng),
      requiredDays: [1, 2, 3, 4, 5],
      requiredTime: subscription.morning_pickup_time
        ? subscription.morning_pickup_time.substring(0, 5)
        : '08:00',
      excludeDriverIds: oldDriverUserId ? [oldDriverUserId] : [],
    });

    const sh = getSocketHelper();

    // 3. No replacement found
    if (candidates.length === 0) {
      await query(
        "UPDATE subscription_plans SET status = 'waiting_driver_assignment', updated_at = NOW() WHERE id = $1",
        [subscriptionId]
      );

      // Notify admin
      if (sh) sh.emitToAdmin('admin:driver_replacement_failed', {
        subscription_id: subscriptionId,
        user_name: subscription.user_name,
        reason,
      });

      // Notify user
      if (sh) sh.emitToUser(subscription.user_id, 'subscription:driver_replacement_failed', {
        subscription_id: subscriptionId,
        message: 'We are finding a new driver for you. Our team has been notified.',
      });

      // Create notification
      await query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Driver Replacement Pending', $2, 'subscription')`,
        [subscription.user_id, `Your driver is being replaced. Reason: ${reason}. We're working on assigning a new one.`]
      );

      logger.warn('replaceDriver: no replacement found', { subscriptionId, reason });
      return { success: false, message: 'No replacement driver found. Admin notified.' };
    }

    // 4. Auto-assign best candidate
    const bestDriver = candidates[0];
    const assignResult = await autoAssignDriver(subscriptionId, bestDriver, 'auto_replacement');

    // 5. Update existing trip_schedules: mark future trips with old driver as 'driver_replaced'
    if (oldDriverUserId) {
      const today = new Date().toISOString().split('T')[0];
      await query(
        `UPDATE trip_schedules
         SET status = 'driver_replaced', updated_at = NOW()
         WHERE subscription_id = $1 AND driver_id = $2 AND scheduled_date >= $3 AND status = 'scheduled'`,
        [subscriptionId, oldDriverUserId, today]
      );

      // Increment old driver's available_seats
      await query(
        `UPDATE driver_routes SET available_seats = available_seats + 1, updated_at = NOW()
         WHERE driver_id = $1 AND status = 'active'`,
        [oldDriverUserId]
      );
    }

    // 6. Socket events
    if (sh) {
      // To user
      sh.emitToUser(subscription.user_id, 'subscription:driver_replaced', {
        subscription_id: subscriptionId,
        new_driver: {
          id: bestDriver.driver_id,
          name: bestDriver.driver_name,
          phone: bestDriver.driver_phone,
          photo: bestDriver.driver_photo,
        },
        reason,
      });

      // To new driver
      sh.emitToDriver(bestDriver.driver_id, 'driver:new_passenger_assigned', {
        subscription_id: subscriptionId,
        user_name: subscription.user_name,
        pickup_address: subscription.pickup_address,
        drop_address: subscription.drop_address,
      });

      // To old driver
      if (oldDriverUserId) {
        sh.emitToDriver(oldDriverUserId, 'driver:passenger_reassigned', {
          subscription_id: subscriptionId,
          user_name: subscription.user_name,
          reason,
        });
      }

      // To admin
      sh.emitToAdmin('admin:driver_replaced', {
        subscription_id: subscriptionId,
        user_name: subscription.user_name,
        old_driver: subscription.driver_name,
        new_driver: bestDriver.driver_name,
        reason,
        score: bestDriver.matching_score,
      });
    }

    // 7. Subscription history
    await query(
      `INSERT INTO subscription_history
        (subscription_id, user_id, action, old_driver_id, new_driver_id, note)
       VALUES ($1, $2, 'driver_changed', $3, $4, $5)`,
      [subscriptionId, subscription.user_id, oldDriverUserId, bestDriver.driver_id, reason]
    );

    // Notification to user
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Driver Replaced', $2, 'subscription')`,
      [subscription.user_id, `Your driver has been changed to ${bestDriver.driver_name}. Reason: ${reason}`]
    );

    logger.info('replaceDriver completed', {
      subscriptionId,
      oldDriver: oldDriverUserId,
      newDriver: bestDriver.driver_id,
      score: bestDriver.matching_score,
    });

    return {
      success: true,
      old_driver_id: oldDriverUserId,
      new_driver_id: bestDriver.driver_id,
      new_driver_name: bestDriver.driver_name,
      matching_score: bestDriver.matching_score,
    };
  } catch (error) {
    logger.error('replaceDriver error:', error);
    throw error;
  }
};

module.exports = {
  replaceDriver,
};
// ========== END ==========
