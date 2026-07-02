// ========== FILE: src/modules/notifications/notifications.routes.js ==========
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { query } = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

// All routes require auth
router.use(verifyToken);

// GET /api/notifications — List user's notifications (paginated)
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    const values = [userId];
    let paramIdx = 2;

    if (type) {
      whereClause += ` AND type = $${paramIdx++}`;
      values.push(type);
    }

    const countResult = await query(`SELECT COUNT(*) FROM notifications ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(
      `SELECT id, title, message, type, is_read, created_at 
       FROM notifications ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      [...values, parseInt(limit), parseInt(offset)]
    );

    return successResponse(res, {
      notifications: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      unread_count: total - result.rows.filter(n => n.is_read).length
    }, 'Notifications fetched');
  } catch (error) {
    logger.error(`GET /notifications error: ${error.message}`);
    next(error);
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    return successResponse(res, { count: parseInt(result.rows[0].count, 10) }, 'Unread count fetched');
  } catch (error) {
    logger.error(`GET /notifications/unread-count error: ${error.message}`);
    next(error);
  }
});

// PUT /api/notifications/read-all — Mark all as read
router.put('/read-all', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING id`,
      [req.user.id]
    );
    return successResponse(res, { updated: result.rowCount }, `${result.rowCount} notifications marked as read`);
  } catch (error) {
    logger.error(`PUT /notifications/read-all error: ${error.message}`);
    next(error);
  }
});

// PUT /api/notifications/:id/read — Mark single as read
router.put('/:id/read', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return errorResponse(res, 'Notification not found', 404);
    }
    return successResponse(res, null, 'Notification marked as read');
  } catch (error) {
    logger.error(`PUT /notifications/:id/read error: ${error.message}`);
    next(error);
  }
});

// DELETE /api/notifications/:id — Delete notification
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return errorResponse(res, 'Notification not found', 404);
    }
    return successResponse(res, null, 'Notification deleted');
  } catch (error) {
    logger.error(`DELETE /notifications/:id error: ${error.message}`);
    next(error);
  }
});

module.exports = router;
// ========== END ==========
