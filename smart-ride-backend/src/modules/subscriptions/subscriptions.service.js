const { query, getClient } = require('../../config/db');
const logger = require('../../utils/logger');

// Emitting events will require the io instance
const getIo = () => {
  try {
    const { getIO } = require('../../socket/index');
    return getIO();
  } catch (e) {
    return null;
  }
};

const createPlan = async (userId, requestId, planType) => {
  try {
    // 1. Get request -> verify belongs to userId, status='driver_assigned'
    const reqResult = await query('SELECT * FROM subscription_requests WHERE id = $1', [requestId]);
    if (reqResult.rows.length === 0) throw new Error('REQUEST_NOT_FOUND');
    const request = reqResult.rows[0];

    if (request.user_id !== userId) throw new Error('UNAUTHORIZED');
    if (request.status !== 'driver_assigned') throw new Error('INVALID_STATUS');

    // 2. Get active pricing config (use request's pricing_config_id for locked prices)
    const configResult = await query('SELECT * FROM pricing_config WHERE id = $1', [request.pricing_config_id]);
    if (configResult.rows.length === 0) throw new Error('CONFIG_NOT_FOUND');
    const config = configResult.rows[0];

    // 3. Get locked price based on planType
    let total_amount;
    let duration_days;
    switch (planType) {
      case 'monthly':
        total_amount = request.calculated_monthly_price;
        duration_days = 30;
        break;
      case 'quarterly':
        total_amount = request.calculated_quarterly_price;
        duration_days = 90;
        break;
      case 'half_yearly':
        total_amount = request.calculated_half_yearly_price;
        duration_days = 180;
        break;
      case 'yearly':
        total_amount = request.calculated_yearly_price;
        duration_days = 365;
        break;
      default:
        throw new Error('INVALID_PLAN_TYPE');
    }

    // 4. Calculate
    const start_date = new Date(request.start_date);
    const end_date = new Date(start_date);
    end_date.setDate(start_date.getDate() + duration_days);
    
    // Extract GST and subtotal backward from total_amount
    // total_amount = subtotal + gst; gst = subtotal * gst_percent/100;
    // total_amount = subtotal * (1 + gst_percent/100);
    // subtotal = total_amount / (1 + gst_percent/100);
    const gst_percentage = Number(config.gst_percentage);
    const subtotal = total_amount / (1 + gst_percentage / 100);
    const gst_amount = total_amount - subtotal;
    
    const platform_commission = total_amount * 0.15;
    const driver_amount = total_amount * 0.85;

    // Savings = (monthly_price * (duration_days/30)) - total_amount
    const monthlyEquivalentTotal = Number(request.calculated_monthly_price) * (duration_days / 30);
    const savings_amount = monthlyEquivalentTotal - Number(total_amount);

    // Get multipliers and rates used
    const multipliers = typeof config.vehicle_multipliers === 'string' ? JSON.parse(config.vehicle_multipliers) : config.vehicle_multipliers;
    const vehicle_multiplier_used = multipliers[request.preferred_vehicle_type] || 1.0;
    const per_km_rate_used = config[`per_km_rate_${planType === 'half_yearly' ? 'half_yearly' : planType}`] || config.per_km_rate_monthly;

    // 5. INSERT into subscription_plans with status='waiting_payment'
    const result = await query(`
      INSERT INTO subscription_plans (
        request_id, user_id, driver_id, vehicle_id, plan_type, subtotal, gst_amount, total_amount,
        platform_commission, driver_amount, savings_amount, distance_km, per_km_rate_used,
        vehicle_multiplier_used, base_fare_used, pricing_config_id, start_date, end_date,
        duration_days, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng,
        morning_pickup_time, evening_return_time, wants_evening_return, preferred_vehicle_type,
        number_of_passengers, status, is_shared_ride
      ) VALUES (
        $1, $2, $3, (SELECT id FROM vehicles WHERE driver_id = $3 LIMIT 1), $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
        'waiting_payment', $30
      ) RETURNING *
    `, [
      request.id, request.user_id, request.assigned_driver_id, planType, subtotal, gst_amount, total_amount,
      platform_commission, driver_amount, savings_amount, request.distance_km, per_km_rate_used,
      vehicle_multiplier_used, config.base_fare, config.id, request.start_date, end_date.toISOString().split('T')[0],
      duration_days, request.pickup_address, request.pickup_lat, request.pickup_lng,
      request.drop_address, request.drop_lat, request.drop_lng, request.morning_pickup_time,
      request.evening_return_time, request.wants_evening_return, request.preferred_vehicle_type,
      request.number_of_passengers, request.shared_ride_group_id ? true : false
    ]);

    return result.rows[0];
  } catch (error) {
    if (['REQUEST_NOT_FOUND', 'UNAUTHORIZED', 'INVALID_STATUS', 'CONFIG_NOT_FOUND', 'INVALID_PLAN_TYPE'].includes(error.message)) throw error;
    logger.error('createPlan error:', error);
    throw new Error('DB_ERROR');
  }
};

