const EVENTS = require('../socket.events');
const ROOMS = require('../socket.rooms');
const { query } = require('../../config/db');
const logger = require('../../utils/logger');

let statsInterval = null;

const startAdminStatsInterval = (io) => {
  if (statsInterval) return;

  statsInterval = setInterval(async () => {
    try {
      const adminSockets = await io.in(ROOMS.adminRoom()).fetchSockets();
      if (adminSockets.length === 0) return; // No admins online

      const onlineDriversSet = await io.in(ROOMS.onlineDriversRoom()).fetchSockets();
      const online_driver_ids = onlineDriversSet.map(s => s.driverId || s.driverProfileId || (s.user ? s.user.id : null)).filter(Boolean);
      
      let online_drivers = [];
      if (online_driver_ids.length > 0) {
        const result = await query(`
          SELECT d.id as driver_profile_id, u.full_name, d.current_lat, d.current_lng
          FROM drivers d
          JOIN users u ON d.user_id = u.id
          WHERE d.id = ANY($1) OR u.id = ANY($1)
        `, [online_driver_ids]);
        online_drivers = result.rows.map(row => ({
          id: row.driver_profile_id,
          name: row.full_name,
          lat: row.current_lat,
          lng: row.current_lng
        }));
      }

      const activeSubs = await query(`SELECT COUNT(*) FROM user_subscriptions WHERE status='active'`);
      const openComps = await query(`SELECT COUNT(*) FROM complaints WHERE status='open'`);
      const pendingAssign = await query(`SELECT COUNT(*) FROM user_subscriptions WHERE status='active' AND driver_id IS NULL`);

      const statsData = {
        online_drivers_count: online_drivers.length,
        online_drivers,
        active_subscriptions: parseInt(activeSubs.rows[0].count, 10),
        open_complaints: parseInt(openComps.rows[0].count, 10),
        pending_assignments: parseInt(pendingAssign.rows[0].count, 10),
        timestamp: new Date()
      };

      io.to(ROOMS.adminRoom()).emit(EVENTS.ADMIN_STATS_UPDATE, statsData);
    } catch (err) {
      logger.error(`Admin stats interval error: ${err.message}`);
    }
  }, 60000); // 60 seconds
};

const handleAdminEvents = async (io, socket) => {
  // ON CONNECT (Admin already joined adminRoom in notification handler)
  startAdminStatsInterval(io); // ensure interval is running
  
  try {
    const onlineDriversSet = await io.in(ROOMS.onlineDriversRoom()).fetchSockets();
    const online_driver_ids = onlineDriversSet.map(s => s.driverId || s.driverProfileId || (s.user ? s.user.id : null)).filter(Boolean);
    
    let online_drivers = [];
    if (online_driver_ids.length > 0) {
      const result = await query(`
        SELECT d.id as driver_profile_id, u.full_name, d.current_lat, d.current_lng
        FROM drivers d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = ANY($1) OR u.id = ANY($1)
      `, [online_driver_ids]);
      online_drivers = result.rows.map(row => ({
        id: row.driver_profile_id,
        name: row.full_name,
        lat: row.current_lat,
        lng: row.current_lng
      }));
    }

    const activeSubs = await query(`SELECT COUNT(*) FROM user_subscriptions WHERE status='active'`);
    const openComps = await query(`SELECT COUNT(*) FROM complaints WHERE status='open'`);
    const pendingAssign = await query(`SELECT COUNT(*) FROM user_subscriptions WHERE status='active' AND driver_id IS NULL`);

    socket.emit(EVENTS.ADMIN_STATS_UPDATE, {
      online_drivers_count: online_drivers.length,
      online_drivers,
      active_subscriptions: parseInt(activeSubs.rows[0].count, 10),
      open_complaints: parseInt(openComps.rows[0].count, 10),
      pending_assignments: parseInt(pendingAssign.rows[0].count, 10),
      timestamp: new Date()
    });
  } catch (err) {
    logger.error(`Admin initial stats error: ${err.message}`);
  }

  // EVENT: ADMIN_BROADCAST
  socket.on(EVENTS.ADMIN_BROADCAST, async (payload) => {
    try {
      if (socket.user.role !== 'admin') return socket.emit(EVENTS.ERROR, { message: 'Unauthorized' });
      
      const { message, target } = payload;
      const broadcastMsg = { title: 'Admin Announcement', message, from: 'Smart Ride Team', timestamp: new Date() };

      if (target === 'all') {
        io.emit(EVENTS.NEW_NOTIFICATION, broadcastMsg);
      } else if (target === 'drivers') {
        io.to(ROOMS.onlineDriversRoom()).emit(EVENTS.NEW_NOTIFICATION, broadcastMsg);
      } else if (target === 'users') {
        // Broadly emit to all, but clients should filter, or emit specifically. 
        // For simplicity:
        socket.broadcast.emit(EVENTS.NEW_NOTIFICATION, broadcastMsg); 
      } else {
        io.to(ROOMS.userRoom(target)).emit(EVENTS.NEW_NOTIFICATION, broadcastMsg);
      }

      logger.info('Admin broadcast sent', { target, by: socket.user.id });
    } catch (err) {
      logger.error(`Admin broadcast error: ${err.message}`);
      socket.emit(EVENTS.ERROR, { message: 'Failed to broadcast' });
    }
  });
};

// EXPORTED HELPERS
const notifyAdminNewSubscription = (io, subscription, user) => {
  if (!io) return;
  io.to(ROOMS.adminRoom()).emit(EVENTS.ADMIN_NEW_SUBSCRIPTION, {
    subscription_id: subscription.id,
    user_name: user.full_name,
    timestamp: new Date()
  });
};

const notifyAdminNewComplaint = (io, complaint, user) => {
  if (!io) return;
  io.to(ROOMS.adminRoom()).emit(EVENTS.ADMIN_NEW_COMPLAINT, {
    complaint_id: complaint.id,
    user_name: user.full_name,
    subject: complaint.subject,
    timestamp: new Date()
  });
};

module.exports = { handleAdminEvents, notifyAdminNewSubscription, notifyAdminNewComplaint };
