const { query } = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response');
const logger = require('../../utils/logger');
const env = require('../../config/env');

/**
 * Save a push subscription
 */
exports.subscribe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object' });
    }

    // Insert or do nothing if exact same subscription exists
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO NOTHING`,
      [userId, endpoint, keys.p256dh, keys.auth]
    );

    logger.debug(`User ${userId} subscribed to web push`);
    return successResponse(res, null, 'Subscribed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a push subscription
 */
exports.unsubscribe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Endpoint is required' });
    }

    await query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, endpoint]
    );

    logger.debug(`User ${userId} unsubscribed from web push`);
    return successResponse(res, null, 'Unsubscribed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get VAPID Public Key
 */
exports.getVapidPublicKey = (req, res) => {
  if (!env.VAPID_PUBLIC_KEY) {
    return errorResponse(res, 'VAPID keys not configured on server', 500);
  }
  return successResponse(res, { publicKey: env.VAPID_PUBLIC_KEY });
};
