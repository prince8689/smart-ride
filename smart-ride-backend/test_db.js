require('dotenv').config();
const { query } = require('./src/config/db');

async function test() {
  try {
    const res = await query(`
       SELECT
         us.id AS subscription_id,
         us.status, us.start_date, us.end_date,
         us.pickup_address, us.pickup_lat, us.pickup_lng,
         us.drop_address, us.drop_lat, us.drop_lng,
         us.morning_slot, us.evening_slot, us.amount_paid,
         us.created_at,
         sp.plan_name, sp.plan_type, sp.price AS plan_price, sp.duration_days,
         r.route_name, r.pickup_location AS route_pickup, r.drop_location AS route_drop,
         r.distance_km, r.estimated_duration_min,
         r.morning_pickup_time, r.evening_pickup_time,
         du.full_name AS driver_name, du.phone AS driver_phone,
         dp.rating AS driver_rating, dp.id AS driver_profile_id,
         v.brand AS vehicle_brand, v.model AS vehicle_model,
         v.vehicle_number, v.color AS vehicle_color, v.vehicle_type
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       JOIN routes r ON us.route_id = r.id
       LEFT JOIN driver_profiles dp ON us.driver_id = dp.id
       LEFT JOIN users du ON dp.user_id = du.id
       LEFT JOIN vehicles v ON us.vehicle_id = v.id
       LIMIT 1;
    `);
    console.log("Success:", res.rows);
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    process.exit(0);
  }
}
test();
