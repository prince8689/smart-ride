// ========== FILE: src/helpers/socketHelper.js ==========
const logger = require('../utils/logger');

/**
 * Get the Socket.io instance from the Express app.
 * This relies on `app.set('io', io)` being called in server.js.
 */
let _io = null;

const setIO = (io) => {
  _io = io;
};

const getIO = () => {
  if (_io) return _io;
  // Fallback: try to get from the app module
  try {
    const app = require('../app');
    _io = app.get('io');
  } catch (e) {
    // silently fail
  }
  return _io;
};

/**
 * Emit an event to a specific user.
 * Users join room `user:{userId}` on socket connect (see socket.init.js).
 *
 * @param {string} userId
 * @param {string} event
 * @param {object} data
 */
const emitToUser = (userId, event, data) => {
  const io = getIO();
  if (!io) {
    logger.warn('socketHelper.emitToUser: io not available', { userId, event });
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
};

/**
 * Emit an event to a specific driver.
 * Drivers also join room `user:{userId}` on connect.
 *
 * @param {string} driverId - driver's user ID
 * @param {string} event
 * @param {object} data
 */
const emitToDriver = (driverId, event, data) => {
  const io = getIO();
  if (!io) {
    logger.warn('socketHelper.emitToDriver: io not available', { driverId, event });
    return;
  }
  io.to(`user:${driverId}`).emit(event, data);
};

/**
 * Emit an event to all admins.
 * Admins join room `admin:room` on connect (see socket.init.js).
 *
 * @param {string} event
 * @param {object} data
 */
const emitToAdmin = (event, data) => {
  const io = getIO();
  if (!io) {
    logger.warn('socketHelper.emitToAdmin: io not available', { event });
    return;
  }
  io.to('admin:room').emit(event, data);
};

module.exports = {
  setIO,
  getIO,
  emitToUser,
  emitToDriver,
  emitToAdmin,
};
// ========== END ==========
