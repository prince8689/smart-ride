module.exports = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Auth
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',

  // Location (driver emits → server → passengers)
  DRIVER_LOCATION_UPDATE: 'location:driver_update',
  DRIVER_LOCATION_BROADCAST: 'location:broadcast',
  DRIVER_LOCATION_REQUEST: 'location:request',
  DRIVER_ARRIVED: 'location:driver_arrived',
  DRIVER_ONLINE: 'location:driver_online',
  DRIVER_OFFLINE: 'location:driver_offline',

  // Ride Status
  RIDE_STARTED: 'ride:started',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_CANCELLED: 'ride:cancelled',
  RIDE_ETA_UPDATE: 'ride:eta_update',

  // Notifications (server → client)
  NEW_NOTIFICATION: 'notification:new',
  NOTIFICATION_COUNT: 'notification:count',
  MARK_READ: 'notification:mark_read',

  // Admin
  ADMIN_BROADCAST: 'admin:broadcast',
  ADMIN_STATS_UPDATE: 'admin:stats_update',
  ADMIN_NEW_SUBSCRIPTION: 'admin:new_subscription',
  ADMIN_NEW_COMPLAINT: 'admin:new_complaint',
  ADMIN_DRIVER_STATUS: 'admin:driver_status',

  // Rooms
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',

  // Ping
  PING: 'ping',
  PONG: 'pong',

  // ─── V2 Events ──────────────────────────────────────────────────────────
  // Driver V2
  DRIVER_UPDATE_LOCATION_V2: 'driver:update_location',
  DRIVER_UPDATE_STATUS_V2: 'driver:update_status',
  DRIVER_START_TRIP: 'driver:start_trip',
  DRIVER_COMPLETE_TRIP: 'driver:complete_trip',
  DRIVER_NEW_PASSENGER: 'driver:new_passenger_assigned',
  DRIVER_PASSENGER_REASSIGNED: 'driver:passenger_reassigned',

  // User V2
  USER_JOIN_SUBSCRIPTION: 'user:join_subscription_room',
  SUBSCRIPTION_DRIVER_REPLACED: 'subscription:driver_replaced',
  SUBSCRIPTION_DRIVER_REPLACEMENT_FAILED: 'subscription:driver_replacement_failed',

  // Admin V2
  ADMIN_JOIN_ROOM: 'admin:join_admin_room',
  ADMIN_DRIVER_REPLACED: 'admin:driver_replaced',
  ADMIN_DRIVER_REPLACEMENT_FAILED: 'admin:driver_replacement_failed',
};
