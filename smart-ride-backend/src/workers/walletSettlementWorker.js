// ========== FILE: src/workers/walletSettlementWorker.js ==========
const logger = require('../utils/logger');
const { query } = require('../config/db');
const walletService = require('../services/walletService');

/**
 * Wallet Settlement Worker
 * Runs every Monday at 9 AM.
 *
 * For all drivers with pending_amount > 0 in driver_wallet:
 * - Moves pending_amount to balance
 * - Sets last_settlement_date = today
 * - Logs to wallet_transactions
 * - Notifies driver
 */
const processWalletSettlement = async () => {
  try {
    logger.info('walletSettlementWorker: Starting settlement');

    // Find all drivers with pending amounts
    const pendingResult = await query(
      'SELECT driver_id, pending_amount FROM driver_wallet WHERE pending_amount > 0'
    );

    let settledCount = 0;
    let totalSettled = 0;

    for (const wallet of pendingResult.rows) {
      try {
        const result = await walletService.settleDriverWallet(wallet.driver_id);
        if (result.success && result.settled_amount > 0) {
          settledCount++;
          totalSettled += result.settled_amount;
        }
      } catch (err) {
        logger.error('walletSettlementWorker: Settlement failed for driver', {
          driverId: wallet.driver_id,
          error: err.message,
        });
      }
    }

    // Notify admins
    if (settledCount > 0) {
      const admins = await query("SELECT id FROM users WHERE role = 'admin'");
      for (const admin of admins.rows) {
        await query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, 'Weekly Settlement Completed', $2, 'system')`,
          [admin.id, `Weekly settlement completed. ${settledCount} drivers settled, total ₹${totalSettled.toFixed(2)}.`]
        );
      }
    }

    logger.info('walletSettlementWorker: Completed', {
      driversSettled: settledCount,
      totalAmount: totalSettled,
    });

    return { settledCount, totalSettled };
  } catch (error) {
    logger.error('walletSettlementWorker error:', error);
    throw error;
  }
};

module.exports = { processWalletSettlement };
// ========== END ==========
