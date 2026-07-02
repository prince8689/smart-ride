// ========== FILE: src/modules/v2/wallet/wallet.v2.controller.js ==========
const { successResponse, errorResponse, paginatedResponse } = require('../../../utils/response');
const logger = require('../../../utils/logger');
const walletService = require('../../../services/walletService');

// GET /api/v2/wallet/driver/balance
const getDriverBalance = async (req, res) => {
  try {
    const result = await walletService.getDriverBalance(req.user.id);
    return successResponse(res, result, 'Driver balance fetched');
  } catch (error) {
    logger.error('getDriverBalance error:', error);
    return errorResponse(res, 'Failed to fetch balance', 500);
  }
};

// GET /api/v2/wallet/driver/transactions
const getDriverTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await walletService.getDriverTransactions(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );
    return paginatedResponse(
      res,
      result.transactions,
      result.total,
      result.page,
      result.limit,
      'Transactions fetched'
    );
  } catch (error) {
    logger.error('getDriverTransactions error:', error);
    return errorResponse(res, 'Failed to fetch transactions', 500);
  }
};

// GET /api/v2/wallet/platform/stats
const getPlatformStats = async (req, res) => {
  try {
    const result = await walletService.getPlatformStats();
    return successResponse(res, result, 'Platform wallet stats fetched');
  } catch (error) {
    logger.error('getPlatformStats error:', error);
    return errorResponse(res, 'Failed to fetch platform stats', 500);
  }
};

// POST /api/v2/wallet/admin/settle/:driverId
const settleDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const result = await walletService.settleDriverWallet(driverId);
    return successResponse(res, result, result.message || 'Settlement completed');
  } catch (error) {
    if (error.message === 'WALLET_NOT_FOUND') {
      return errorResponse(res, 'Driver wallet not found', 404);
    }
    logger.error('settleDriver error:', error);
    return errorResponse(res, 'Failed to settle driver wallet', 500);
  }
};

module.exports = { getDriverBalance, getDriverTransactions, getPlatformStats, settleDriver };
// ========== END ==========
