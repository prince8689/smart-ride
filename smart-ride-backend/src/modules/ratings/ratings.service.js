const { query } = require('../../config/db');
const logger = require('../../utils/logger');
const notifyService = require('../../utils/notify');

/**
 * Submit a driver rating
 */
exports.submitRating = async (userId, data) => {
  const { subscription_id, rating, review } = data;

  // Step 1: Verify subscription belongs to user & status is valid
  const subResult = await query(
    `SELECT * FROM subscription_plans 
     WHERE id = $1 AND user_id = $2 AND status IN ('active', 'expired')`,
    [subscription_id, userId]
  );

  if (subResult.rows.length === 0) {
    throw new Error('Subscription not found, does not belong to you, or is not in a valid state to be rated.');
  }

  const subscription = subResult.rows[0];

  // Step 2: Verify driver is assigned
  if (!subscription.driver_id) {
    throw new Error('No driver assigned to this subscription.');
  }

  const driverProfileId = subscription.driver_id;

  // Step 3 & 4: Insert (idempotent, using ON CONFLICT DO NOTHING)
  // If exists, just return existing. We used UNIQUE(subscription_id, user_id)
  const existingRating = await query(
    'SELECT * FROM reviews WHERE subscription_plan_id = $1 AND user_id = $2',
    [subscription_id, userId]
  );

  if (existingRating.rows.length > 0) {
    return existingRating.rows[0]; // Already rated, return existing (Idempotent error handling)
  }

  const insertResult = await query(
    `INSERT INTO reviews (subscription_id, user_id, driver_id, rating, review)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [subscription_id, userId, driverProfileId, rating, review]
  );
  
  const newRating = insertResult.rows[0];

  // Step 5: Recalculate Average
  const avgResult = await query(
    `SELECT AVG(rating)::NUMERIC(3,2) as avg_rating FROM reviews WHERE driver_id = $1`,
    [driverProfileId]
  );
  
  const newAvg = avgResult.rows[0].avg_rating || 0;

  // Step 6: Update driver_profile
  await query(
    `UPDATE drivers SET rating = $1 WHERE id = $2`,
    [newAvg, driverProfileId]
  );

  // Get driver's user_id to notify
  const driverUserResult = await query(
    `SELECT user_id FROM drivers WHERE id = $1`,
    [driverProfileId]
  );

  // Step 7: Create notification
  if (driverUserResult.rows.length > 0) {
    const driverUserId = driverUserResult.rows[0].user_id;
    await notifyService.createNotification(
      driverUserId,
      'New Rating Received',
      `You received a ${rating}★ rating from a passenger. Keep up the good work!`,
      'system'
    );
  }

  return newRating;
};

/**
 * Get driver ratings paginated with average and distribution
 */
exports.getDriverRatings = async (driverProfileId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  // Get Average and Distribution
  const statsResult = await query(
    `SELECT 
       AVG(rating)::NUMERIC(3,2) as average,
       COUNT(*) as total_count,
       COUNT(*) FILTER (WHERE rating = 5) as r5,
       COUNT(*) FILTER (WHERE rating = 4) as r4,
       COUNT(*) FILTER (WHERE rating = 3) as r3,
       COUNT(*) FILTER (WHERE rating = 2) as r2,
       COUNT(*) FILTER (WHERE rating = 1) as r1
     FROM reviews 
     WHERE driver_id = $1`,
    [driverProfileId]
  );

  const stats = statsResult.rows[0];

  // Get Paginated Ratings with masked names
  const ratingsResult = await query(
    `SELECT dr.*, 
            CONCAT(SUBSTRING(u.full_name, 1, 4), '***') as masked_name,
            u.profile_photo
     FROM reviews dr
     JOIN users u ON dr.user_id = u.id
     WHERE dr.driver_id = $1
     ORDER BY dr.created_at DESC
     LIMIT $2 OFFSET $3`,
    [driverProfileId, limit, offset]
  );

  return {
    ratings: ratingsResult.rows,
    average: parseFloat(stats.average || 0),
    total_count: parseInt(stats.total_count || 0),
    distribution: {
      5: parseInt(stats.r5 || 0),
      4: parseInt(stats.r4 || 0),
      3: parseInt(stats.r3 || 0),
      2: parseInt(stats.r2 || 0),
      1: parseInt(stats.r1 || 0)
    }
  };
};

/**
 * Get ratings submitted by a user
 */
exports.getUserRatings = async (userId) => {
  const result = await query(
    `SELECT dr.*, u.full_name as driver_name, u.profile_photo as driver_photo
     FROM reviews dr
     JOIN drivers dp ON dr.driver_id = dp.id
     JOIN users u ON dp.user_id = u.id
     WHERE dr.user_id = $1
     ORDER BY dr.created_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Check if user can rate a subscription
 */
exports.checkCanRate = async (userId, subscriptionId) => {
  const subResult = await query(
    `SELECT status, driver_id FROM subscription_plans WHERE id = $1 AND user_id = $2`,
    [subscriptionId, userId]
  );

  if (subResult.rows.length === 0) {
    return { canRate: false, reason: 'Subscription not found' };
  }

  const sub = subResult.rows[0];
  if (sub.status !== 'active' && sub.status !== 'expired') {
    return { canRate: false, reason: 'Can only rate active or expired subscriptions' };
  }

  if (!sub.driver_id) {
    return { canRate: false, reason: 'No driver assigned to this subscription' };
  }

  const ratingResult = await query(
    `SELECT id FROM reviews WHERE subscription_plan_id = $1 AND user_id = $2`,
    [subscriptionId, userId]
  );

  if (ratingResult.rows.length > 0) {
    return { canRate: false, reason: 'Already rated' };
  }

  return { canRate: true, reason: '' };
};