const activatePlan = async (planId, paymentId) => {
  let client;
  try {
    client = await getClient();
    await client.query('BEGIN');

    // 1. UPDATE subscription_plans SET status='active'
    const planResult = await client.query(`
      UPDATE subscription_plans 
      SET status = 'active', updated_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `, [planId]);
    if (planResult.rows.length === 0) throw new Error('PLAN_NOT_FOUND');
    const plan = planResult.rows[0];

    // 2. UPDATE subscription_requests SET status='driver_assigned' (it might already be)
    await client.query(`
      UPDATE subscription_requests SET status = 'driver_assigned', updated_at = NOW() WHERE id = $1
    `, [plan.request_id]);

    // 3. Create trips for each day from start_date to end_date
    const start = new Date(plan.start_date);
    const end = new Date(plan.end_date);
    let currentDate = new Date(start);

    const tripValues = [];
    const tripParams = [];
    let paramIndex = 1;

    while (currentDate <= end) {
      // morning slot
      tripValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 'morning', $${paramIndex++}, 'scheduled', $${paramIndex++})`);
      tripParams.push(plan.id, plan.driver_id, plan.user_id, currentDate.toISOString().split('T')[0], plan.morning_pickup_time, plan.distance_km);

      // evening slot
      if (plan.wants_evening_return && plan.evening_return_time) {
        tripValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 'evening', $${paramIndex++}, 'scheduled', $${paramIndex++})`);
        tripParams.push(plan.id, plan.driver_id, plan.user_id, currentDate.toISOString().split('T')[0], plan.evening_return_time, plan.distance_km);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (tripValues.length > 0) {
      // Chunking if necessary, but typical max is 365*2 = 730 trips -> 730*6 = 4380 params (postgres allows up to 65535)
      await client.query(`
        INSERT INTO trips (subscription_plan_id, driver_id, user_id, date, slot, scheduled_pickup_time, status, distance_covered_km)
        VALUES ${tripValues.join(', ')}
        ON CONFLICT (subscription_plan_id, date, slot) DO NOTHING
      `, tripParams);
    }

    // 4. Notify driver
    await client.query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        (SELECT user_id FROM drivers WHERE id = $1),
        'Subscription Activated! 🎉',
        'A passenger has activated their subscription. Trips have been scheduled.',
        'subscription'
      )
    `, [plan.driver_id]);

    const io = getIo();
    if (io) {
      const driverUserResult = await client.query('SELECT user_id FROM drivers WHERE id = $1', [plan.driver_id]);
      if (driverUserResult.rows.length > 0) {
        io.to(`user:${driverUserResult.rows[0].user_id}`).emit('driver:subscription_activated', { planId });
      }
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    logger.error('activatePlan error:', error);
    throw new Error('DB_ERROR');
  } finally {
    if (client) client.release();
  }
};

const getUserSubscriptions = async (userId) => {
  try {
    const result = await query(`
      SELECT sp.*, d.rating as driver_rating, u.full_name as driver_name, u.phone as driver_phone, u.profile_photo as driver_photo,
             v.id as v_id, v.brand as vehicle_brand, v.model as vehicle_model, v.vehicle_number
      FROM subscription_plans sp
      LEFT JOIN drivers d ON sp.driver_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN vehicles v ON sp.vehicle_id = v.id
      WHERE sp.user_id = $1 AND sp.status = 'active'
      ORDER BY sp.created_at DESC
    `, [userId]);
    
    return result.rows.map(row => {
      let driver = null;
      if (row.driver_id) {
        driver = {
          id: row.driver_id,
          full_name: row.driver_name,
          phone: row.driver_phone,
          profile_photo: row.driver_photo,
          rating: row.driver_rating,
          vehicle: row.v_id ? {
            id: row.v_id,
            brand: row.vehicle_brand,
            model: row.vehicle_model,
            plate_number: row.vehicle_number
          } : null
        };
      }
      
      const {
        driver_rating, driver_name, driver_phone, driver_photo,
        v_id, vehicle_brand, vehicle_model, vehicle_number,
        ...subData
      } = row;
      
      return {
        ...subData,
        driver
      };
    });
  } catch (error) {
    logger.error('getUserSubscriptions error:', error);
    throw new Error('DB_ERROR');
  }
};

const createSubscription = async (userId, data) => {
  const {
    distance_km, plan_type, vehicle_type = 'hatchback', duration_days,
    pickup_address, pickup_lat, pickup_lng,
    drop_address, drop_lat, drop_lng,
    start_date, morning_slot, evening_slot,
    morning_pickup_time = '09:00:00', evening_return_time = '18:00:00'
  } = data;

  let client;
  try {
    client = await getClient();
    await client.query('BEGIN');

    // Get pricing config and calculate dynamically
    const configResult = await client.query('SELECT * FROM pricing_config WHERE is_active = true ORDER BY created_at DESC LIMIT 1');
    if (configResult.rows.length === 0) throw new Error('CONFIG_NOT_FOUND');
    const config = configResult.rows[0];

    const { predictPricing } = require('../pricing/pricing.service');
    const prediction = await predictPricing(distance_km, vehicle_type);
    const pkg = prediction.packages[plan_type];
    if (!pkg) throw new Error('INVALID_PLAN_TYPE');

    const total_amount = pkg.total;
    const subtotal = pkg.subtotal;
    const gst_amount = pkg.gst;
    const savings_amount = pkg.savings || 0;
    const per_km_rate_used = pkg.per_km_rate || (config.price_per_km || 15);
    const vehicle_multiplier_used = prediction.vehicle_multiplier;
    const base_fare_used = prediction.breakdown.base_fare;
    
    const platform_commission = total_amount * (prediction.breakdown.platform_commission / 100);
    const driver_amount = total_amount - platform_commission;

    // 1. Create request to satisfy NOT NULL constraints
    const reqResult = await client.query(`
      INSERT INTO subscription_requests (
        user_id, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng,
        distance_km, estimated_duration_min, morning_pickup_time, evening_return_time, wants_evening_return,
        start_date, preferred_vehicle_type, number_of_passengers,
        calculated_monthly_price, calculated_quarterly_price, calculated_half_yearly_price, calculated_yearly_price,
        pricing_config_id, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19,
        $20, 'driver_assigned'
      ) RETURNING id
    `, [
      userId, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng,
      distance_km, 30, morning_pickup_time, evening_return_time, evening_slot,
      start_date, vehicle_type, 1,
      prediction.packages.monthly.total, prediction.packages.quarterly.total, prediction.packages.half_yearly.total, prediction.packages.yearly.total,
      config.id
    ]);

    const requestId = reqResult.rows[0].id;
    
    // 2. Create subscription plan
    const end_date = new Date(start_date);
    end_date.setDate(end_date.getDate() + duration_days);

    const planResult = await client.query(`
      INSERT INTO subscription_plans (
        request_id, user_id, plan_type, subtotal, gst_amount, total_amount,
        platform_commission, driver_amount, savings_amount, distance_km, per_km_rate_used,
        vehicle_multiplier_used, base_fare_used, pricing_config_id, start_date, end_date,
        duration_days, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng,
        morning_pickup_time, evening_return_time, wants_evening_return, preferred_vehicle_type,
        number_of_passengers, status, is_shared_ride
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, 'waiting_payment', false
      ) RETURNING *
    `, [
      requestId, userId, plan_type, subtotal, gst_amount, total_amount,
      platform_commission, driver_amount, savings_amount, distance_km, per_km_rate_used,
      vehicle_multiplier_used, base_fare_used, config.id, start_date, end_date.toISOString().split('T')[0],
      duration_days, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng,
      morning_pickup_time, evening_return_time, evening_slot, vehicle_type, 1
    ]);

    await client.query('COMMIT');
    return planResult.rows[0];
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    logger.error('createSubscription error:', error);
    throw new Error('DB_ERROR');
  } finally {
    if (client) client.release();
  }
};

const getAllPlans = async (includeInactive) => {
  return [];
};

const cancelSubscription = async (subscriptionId, userId) => {
  let client;
  try {
    client = await getClient();
    await client.query('BEGIN');

    const subRes = await client.query('SELECT * FROM subscription_plans WHERE id = $1 AND user_id = $2 FOR UPDATE', [subscriptionId, userId]);
    if (subRes.rows.length === 0) throw new Error('SUBSCRIPTION_NOT_FOUND');
    const sub = subRes.rows[0];

    if (sub.status === 'cancelled') {
      await client.query('ROLLBACK');
      return { message: 'Subscription is already cancelled' };
    }

    if (sub.status === 'active' && sub.driver_id) {
      await client.query(`
        UPDATE driver_routes 
        SET available_seats = available_seats + $1 
        WHERE driver_id = $2 AND status = 'active'
      `, [sub.number_of_passengers || 1, sub.driver_id]);
    }

    await client.query(`UPDATE subscription_plans SET status = 'cancelled' WHERE id = $1`, [subscriptionId]);

    await client.query('COMMIT');
    return { message: 'Subscription cancelled successfully' };
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    logger.error('cancelSubscription error:', error);
    if (error.message === 'SUBSCRIPTION_NOT_FOUND') throw error;
    throw new Error('DB_ERROR');
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  createPlan,
  createSubscription,
  activatePlan,
  getUserSubscriptions,
  getAllPlans,
  cancelSubscription
};
