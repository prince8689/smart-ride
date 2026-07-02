const { query } = require('../config/db');
const logger = require('./logger');

const getIo = () => {
  try {
    // If socket.init.js sets it up or we require app
    const app = require('../app');
    return app.get('io');
  } catch (e) {
    // Also try checking socket/index.js if app fails
    try {
      const { getIO } = require('../socket/index');
      return getIO();
    } catch(err) {
      return null;
    }
  }
};

async function createNotification(userId, title, message, type = 'general', data = null) {
  try {
    const result = await query(`
      INSERT INTO notifications (user_id, title, message, type, data)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [userId, title, message, type, data]);

    const notification = result.rows[0];
    const io = getIo();

    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification);
      
      const countResult = await query(`
        SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false
      `, [userId]);
      const count = parseInt(countResult.rows[0].count, 10);
      io.to(`user:${userId}`).emit('notification:count', { unread_count: count });
    }

    return notification;
  } catch (error) {
    logger.error('createNotification error:', error.message);
    return null;
  }
}

async function notifyAdmins(title, message, type = 'system', data = null) {
  try {
    const admins = await query("SELECT id FROM users WHERE role = 'admin'");
    const io = getIo();

    for (const admin of admins.rows) {
      const result = await query(`
        INSERT INTO notifications (user_id, title, message, type, data)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
      `, [admin.id, title, message, type, data]);
      
      if (io) {
        io.to(`user:${admin.id}`).emit('notification:new', result.rows[0]);
      }
    }
  } catch (error) {
    logger.error('notifyAdmins error:', error.message);
  }
}

module.exports = { createNotification, notifyAdmins };
