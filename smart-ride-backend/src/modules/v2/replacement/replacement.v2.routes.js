// ========== FILE: src/modules/v2/replacement/replacement.v2.routes.js ==========
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../../middleware/auth');
const controller = require('./replacement.v2.controller');

// POST /api/v2/admin/replacement/trigger — admin auth
router.post('/trigger', verifyToken, requireRole('admin'), controller.triggerReplacement);

module.exports = router;
// ========== END ==========
