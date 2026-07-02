// ========== FILE: src/workers/subscriptionMonitorWorker.js ==========
const logger = require('../utils/logger');
const { query } = require('../config/db');

/**
 * Subscription Monitor Worker
 * Runs daily at midnight.
 *
 * - Subscriptions expiring in 7 days → send renewal reminder
 * - Expired subscriptions → deactivate
 * - Active subscriptions with no driver_id → trigger matching
 */
const processSubscriptionMonitor = async (/* replacementQueue unused here */) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

    logger.info('subscriptionMonitorWorker: Starting', { date: todayStr });

    // 1. Renewal reminders — subscriptions expiring in 7 days
    const reminderResult = await query(`
      SELECT id, user_id FROM subscription_plans
      WHERE end_date = $1 AND status = 'active'
    `, [sevenDaysStr]);

    for (const sub of reminderResult.rows) {
      // Avoid duplicate notifications within 24 hours
      const recent = await query(`
        SELECT id FROM notifications
        WHERE user_id = $1 AND title = 'Subscription Expiring Soon' AND created_at >= NOW() - INTERVAL '24 hours'
      `, [sub.user_id]);

      if (recent.rows.length === 0) {
        await query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, 'Subscription Expiring Soon', 'Your subscription expires in 7 days. Renew now to continue your rides!', 'subscription')`,
          [sub.user_id]
        );

        // Log to subscription_history
        await query(
          `INSERT INTO subscription_history (subscription_id, user_id, action, note)
           VALUES ($1, $2, 'renewed', 'Renewal reminder sent - 7 days before expiry')`,
          [sub.id, sub.user_id]
        );
      }
    }

    // 2. Expire subscriptions past end_date
    const expiredResult = await query(`
      UPDATE subscription_plans
      SET status = 'expired', updated_at = NOW()
      WHERE end_date < $1 AND status = 'active'
      RETURNING id, user_id
    `, [todayStr]);

    for (const sub of expiredResult.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Subscription Expired', 'Your subscription has expired. Please renew to continue.', 'subscription')`,
        [sub.user_id]
      );

      await query(
        `INSERT INTO subscription_history (subscription_id, user_id, action, note)
         VALUES ($1, $2, 'cancelled', 'Auto-expired by system')`,
        [sub.id, sub.user_id]
      );
    }

    // 3. Active subscriptions with no driver — try matching
    const unmatchedResult = await query(`
      SELECT id, user_id, pickup_lat, pickup_lng, drop_lat, drop_lng, morning_pickup_time
      FROM subscription_plans
      WHERE status = 'active' AND driver_id IS NULL
    `);

    let matchedCount = 0;
    if (unmatchedResult.rows.length > 0) {
      try {
        const { findBestDrivers, autoAssignDriver } = require('../services/driverMatchingEngine');

        for (const sub of unmatchedResult.rows) {
          const candidates = await findBestDrivers({
            userPickupLat: parseFloat(sub.pickup_lat),
            userPickupLng: parseFloat(sub.pickup_lng),
            userDropLat: parseFloat(sub.drop_lat),
            userDropLng: parseFloat(sub.drop_lng),
            requiredTime: sub.morning_pickup_time
              ? sub.morning_pickup_time.substring(0, 5)
              : '08:00',
          });

          if (candidates.length > 0) {
            await autoAssignDriver(sub.id, candidates[0], 'auto_initial');
            matchedCount++;
          }
        }
      } catch (e) {
        logger.error('subscriptionMonitorWorker: matching error', e);
      }
    }

    logger.info('subscriptionMonitorWorker: Completed', {
      reminders: reminderResult.rows.length,
      expired: expiredResult.rows.length,
      unmatched: unmatchedResult.rows.length,
      matched: matchedCount,
    });

    return {
      reminders: reminderResult.rows.length,
      expired: expiredResult.rows.length,
      matched: matchedCount,
    };
  } catch (error) {
    logger.error('subscriptionMonitorWorker error:', error);
    throw error;
  }
};

module.exports = { processSubscriptionMonitor };
// ========== END ==========
