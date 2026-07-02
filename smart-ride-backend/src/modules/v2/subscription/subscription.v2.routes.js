// ========== FILE: src/modules/v2/subscription/subscription.v2.routes.js ==========
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../../middleware/auth');
const controller = require('./subscription.v2.controller');

// POST /api/v2/subscription/find-drivers — authenticated user
router.post('/find-drivers', verifyToken, controller.findDrivers);

// POST /api/v2/subscription/confirm-driver — authenticated user
router.post('/confirm-driver', verifyToken, controller.confirmDriver);

module.exports = router;
// ========== END ==========
