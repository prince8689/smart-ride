// ========== FILE: src/modules/v2/driverRoute/driverRoute.v2.routes.js ==========
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../../middleware/auth');
const controller = require('./driverRoute.v2.controller');

// POST /api/v2/driver/route/register — driver auth
router.post('/register', verifyToken, requireRole('driver'), controller.registerRoute);

// GET /api/v2/driver/route/my-routes — driver auth
router.get('/my-routes', verifyToken, requireRole('driver'), controller.getMyRoutes);

// GET /api/v2/driver/route/:id — any auth
router.get('/:id', verifyToken, controller.getRouteById);

// PUT /api/v2/driver/route/:id — driver auth (own route only)
router.put('/:id', verifyToken, requireRole('driver'), controller.updateRoute);

// PUT /api/v2/driver/route/:id/status — driver auth
router.put('/:id/status', verifyToken, requireRole('driver'), controller.updateRouteStatus);

module.exports = router;
// ========== END ==========
