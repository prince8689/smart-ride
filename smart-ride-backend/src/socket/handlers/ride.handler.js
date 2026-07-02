const EVENTS = require('../socket.events');
const ROOMS = require('../socket.rooms');
const { query } = require('../../config/db');
const logger = require('../../utils/logger');
const notify = require('../../utils/notify');

const handleRideEvents = async (io, socket) => {
  // EVENT: JOIN_SUBSCRIPTION_ROOM
  socket.on(EVENTS.JOIN_ROOM, async (payload) => {
    try {
      const { subscription_id } = payload;
      const sub = await query(`SELECT user_id, driver_id FROM user_subscriptions WHERE id=$1`, [subscription_id]);
      if (sub.rows.length === 0) return socket.emit(EVENTS.ERROR, { message: 'Subscription not found' });

      const isAllowed = socket.user.role === 'admin' || 
                        (socket.user.role === 'vehicle_owner' && sub.rows[0].user_id === socket.user.id) ||
                        (socket.user.role === 'driver' && sub.rows[0].driver_id === socket.driverProfileId);

      if (!isAllowed) return socket.emit(EVENTS.ERROR, { message: 'Unauthorized to join this room' });

      socket.join(ROOMS.subscriptionRoom(subscription_id));
      socket.emit(EVENTS.JOIN_ROOM, { joined: true, room: ROOMS.subscriptionRoom(subscription_id) });
    } catch (err) {
      logger.error(`Join room error: ${err.message}`);
      socket.emit(EVENTS.ERROR, { message: 'Failed to join room' });
    }
  });

  // EVENT: RIDE_STARTED
  socket.on(EVENTS.RIDE_STARTED, async (payload) => {
    try {
      if (socket.user.role !== 'driver') return socket.emit(EVENTS.ERROR, { message: 'Unauthorized' });
      const { subscription_id, slot } = payload;

      const sub = await query(`SELECT user_id FROM user_subscriptions WHERE id=$1 AND driver_id=$2`, [subscription_id, socket.driverProfileId]);
      if (sub.rows.length === 0) return socket.emit(EVENTS.ERROR, { message: 'Subscription not assigned to you' });

      const broadcastData = { message: 'Your ride has started!', subscription_id, slot, driver_name: socket.user.full_name, started_at: new Date() };

      io.to(ROOMS.userRoom(sub.rows[0].user_id)).emit(EVENTS.RIDE_STARTED, broadcastData);
      io.to(ROOMS.subscriptionRoom(subscription_id)).emit(EVENTS.RIDE_STARTED, broadcastData);
      io.to(ROOMS.adminRoom()).emit(EVENTS.ADMIN_DRIVER_STATUS, { type: 'ride_started', driverProfileId: socket.driverProfileId, subscription_id, timestamp: new Date() });

      notify.createNotification(sub.rows[0].user_id, 'Ride Started', `Your ride has started! Driver: ${socket.user.full_name}`, 'subscription');
    } catch (err) {
      logger.error(`Ride started error: ${err.message}`);
      socket.emit(EVENTS.ERROR, { message: 'Failed to start ride' });
    }
  });

  // EVENT: RIDE_COMPLETED
  socket.on(EVENTS.RIDE_COMPLETED, async (payload) => {
    try {
      if (socket.user.role !== 'driver') return socket.emit(EVENTS.ERROR, { message: 'Unauthorized' });
      const { subscription_id, slot } = payload;

      const sub = await query(`SELECT user_id FROM user_subscriptions WHERE id=$1 AND driver_id=$2`, [subscription_id, socket.driverProfileId]);
      if (sub.rows.length === 0) return socket.emit(EVENTS.ERROR, { message: 'Subscription not assigned to you' });

      const broadcastData = { message: 'You have reached your destination. Have a great day!', subscription_id, slot, completed_at: new Date() };

      io.to(ROOMS.userRoom(sub.rows[0].user_id)).emit(EVENTS.RIDE_COMPLETED, broadcastData);
      io.to(ROOMS.adminRoom()).emit(EVENTS.ADMIN_DRIVER_STATUS, { type: 'ride_completed', driverProfileId: socket.driverProfileId, subscription_id, timestamp: new Date() });

      notify.createNotification(sub.rows[0].user_id, 'Ride Completed', broadcastData.message, 'subscription');
    } catch (err) {
      logger.error(`Ride completed error: ${err.message}`);
      socket.emit(EVENTS.ERROR, { message: 'Failed to complete ride' });
    }
  });

  // EVENT: RIDE_ETA_UPDATE
  socket.on(EVENTS.RIDE_ETA_UPDATE, async (payload) => {
    try {
      if (socket.user.role !== 'driver') return socket.emit(EVENTS.ERROR, { message: 'Unauthorized' });
      const { subscription_id, eta_minutes } = payload;

      const sub = await query(`SELECT user_id FROM user_subscriptions WHERE id=$1 AND driver_id=$2`, [subscription_id, socket.driverProfileId]);
      if (sub.rows.length === 0) return socket.emit(EVENTS.ERROR, { message: 'Subscription not assigned to you' });

      const broadcastData = { eta_minutes, message: `Driver will arrive in ${eta_minutes} minutes`, updated_at: new Date() };

      io.to(ROOMS.subscriptionRoom(subscription_id)).emit(EVENTS.RIDE_ETA_UPDATE, broadcastData);
      io.to(ROOMS.userRoom(sub.rows[0].user_id)).emit(EVENTS.RIDE_ETA_UPDATE, broadcastData);
    } catch (err) {
      logger.error(`Ride ETA update error: ${err.message}`);
      socket.emit(EVENTS.ERROR, { message: 'Failed to update ETA' });
    }
  });
};

module.exports = { handleRideEvents };
