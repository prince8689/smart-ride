// ========== FILE: src/modules/drivers/drivers.routes.js ==========
const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const driversController = require('./drivers.controller');
const {
  createDriverProfileValidator,
  addVehicleValidator,
  updateLocationValidator,
  markAttendanceValidator,
} = require('./drivers.validators');

// All routes require authentication + driver role
router.use(verifyToken);
router.use(requireRole('driver'));

// ───────────── Profile ─────────────
// POST /api/drivers/profile — Create driver profile (onboarding)
router.post('/profile', validate(createDriverProfileValidator), driversController.createProfile);

// GET  /api/drivers/profile — Get full driver profile with vehicles
router.get('/profile', driversController.getProfile);

// PATCH /api/drivers/profile — Update availability
router.patch('/profile', driversController.updateProfile);

// ───────────── Vehicles ─────────────
// POST /api/drivers/vehicles — Add a vehicle
router.post('/vehicles', validate(addVehicleValidator), driversController.addVehicle);

// ───────────── Location ─────────────
// PATCH /api/drivers/location — Update live location
router.patch('/location', validate(updateLocationValidator), driversController.updateLocation);

// ───────────── Passengers ─────────────
// GET /api/drivers/passengers — Get assigned active subscriptions
router.get('/passengers', driversController.getAssignedPassengers);

// ───────────── Attendance ─────────────
// POST /api/drivers/attendance — Mark attendance
router.post('/attendance', validate(markAttendanceValidator), driversController.markAttendance);

// GET  /api/drivers/attendance — Get attendance with filters (?month=&year=)
router.get('/attendance', driversController.getAttendance);

// ───────────── Earnings ─────────────
// GET /api/drivers/earnings — Get earnings summary
router.get('/earnings', driversController.getEarnings);

// ───────────── Dashboard ─────────────
// GET /api/drivers/dashboard — Get dashboard stats
router.get('/dashboard', driversController.getDashboardStats);

module.exports = router;
// ========== END ==========
