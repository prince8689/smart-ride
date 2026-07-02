const { query } = require('../../config/db');
const logger = require('../../utils/logger');

const getIo = () => {
  try {
    const { getIO } = require('../../socket/index');
    return getIO();
  } catch (e) {
    return null;
  }
};

const getTodayTrips = async (driverUserId) => {
  try {
    // 1. Get driver profile from driverId (user_id)
    const driverResult = await query('SELECT id FROM drivers WHERE user_id = $1', [driverUserId]);
    if (driverResult.rows.length === 0) throw new Error('DRIVER_NOT_FOUND');
    const driverId = driverResult.rows[0].id;

    // 2. SELECT trips WHERE driver_id=driver AND date=TODAY
    const dateStr = new Date().toISOString().split('T')[0];
    
    // 3. JOIN subscription_plans, users (passenger details), vehicles
    const result = await query(`
      SELECT t.*,
             sp.pickup_address, sp.pickup_lat, sp.pickup_lng, sp.drop_address, sp.drop_lat, sp.drop_lng,
             u.full_name as passenger_name, u.phone as passenger_phone,
             v.brand, v.model, v.vehicle_number, v.color
      FROM trips t
      JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
      JOIN users u ON t.user_id = u.id
      LEFT JOIN vehicles v ON sp.vehicle_id = v.id
      WHERE t.driver_id = $1 AND t.date = $2
      ORDER BY t.scheduled_pickup_time ASC
    `, [driverId, dateStr]);

    return result.rows;
  } catch (error) {
    if (error.message === 'DRIVER_NOT_FOUND') throw error;
    logger.error('getTodayTrips error:', error);
    throw new Error('DB_ERROR');
  }
};

const updateTripStatus = async (tripId, driverUserId, newStatus) => {
  try {
    // 1. Get trip -> verify driver matches
    const tripResult = await query(`
      SELECT t.*, d.user_id as driver_user_id 
      FROM trips t
      JOIN drivers d ON t.driver_id = d.id
      WHERE t.id = $1
    `, [tripId]);
    
    if (tripResult.rows.length === 0) throw new Error('TRIP_NOT_FOUND');
    const trip = tripResult.rows[0];

    if (trip.driver_user_id !== driverUserId) throw new Error('UNAUTHORIZED');

    // 2. Validate status transition
    const validTransitions = {
      'scheduled': ['driver_on_way', 'missed', 'cancelled'],
      'driver_on_way': ['arrived_at_pickup', 'cancelled'],
      'arrived_at_pickup': ['picked_up', 'cancelled'],
      'picked_up': ['completed'],
      'completed': [],
      'missed': [],
      'cancelled': []
    };

    if (!validTransitions[trip.status].includes(newStatus)) {
      throw new Error('INVALID_STATUS_TRANSITION');
    }

    // 3. UPDATE trips
    let updateQuery = 'UPDATE trips SET status = $1, updated_at = NOW()';
    const params = [newStatus];
    let paramIndex = 2;

    if (newStatus === 'picked_up') {
      updateQuery += `, actual_pickup_time = NOW()`;
    } else if (newStatus === 'completed') {
      updateQuery += `, actual_drop_time = NOW()`;
    }

    updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(tripId);

    const updateResult = await query(updateQuery, params);
    const updatedTrip = updateResult.rows[0];

    // Notification Logic
    let notificationMsg = '';
    if (newStatus === 'driver_on_way') {
      notificationMsg = 'Your driver is on the way!';
    } else if (newStatus === 'arrived_at_pickup') {
      notificationMsg = 'Driver has arrived at pickup point!';
    } else if (newStatus === 'picked_up') {
      notificationMsg = 'Trip started! Enjoy your commute.';
    } else if (newStatus === 'completed') {
      notificationMsg = 'Trip completed! Rate your experience.';
      // UPDATE drivers SET total_trips=total_trips+1
      // For average rating, since rating is updated per review, we don't recalculate it here without a review.
      // But we increment total_trips.
      await query(`UPDATE drivers SET total_trips = total_trips + 1 WHERE id = $1`, [trip.driver_id]);
    }

    if (notificationMsg) {
      await query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, 'Trip Update', $2, 'trip')
      `, [trip.user_id, notificationMsg]);

      const io = getIo();
      if (io) {
        io.to(`user:${trip.user_id}`).emit('trip:status_update', { trip: updatedTrip, message: notificationMsg });
      }
    }

    return updatedTrip;
  } catch (error) {
    if (['TRIP_NOT_FOUND', 'UNAUTHORIZED', 'INVALID_STATUS_TRANSITION'].includes(error.message)) throw error;
    logger.error('updateTripStatus error:', error);
    throw new Error('DB_ERROR');
  }
};

module.exports = {
  getTodayTrips,
  updateTripStatus
};
