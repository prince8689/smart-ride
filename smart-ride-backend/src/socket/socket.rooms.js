module.exports = {
  // Each user has their own room: user:[userId]
  userRoom: (userId) => `user:${userId}`,

  // Each driver has their own room: driver:[driverProfileId]  
  driverRoom: (driverProfileId) => `driver:${driverProfileId}`,

  // Each subscription has a room: subscription:[subscriptionId]
  // Driver + passenger of that subscription join this
  subscriptionRoom: (subscriptionId) => `subscription:${subscriptionId}`,

  // All admins join this room
  adminRoom: () => 'admin:global',

  // City-level room: city:[cityName]
  cityRoom: (city) => `city:${city.toLowerCase().replace(/\s+/g, '_')}`,

  // Online drivers tracking room
  onlineDriversRoom: () => 'drivers:online',
};
