const { query } = require('../../config/db');
const logger = require('../../utils/logger');
const pricingService = require('../pricing/pricing.service');
const googleMaps = require('../../utils/googleMaps');

// We'll require these later or handle gracefully if not implemented yet
let sharedRideEngine;
try {
  sharedRideEngine = require('../../utils/sharedRideEngine');
} catch (e) {
  logger.warn('sharedRideEngine not found yet');
}

// Emitting events will require the io instance
const getIo = () => {
  try {
    const { getIO } = require('../../socket/index');
    return getIO();
  } catch (e) {
    return null;
  }
};

const createRequest = async (userId, data) => {
  try {
    // 1. Validate user exists and both OTPs verified
    const userResult = await query('SELECT id, is_email_verified, is_phone_verified, email, full_name FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) throw new Error('USER_NOT_FOUND');
    const user = userResult.rows[0];
    
    if (!user.is_email_verified) throw new Error('EMAIL_NOT_VERIFIED');
    if (!user.is_phone_verified) throw new Error('PHONE_NOT_VERIFIED');

    // 2. Call getActivePricingConfig() & 3. Recalculate all 4 prices server-side
    // data should contain distance_km and preferred_vehicle_type
    const pricingData = await pricingService.calculatePricing(data.distance_km, data.preferred_vehicle_type);

    // 4. Generate reference_number: SR-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const reference_number = `SR-${dateStr}-${randomDigits}`;

    // 5. INSERT into subscription_requests
    const {
      pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng,
      distance_km, estimated_duration_min, morning_pickup_time, evening_return_time,
      wants_evening_return, start_date, preferred_vehicle_type, number_of_passengers
    } = data;

    const result = await query(`
      INSERT INTO subscription_requests (
        user_id, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng,
        distance_km, estimated_duration_min, morning_pickup_time, evening_return_time,
        wants_evening_return, start_date, preferred_vehicle_type, number_of_passengers,
        calculated_monthly_price, calculated_quarterly_price, calculated_half_yearly_price,
        calculated_yearly_price, pricing_config_id, reference_number, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'pending_review')
      RETURNING *
    `, [
      userId, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng,
      distance_km, estimated_duration_min, morning_pickup_time, evening_return_time,
      wants_evening_return || false, start_date, preferred_vehicle_type, number_of_passengers || 1,
      pricingData.packages.monthly.total_amount, pricingData.packages.quarterly.total_amount,
      pricingData.packages.half_yearly.total_amount, pricingData.packages.yearly.total_amount,
      pricingData.config_id, reference_number
    ]);

    const request = result.rows[0];

    // 6. Run sharedRideEngine.findSimilarRequests() in background
    if (sharedRideEngine && typeof sharedRideEngine.findAndNotifySimilarRequests === 'function') {
      // Non-blocking
      sharedRideEngine.findAndNotifySimilarRequests(request).catch(e => logger.error('sharedRideEngine error:', e));
    }

    // 7. Send email to user
    // We would use nodemailer here. For now just log it.
    console.log(`[EMAIL SIMULATION] To: ${user.email} | Request ${reference_number} received.`);

    // 8. Emit socket event to admin room
    const io = getIo();
    if (io) {
      io.to('admin_room').emit('subscription:request:new', { request });
    }

    // 9. Return created request
    return request;
  } catch (error) {
    if (['USER_NOT_FOUND', 'EMAIL_NOT_VERIFIED', 'PHONE_NOT_VERIFIED'].includes(error.message)) throw error;
    logger.error('createRequest error:', error);
    throw new Error('DB_ERROR');
  }
};

const getRequestDetails = async (requestId, userId, role) => {
  try {
    // 1. SELECT request with user details JOIN
    const result = await query(`
      SELECT sr.*, u.full_name, u.email, u.phone, u.profile_photo 
      FROM subscription_requests sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.id = $1
    `, [requestId]);

    if (result.rows.length === 0) throw new Error('REQUEST_NOT_FOUND');
    const request = result.rows[0];

    // 2. If role='user': verify request.user_id === userId
    if (role === 'user' && request.user_id !== userId) {
      throw new Error('UNAUTHORIZED');
    }

    // 3. If role='admin': include nearby drivers count
    if (role === 'admin') {
      try {
        const nearby = await googleMaps.findNearbyDrivers(request.pickup_lat, request.pickup_lng, 15, request.preferred_vehicle_type);
        request.nearby_drivers_count = nearby.length;
      } catch (e) {
        request.nearby_drivers_count = 0;
      }
    }

    return request;
  } catch (error) {
    if (['REQUEST_NOT_FOUND', 'UNAUTHORIZED'].includes(error.message)) throw error;
    logger.error('getRequestDetails error:', error);
    throw new Error('DB_ERROR');
  }
};

const assignDriver = async (requestId, driverId, adminId) => {
  try {
    // 1. Get request -> verify status
    const reqResult = await query('SELECT * FROM subscription_requests WHERE id = $1', [requestId]);
    if (reqResult.rows.length === 0) throw new Error('REQUEST_NOT_FOUND');
    const request = reqResult.rows[0];
    
    if (!['pending_review', 'admin_reviewing'].includes(request.status)) {
      throw new Error('INVALID_STATUS_TRANSITION');
    }

    // 2. Get driver -> verify is_verified=true, is_available=true
    const driverResult = await query(`
      SELECT d.*, u.email as driver_email, u.phone as driver_phone 
      FROM drivers d 
      JOIN users u ON d.user_id = u.id 
      WHERE d.id = $1
    `, [driverId]);
    if (driverResult.rows.length === 0) throw new Error('DRIVER_NOT_FOUND');
    const driver = driverResult.rows[0];

    if (!driver.is_verified || !driver.is_available) {
      throw new Error('DRIVER_NOT_AVAILABLE');
    }

    // 3. UPDATE subscription_requests
    const updateResult = await query(`
      UPDATE subscription_requests 
      SET status = 'driver_assigned', assigned_driver_id = $1, admin_id = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [driverId, adminId, requestId]);

    const updatedRequest = updateResult.rows[0];

    // 4. Create notification for user
    await query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, 'Driver assigned! Choose your plan to proceed.', 'We have assigned a driver for your request ' || $2, 'subscription')
    `, [request.user_id, request.reference_number]);

    // 5. Create notification for driver
    await query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, 'New passenger assigned to your route.', 'You have been assigned a new passenger.', 'subscription')
    `, [driver.user_id]);

    // 6. Send email to both user and driver (simulated)
    const userResult = await query('SELECT email FROM users WHERE id = $1', [request.user_id]);
    console.log(`[EMAIL SIMULATION] To: ${userResult.rows[0].email} | Driver assigned to request ${request.reference_number}`);
    console.log(`[EMAIL SIMULATION] To: ${driver.driver_email} | New passenger assigned to your route`);

    // 7. Emit socket events to both user and driver rooms
    const io = getIo();
    if (io) {
      io.to(`user:${request.user_id}`).emit('subscription:request:updated', { request: updatedRequest });
      io.to(`user:${driver.user_id}`).emit('driver:new_assignment', { request: updatedRequest });
    }

    return updatedRequest;
  } catch (error) {
    if (['REQUEST_NOT_FOUND', 'INVALID_STATUS_TRANSITION', 'DRIVER_NOT_FOUND', 'DRIVER_NOT_AVAILABLE'].includes(error.message)) throw error;
    logger.error('assignDriver error:', error);
    throw new Error('DB_ERROR');
  }
};

const getNearbyDrivers = async (requestId) => {
  try {
    const reqResult = await query('SELECT pickup_lat, pickup_lng, preferred_vehicle_type FROM subscription_requests WHERE id = $1', [requestId]);
    if (reqResult.rows.length === 0) throw new Error('REQUEST_NOT_FOUND');
    const { pickup_lat, pickup_lng, preferred_vehicle_type } = reqResult.rows[0];

    const drivers = await googleMaps.findNearbyDrivers(pickup_lat, pickup_lng, 15, preferred_vehicle_type);
    return drivers;
  } catch (error) {
    if (error.message === 'REQUEST_NOT_FOUND') throw error;
    logger.error('getNearbyDrivers error:', error);
    throw new Error('DB_ERROR');
  }
};

module.exports = {
  createRequest,
  getRequestDetails,
  assignDriver,
  getNearbyDrivers
};
