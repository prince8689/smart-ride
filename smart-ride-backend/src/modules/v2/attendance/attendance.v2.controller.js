// ========== FILE: src/modules/v2/attendance/attendance.v2.controller.js ==========
const { successResponse, errorResponse } = require('../../../utils/response');
const logger = require('../../../utils/logger');
const attendanceService = require('../../../services/attendanceService');

// POST /api/v2/driver/attendance/mark
const markAttendance = async (req, res) => {
  try {
    const { status, driverRouteId } = req.body;

    if (!status || !['ready', 'unavailable'].includes(status)) {
      return errorResponse(res, 'Status must be "ready" or "unavailable"', 400);
    }

    const result = await attendanceService.markAttendance(req.user.id, driverRouteId, status);
    return successResponse(res, result, `Attendance marked as ${status}`, 201);
  } catch (error) {
    if (error.message === 'ALREADY_MARKED') {
      return errorResponse(res, 'Attendance already marked for today', 409);
    }
    logger.error('markAttendance error:', error);
    return errorResponse(res, 'Failed to mark attendance', 500);
  }
};

// GET /api/v2/driver/attendance/today
const getToday = async (req, res) => {
  try {
    const result = await attendanceService.getTodayAttendance(req.user.id);
    return successResponse(res, result, 'Today attendance fetched');
  } catch (error) {
    logger.error('getToday error:', error);
    return errorResponse(res, 'Failed to fetch attendance', 500);
  }
};

// GET /api/v2/driver/attendance/history?month=YYYY-MM
const getHistory = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse(res, 'month parameter required in YYYY-MM format', 400);
    }

    const result = await attendanceService.getAttendanceHistory(req.user.id, month);
    return successResponse(res, result, 'Attendance history fetched');
  } catch (error) {
    logger.error('getHistory error:', error);
    return errorResponse(res, 'Failed to fetch attendance history', 500);
  }
};

// GET /api/v2/admin/attendance/summary?date=YYYY-MM-DD
const getAdminSummary = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'date parameter required in YYYY-MM-DD format', 400);
    }

    const result = await attendanceService.getAdminAttendanceSummary(date);
    return successResponse(res, result, 'Attendance summary fetched');
  } catch (error) {
    logger.error('getAdminSummary error:', error);
    return errorResponse(res, 'Failed to fetch attendance summary', 500);
  }
};

module.exports = { markAttendance, getToday, getHistory, getAdminSummary };
// ========== END ==========
