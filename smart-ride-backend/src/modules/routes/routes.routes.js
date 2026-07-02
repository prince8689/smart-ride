// ========== FILE: src/modules/routes/routes.routes.js ==========
const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const routesController = require('./routes.controller');
const {
  createRouteValidator,
  updateRouteValidator,
  searchRoutesValidator,
} = require('./routes.validators');

// Optional auth middleware for public endpoints to identify admins
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return verifyToken(req, res, next);
  }
  next();
};

// ───────────── Public Routes (No strictly enforced auth) ─────────────

// GET /api/routes
router.get('/', optionalAuth, validate(searchRoutesValidator), routesController.getAllRoutes);

// GET /api/routes/cities
router.get('/cities', routesController.getCities);

// GET /api/routes/city/:city
router.get('/city/:city', routesController.getRoutesByCity);

// GET /api/routes/:id
router.get('/:id', routesController.getRouteById);


// ───────────── Admin Only Routes ─────────────

// POST /api/routes
router.post(
  '/',
  verifyToken,
  requireRole('admin'),
  validate(createRouteValidator),
  routesController.createRoute
);

// PATCH /api/routes/:id
router.patch(
  '/:id',
  verifyToken,
  requireRole('admin'),
  validate(updateRouteValidator),
  routesController.updateRoute
);

// DELETE /api/routes/:id
router.delete(
  '/:id',
  verifyToken,
  requireRole('admin'),
  routesController.deleteRoute
);

module.exports = router;
// ========== END ==========
