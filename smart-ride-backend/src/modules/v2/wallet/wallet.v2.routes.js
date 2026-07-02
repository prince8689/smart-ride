// ========== FILE: src/modules/v2/wallet/wallet.v2.routes.js ==========
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../../middleware/auth');
const controller = require('./wallet.v2.controller');

// GET /api/v2/wallet/driver/balance — driver auth
router.get('/driver/balance', verifyToken, requireRole('driver'), controller.getDriverBalance);

// GET /api/v2/wallet/driver/transactions — driver auth
router.get('/driver/transactions', verifyToken, requireRole('driver'), controller.getDriverTransactions);

// GET /api/v2/wallet/platform/stats — admin auth
router.get('/platform/stats', verifyToken, requireRole('admin'), controller.getPlatformStats);

// POST /api/v2/wallet/admin/settle/:driverId — admin auth
router.post('/admin/settle/:driverId', verifyToken, requireRole('admin'), controller.settleDriver);

module.exports = router;
// ========== END ==========
