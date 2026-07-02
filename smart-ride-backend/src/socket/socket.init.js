const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');

// Import handlers
const locationHandler = require('./handlers/location.handler');

function initializeSocket(io) {
  // Auth middleware for every socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1] ||
        socket.handshake.query.token;

      if (!token) return next(new Error('AUTH_REQUIRED'));

      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id, userId: socket.user?.id, role: socket.user?.role });

    // Join personal room
    socket.join(`user:${socket.user.id}`);

    // Join role-based room
    if (socket.user.role === 'admin') socket.join('admin:room');
    if (socket.user.role === 'driver') socket.join('drivers:online');

    socket.on('ping', ({ timestamp }) => {
      socket.emit('pong', { timestamp, server_time: new Date() });
    });

    // Initialize location handlers for drivers
    if (socket.user.role === 'driver') {
      locationHandler(io, socket);
    }

    // ─── V2 Event Handlers ────────────────────────────────────────────────
    const { query: dbQuery } = require('../config/db');

    // driver:update_location → update driver_availability lat/lng
    socket.on('driver:update_location', async (data) => {
      try {
        const { lat, lng } = data;
        if (lat && lng) {
          await dbQuery(
            `INSERT INTO driver_availability (driver_id, status, last_updated, current_lat, current_lng)
             VALUES ($1, 'online', NOW(), $2, $3)
             ON CONFLICT (driver_id) DO UPDATE SET current_lat = $2, current_lng = $3, last_updated = NOW(), status = 'online'`,
            [socket.user.id, lat, lng]
          );
        }
      } catch (err) {
        logger.error('driver:update_location error:', err);
      }
    });

    // driver:update_status → update driver_availability status + log
    socket.on('driver:update_status', async (data) => {
      try {
        const { status, reason } = data;
        if (!['online', 'offline', 'busy', 'unavailable'].includes(status)) return;

        // Get old status
        const oldResult = await dbQuery('SELECT status FROM driver_availability WHERE driver_id = $1', [socket.user.id]);
        const oldStatus = oldResult.rows[0]?.status || null;

        await dbQuery(
          `INSERT INTO driver_availability (driver_id, status, last_updated)
           VALUES ($1, $2, NOW())
           ON CONFLICT (driver_id) DO UPDATE SET status = $2, last_updated = NOW()`,
          [socket.user.id, status]
        );

        await dbQuery(
          `INSERT INTO driver_status_history (driver_id, old_status, new_status, reason)
           VALUES ($1, $2, $3, $4)`,
          [socket.user.id, oldStatus, status, reason || 'Socket status update']
        );
      } catch (err) {
        logger.error('driver:update_status error:', err);
      }
    });

    // driver:start_trip → update trip_schedule status
    socket.on('driver:start_trip', async (data) => {
      try {
        const { tripScheduleId } = data;
        await dbQuery(
          `UPDATE trip_schedules SET status = 'in_progress', actual_pickup_time = NOW(), updated_at = NOW() WHERE id = $1 AND driver_id = $2`,
          [tripScheduleId, socket.user.id]
        );
        // Notify user
        const trip = await dbQuery('SELECT user_id FROM trip_schedules WHERE id = $1', [tripScheduleId]);
        if (trip.rows[0]) {
          io.to(`user:${trip.rows[0].user_id}`).emit('trip:started', { tripScheduleId });
        }
      } catch (err) {
        logger.error('driver:start_trip error:', err);
      }
    });

    // driver:complete_trip → update trip_schedule status + actual times
    socket.on('driver:complete_trip', async (data) => {
      try {
        const { tripScheduleId } = data;
        await dbQuery(
          `UPDATE trip_schedules SET status = 'completed', actual_dropoff_time = NOW(), updated_at = NOW() WHERE id = $1 AND driver_id = $2`,
          [tripScheduleId, socket.user.id]
        );
        const trip = await dbQuery('SELECT user_id FROM trip_schedules WHERE id = $1', [tripScheduleId]);
        if (trip.rows[0]) {
          io.to(`user:${trip.rows[0].user_id}`).emit('trip:completed', { tripScheduleId });
        }
      } catch (err) {
        logger.error('driver:complete_trip error:', err);
      }
    });

    // user:join_subscription_room → join subscription-specific room
    socket.on('user:join_subscription_room', (data) => {
      const { subscriptionId } = data;
      if (subscriptionId) {
        socket.join(`subscription:${subscriptionId}`);
      }
    });

    // admin:join_admin_room → verify admin role + join admin room
    socket.on('admin:join_admin_room', () => {
      if (socket.user.role === 'admin') {
        socket.join('admin:room');
        socket.join('admin:global');
      }
    });

    // ─── End V2 Event Handlers ────────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, reason });
    });

    socket.on('error', (err) => {
      logger.error('Socket error', { socketId: socket.id, error: err.message });
    });
  });

  logger.info('Socket.io initialized');
}

module.exports = { initializeSocket };
