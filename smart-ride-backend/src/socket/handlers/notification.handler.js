const EVENTS = require('../socket.events');
const ROOMS = require('../socket.rooms');
const { query } = require('../../config/db');
const logger = require('../../utils/logger');

const handleNotificationEvents = async (io, socket) => {
  // ON CONNECT
  socket.join(ROOMS.userRoom(socket.user.id));
  if (socket.user.role === 'admin') socket.join(ROOMS.adminRoom());
  
  try {
    const unread = await query(`SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false`, [socket.user.id]);
    socket.emit(EVENTS.NOTIFICATION_COUNT, { count: parseInt(unread.rows[0].count, 10) });
  } catch (err) {
    logger.error(`Error sending unread count: ${err.message}`);
  }

  // EVENT: MARK_READ
  socket.on(EVENTS.MARK_READ, async (payload) => {
    try {
      if (payload.all) {
        await query(`UPDATE notifications SET is_read=true WHERE user_id=$1`, [socket.user.id]);
      } else if (payload.notification_id) {
        await query(`UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2`, [payload.notification_id, socket.user.id]);
      }
      
      const unread = await query(`SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false`, [socket.user.id]);
      socket.emit(EVENTS.NOTIFICATION_COUNT, { count: parseInt(unread.rows[0].count, 10) });
    } catch (err) {
      logger.error(`Mark read error: ${err.message}`);
      socket.emit(EVENTS.ERROR, { message: 'Failed to mark notification read' });
    }
  });

  // EVENT: PING
  socket.on(EVENTS.PING, (payload) => {
    socket.emit(EVENTS.PONG, { timestamp: payload.timestamp, server_time: new Date() });
  });
};

// EXPORTED HELPERS
const sendNotificationToUser = async (io, userId, notification) => {
  if (!io) return;
  io.to(ROOMS.userRoom(userId)).emit(EVENTS.NEW_NOTIFICATION, notification);
  
  try {
    const unread = await query(`SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false`, [userId]);
    io.to(ROOMS.userRoom(userId)).emit(EVENTS.NOTIFICATION_COUNT, { count: parseInt(unread.rows[0].count, 10) });
  } catch (err) {
    // Ignore error in broadcast
  }
};

const sendNotificationToAdmin = (io, notification) => {
  if (!io) return;
  io.to(ROOMS.adminRoom()).emit(EVENTS.NEW_NOTIFICATION, notification);
};

module.exports = { 
  handleNotificationEvents, 
  sendNotificationToUser, 
  sendNotificationToAdmin 
};
