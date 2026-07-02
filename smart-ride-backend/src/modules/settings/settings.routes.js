const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');

// Public route to fetch settings
router.get('/', settingsController.getSettings);

// Admin route to update settings
router.patch('/', verifyToken, requireRole('admin'), settingsController.updateSettings);

module.exports = router;
