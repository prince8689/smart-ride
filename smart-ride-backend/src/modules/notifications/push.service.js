const webPush = require('web-push');
const { query } = require('../../config/db');
const logger = require('../../utils/logger');
const env = require('../../config/env');

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    env.VAPID_SUBJECT || 'mailto:support@smartride.com',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
} else {
  logger.warn('VAPID keys not configured. Web Push will not work.');
}

/**
 * Send Web Push notification to all endpoints of a user
 */
const sendPushToUser = async (userId, payload) => {
  try {
    const result = await query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) return;

    const payloadString = JSON.stringify(payload);

    const promises = result.rows.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webPush.sendNotification(pushSubscription, payloadString);
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription has expired or is no longer valid, delete it
          await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
          logger.debug(`Deleted invalid push subscription ${sub.id}`);
        } else {
          logger.error(`Error sending push notification to user ${userId}:`, error);
        }
      }
    });

    await Promise.all(promises);
  } catch (error) {
    logger.error(`Failed to send push to user ${userId}: ${error.message}`);
  }
};

/**
 * Send Web Push to multiple users
 */
const sendPushToMultipleUsers = async (userIds, payload) => {
  if (!userIds || userIds.length === 0) return;
  const promises = userIds.map(id => sendPushToUser(id, payload));
  await Promise.all(promises);
};

module.exports = {
  sendPushToUser,
  sendPushToMultipleUsers,
};
