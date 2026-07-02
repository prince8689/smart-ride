const { query } = require('../config/db');
const logger = require('../utils/logger');
const { createNotification } = require('../utils/notify');
const { smartMatchDriver } = require('../utils/smartMatch');
const { assignDriverToSubscription } = require('../modules/admin/admin.service');

/**
 * Reassignment Worker
 * Handles automatically reassigning a driver to a subscription plan
 * when the originally assigned driver fails (goes offline, misses attendance, etc.)
 */
const processReassignment = async (job) => {
  const { subscriptionId, oldDriverId, reason } = job.data;
  logger.info(`reassignmentWorker: Triggered for subscription ${subscriptionId}`, { oldDriverId, reason });

  let client;
  try {
    client = await require('../config/db').getClient();
    await client.query('BEGIN');

    // 1. Get current plan details
    const planRes = await client.query('SELECT * FROM subscription_plans WHERE id = $1', [subscriptionId]);
    if (planRes.rows.length === 0) throw new Error('Subscription not found');
    const plan = planRes.rows[0];

    // 2. Release seat of the old driver (if we know the route)
    // We need the active route of the old driver
    if (oldDriverId) {
      const oldDriverRes = await client.query('SELECT user_id FROM drivers WHERE id = $1', [oldDriverId]);
      if (oldDriverRes.rows.length > 0) {
        const oldUserId = oldDriverRes.rows[0].user_id;
        const oldRouteRes = await client.query(`SELECT id FROM driver_routes WHERE driver_id = $1 AND status = 'active'`, [oldUserId]);
        if (oldRouteRes.rows.length > 0) {
           await client.query(`UPDATE driver_routes SET available_seats = available_seats + $1 WHERE id = $2`, [plan.number_of_passengers || 1, oldRouteRes.rows[0].id]);
        }
      }
    }

    // 3. Mark the subscription temporarily unassigned
    await client.query(`UPDATE subscription_plans SET driver_id = NULL, vehicle_id = NULL WHERE id = $1`, [subscriptionId]);

    await client.query('COMMIT');
    client.release();

    // 4. Re-run smart match (it will automatically exclude the old driver if they are offline or missed attendance)
    const matchResult = await smartMatchDriver(subscriptionId);

    // Log the event to assignment logs
    await query(`
      INSERT INTO assignment_logs (subscription_id, old_driver_id, new_driver_id, event_type, reason, ranked_list, created_at)
      VALUES ($1, $2, $3, 'reassign', $4, $5, NOW())
    `, [
      subscriptionId, 
      oldDriverId || null, 
      matchResult.best_match ? matchResult.best_match.driver_profile_id : null, 
      reason, 
      JSON.stringify(matchResult.recommended_drivers || [])
    ]);

    if (matchResult.best_match) {
      const best = matchResult.best_match;
      // assignDriverToSubscription handles decrementing seats and notifying the user and new driver
      await assignDriverToSubscription(
        subscriptionId, 
        best.driver_profile_id, 
        best.vehicle?.id || null,
        best.estimated_pickup_time,
        best.driver_route_id
      );

      // Notify the old driver
      if (oldDriverId) {
        const oldUser = await query('SELECT user_id FROM drivers WHERE id = $1', [oldDriverId]);
        if (oldUser.rows.length > 0) {
          createNotification(oldUser.rows[0].user_id, 'Assignment Removed', `You have been unassigned from a subscription due to: ${reason}`, 'driver_updates');
        }
      }

      logger.info(`reassignmentWorker: Successfully reassigned subscription ${subscriptionId} to driver ${best.driver_profile_id}`);
    } else {
      // No match found
      await query(`UPDATE subscription_plans SET status = 'pending_no_driver', updated_at = NOW() WHERE id = $1`, [subscriptionId]);
      await query(`UPDATE subscription_requests SET status = 'pending_no_driver', updated_at = NOW() WHERE id = (SELECT request_id FROM subscription_plans WHERE id = $1)`, [subscriptionId]);
      
      // Notify user
      createNotification(plan.user_id, 'Action Required: Driver Unavailable', `We couldn't automatically find a replacement driver for your subscription due to a recent cancellation. Our admin team has been notified.`, 'subscription');
      
      // Notify admin
      const adminRes = await query(`SELECT id FROM users WHERE role = 'admin'`);
      for (const admin of adminRes.rows) {
        createNotification(admin.id, 'Action Required: Unassigned Subscription', `Subscription ${subscriptionId} lost its driver and no automated replacements were found. Reason: ${reason}`, 'admin_alert');
      }
      logger.warn(`reassignmentWorker: No replacement found for subscription ${subscriptionId}`);
    }
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); client.release(); } catch (e) {}
    }
    logger.error('reassignmentWorker error:', error);
    throw error;
  }
};

module.exports = { processReassignment };
