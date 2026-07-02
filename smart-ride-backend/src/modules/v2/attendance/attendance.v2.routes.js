// ========== FILE: src/modules/v2/attendance/attendance.v2.routes.js ==========
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../../middleware/auth');
const controller = require('./attendance.v2.controller');

// POST /api/v2/driver/attendance/mark — driver auth
router.post('/mark', verifyToken, requireRole('driver'), controller.markAttendance);

// GET /api/v2/driver/attendance/today — driver auth
router.get('/today', verifyToken, requireRole('driver'), controller.getToday);

// GET /api/v2/driver/attendance/history?month=YYYY-MM — driver auth
router.get('/history', verifyToken, requireRole('driver'), controller.getHistory);

module.exports = router;
// ========== END ==========
