// ========== FILE: src/modules/v2/replacement/replacement.v2.controller.js ==========
const { successResponse, errorResponse } = require('../../../utils/response');
const logger = require('../../../utils/logger');
const { replaceDriver } = require('../../../services/replacementEngine');
const { query } = require('../../../config/db');

// POST /api/v2/admin/replacement/trigger
const triggerReplacement = async (req, res) => {
  try {
    const { subscriptionId, reason } = req.body;

    if (!subscriptionId) {
      return errorResponse(res, 'subscriptionId is required', 400);
    }

    const result = await replaceDriver(subscriptionId, reason || 'Admin triggered replacement');
    return successResponse(res, result, result.success ? 'Driver replaced successfully' : 'Replacement pending');
  } catch (error) {
    if (error.message === 'SUBSCRIPTION_NOT_FOUND') {
      return errorResponse(res, 'Subscription not found', 404);
    }
    logger.error('triggerReplacement error:', error);
    return errorResponse(res, 'Failed to trigger replacement', 500);
  }
};

// POST /api/v2/driver/emergency/report
const reportEmergency = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { emergencyType } = req.body;

    // Update driver availability to unavailable
    await query(
      `INSERT INTO driver_availability (driver_id, status, last_updated)
       VALUES ($1, 'unavailable', NOW())
       ON CONFLICT (driver_id) DO UPDATE SET status = 'unavailable', last_updated = NOW()`,
      [driverId]
    );

    // Log status change
    await query(
      `INSERT INTO driver_status_history (driver_id, old_status, new_status, reason)
       VALUES ($1, 'online', 'unavailable', $2)`,
      [driverId, `Emergency: ${emergencyType || 'unspecified'}`]
    );

    // Find all active subscriptions for this driver
    const subsResult = await query(`
      SELECT sp.id AS subscription_id
      FROM subscription_plans sp
      JOIN drivers d ON sp.driver_id = d.id
      WHERE d.user_id = $1 AND sp.status = 'active'
    `, [driverId]);

    const results = [];
    for (const sub of subsResult.rows) {
      try {
        const result = await replaceDriver(
          sub.subscription_id,
          `Driver emergency: ${emergencyType || 'unspecified'}`
        );
        results.push({ subscription_id: sub.subscription_id, ...result });
      } catch (err) {
        results.push({
          subscription_id: sub.subscription_id,
          success: false,
          error: err.message,
        });
      }
    }

    return successResponse(res, {
      subscriptions_affected: subsResult.rows.length,
      replacement_results: results,
    }, 'Emergency reported. Replacement process initiated for all passengers.');
  } catch (error) {
    logger.error('reportEmergency error:', error);
    return errorResponse(res, 'Failed to process emergency report', 500);
  }
};

module.exports = { triggerReplacement, reportEmergency };
// ========== END ==========
