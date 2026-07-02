const { query } = require('../../config/db');
const logger = require('../../utils/logger');

// Simple rate limiter store: driverId -> lastUpdateTimestamp
const locationUpdateTimestamps = {};

const locationHandler = (io, socket) => {
  socket.on('driver:start:broadcasting', async ({ driverId }) => {
    try {
      socket.join(`driver:${driverId}`);
      socket.join('drivers:online');
      socket.driverId = driverId; // store on socket for disconnect event
      
      io.to('admin_room').emit('admin:driver_online', { driverId });
      logger.info(`Driver ${driverId} started broadcasting location.`);
    } catch (e) {
      logger.error('driver:start:broadcasting error:', e);
    }
  });

  socket.on('driver:location:update', async (data) => {
    try {
      const { lat, lng, heading } = data;
      const driverId = socket.driverId;
      if (!driverId) return;

      const now = Date.now();
      const lastUpdate = locationUpdateTimestamps[driverId] || 0;

      // Rate limit: max 1 update per 2 seconds per driver
      if (now - lastUpdate < 2000) {
        return;
      }
      locationUpdateTimestamps[driverId] = now;

      // UPDATE drivers SET current_lat=lat, current_lng=lng
      await query(`
        UPDATE drivers SET current_lat = $1, current_lng = $2, last_active_at = NOW()
        WHERE id = $3
      `, [lat, lng, driverId]);

      // Get all active subscriptions for this driver
      const subsResult = await query(`
        SELECT user_id FROM subscription_plans 
        WHERE driver_id = $1 AND status = 'active'
      `, [driverId]);

      // For each subscription, emit to user room
      const payload = { lat, lng, heading, timestamp: now };
      
      subsResult.rows.forEach(sub => {
        io.to(`user:${sub.user_id}`).emit('driver:location:broadcast', payload);
      });

      // Emit to admin room
      io.to('admin_room').emit('admin:driver_location', { driver_id: driverId, lat, lng, heading });

    } catch (e) {
      logger.error('driver:location:update error:', e);
    }
  });

  socket.on('disconnect', () => {
    if (socket.driverId) {
      delete locationUpdateTimestamps[socket.driverId];
      io.to('admin_room').emit('admin:driver_offline', { driver_id: socket.driverId });
      logger.info(`Driver ${socket.driverId} went offline.`);
    }
  });
};

module.exports = locationHandler;
