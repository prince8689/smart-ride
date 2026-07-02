// ========== FILE: src/services/walletService.js ==========
const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Process a subscription payment: split between platform and driver wallets.
 *
 * @param {object} params
 * @param {string} params.subscriptionId
 * @param {string} params.userId
 * @param {string} params.driverId - drivers.id (NOT user_id)
 * @param {number} params.amount - total payment amount
 * @param {string} params.razorpayPaymentId
 */
const processSubscriptionPayment = async ({ subscriptionId, userId, driverId, amount, razorpayPaymentId }) => {
  try {
    const parsedAmount = parseFloat(amount);
    const commission = parseFloat((parsedAmount * 0.15).toFixed(2));
    const driverAmount = parseFloat((parsedAmount * 0.85).toFixed(2));

    // 1. Get driver's user_id from drivers table
    let driverUserId = driverId;
    if (driverId) {
      const driverResult = await query('SELECT user_id FROM drivers WHERE id = $1', [driverId]);
      if (driverResult.rows.length > 0) {
        driverUserId = driverResult.rows[0].user_id;
      }
    }

    // 2. Ensure driver_wallet exists
    if (driverUserId) {
      await query(
        `INSERT INTO driver_wallet (driver_id, balance, pending_amount, total_earned)
         VALUES ($1, 0, 0, 0)
         ON CONFLICT (driver_id) DO NOTHING`,
        [driverUserId]
      );
    }

    // 3. Update platform_wallet_v2
    await query(
      `UPDATE platform_wallet_v2
       SET total_revenue = total_revenue + $1,
           total_commission = total_commission + $2,
           pending_driver_payments = pending_driver_payments + $3,
           updated_at = NOW()`,
      [parsedAmount, commission, driverAmount]
    );

    // 4. Update driver_wallet: add to pending_amount and total_earned
    if (driverUserId) {
      await query(
        `UPDATE driver_wallet
         SET pending_amount = pending_amount + $1,
             total_earned = total_earned + $1,
             updated_at = NOW()
         WHERE driver_id = $2`,
        [driverAmount, driverUserId]
      );
    }

    // 5. Create wallet_transactions
    // 5a. User → Platform (full amount)
    await query(
      `INSERT INTO wallet_transactions (from_type, from_id, to_type, to_id, amount, transaction_type, description, subscription_id, reference_id, status)
       VALUES ('user', $1, 'platform', NULL, $2, 'subscription_payment', 'Subscription payment received', $3, $4, 'completed')`,
      [userId, parsedAmount, subscriptionId, razorpayPaymentId]
    );

    // 5b. Platform commission
    await query(
      `INSERT INTO wallet_transactions (from_type, from_id, to_type, to_id, amount, transaction_type, description, subscription_id, reference_id, status)
       VALUES ('platform', NULL, 'platform', NULL, $1, 'commission', 'Platform commission (15%)', $2, $3, 'completed')`,
      [commission, subscriptionId, razorpayPaymentId]
    );

    // 5c. Platform → Driver (pending)
    if (driverUserId) {
      await query(
        `INSERT INTO wallet_transactions (from_type, from_id, to_type, to_id, amount, transaction_type, description, subscription_id, reference_id, status)
         VALUES ('platform', NULL, 'driver', $1, $2, 'driver_earning', 'Driver share (85%) - pending settlement', $3, $4, 'pending')`,
        [driverUserId, driverAmount, subscriptionId, razorpayPaymentId]
      );
    }

    logger.info('processSubscriptionPayment completed', {
      subscriptionId,
      userId,
      driverUserId,
      amount: parsedAmount,
      commission,
      driverAmount,
    });

    return { success: true, commission, driverAmount };
  } catch (error) {
    logger.error('processSubscriptionPayment error:', error);
    throw error;
  }
};

/**
 * Settle a driver's pending amount: move pending → balance.
 * @param {string} driverUserId - users.id where role=driver
 */
const settleDriverWallet = async (driverUserId) => {
  try {
    // 1. Get current pending amount
    const walletResult = await query('SELECT * FROM driver_wallet WHERE driver_id = $1', [driverUserId]);
    if (walletResult.rows.length === 0) {
      throw new Error('WALLET_NOT_FOUND');
    }

    const wallet = walletResult.rows[0];
    const pendingAmount = parseFloat(wallet.pending_amount);

    if (pendingAmount <= 0) {
      return { success: true, message: 'No pending amount to settle', settled_amount: 0 };
    }

    // 2. Move pending → balance
    await query(
      `UPDATE driver_wallet
       SET balance = balance + pending_amount,
           pending_amount = 0,
           last_settlement_date = CURRENT_DATE,
           updated_at = NOW()
       WHERE driver_id = $1`,
      [driverUserId]
    );

    // 3. Reduce platform pending_driver_payments
    await query(
      `UPDATE platform_wallet_v2
       SET pending_driver_payments = GREATEST(0, pending_driver_payments - $1),
           updated_at = NOW()`,
      [pendingAmount]
    );

    // 4. Log transaction
    await query(
      `INSERT INTO wallet_transactions (from_type, from_id, to_type, to_id, amount, transaction_type, description, status)
       VALUES ('platform', NULL, 'driver', $1, $2, 'settlement', 'Weekly wallet settlement', 'completed')`,
      [driverUserId, pendingAmount]
    );

    // 5. Notify driver
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Wallet Settlement', $2, 'payment')`,
      [driverUserId, `₹${pendingAmount.toFixed(2)} has been settled to your wallet balance.`]
    );

    logger.info('settleDriverWallet completed', { driverUserId, amount: pendingAmount });

    return { success: true, settled_amount: pendingAmount };
  } catch (error) {
    logger.error('settleDriverWallet error:', error);
    throw error;
  }
};

/**
 * Get driver wallet balance and summary.
 */
const getDriverBalance = async (driverUserId) => {
  const result = await query('SELECT * FROM driver_wallet WHERE driver_id = $1', [driverUserId]);
  if (result.rows.length === 0) {
    return { balance: 0, pending_amount: 0, total_earned: 0, last_settlement_date: null };
  }
  return result.rows[0];
};

/**
 * Get driver's wallet transactions with pagination.
 */
const getDriverTransactions = async (driverUserId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT * FROM wallet_transactions
     WHERE (from_type = 'driver' AND from_id = $1) OR (to_type = 'driver' AND to_id = $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [driverUserId, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM wallet_transactions
     WHERE (from_type = 'driver' AND from_id = $1) OR (to_type = 'driver' AND to_id = $1)`,
    [driverUserId]
  );

  return {
    transactions: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
};

/**
 * Get platform wallet stats (admin).
 */
const getPlatformStats = async () => {
  const result = await query('SELECT * FROM platform_wallet_v2 LIMIT 1');
  if (result.rows.length === 0) {
    return { total_revenue: 0, total_commission: 0, pending_driver_payments: 0 };
  }
  return result.rows[0];
};

module.exports = {
  processSubscriptionPayment,
  settleDriverWallet,
  getDriverBalance,
  getDriverTransactions,
  getPlatformStats,
};
// ========== END ==========
