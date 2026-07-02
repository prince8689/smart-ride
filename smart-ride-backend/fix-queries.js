const fs = require('fs');
let content = fs.readFileSync('src/modules/drivers/drivers.service.js', 'utf8');

content = content.replace(
/SELECT\s+us\.id AS subscription_id[\s\S]*?ORDER BY us\.start_date ASC/m,
`SELECT
         sp.id AS subscription_id,
         sp.status, sr.start_date, sr.end_date,
         sr.pickup_address, sr.pickup_lat, sr.pickup_lng,
         sr.drop_address, sr.drop_lat, sr.drop_lng,
         true AS morning_slot, sr.wants_evening_return AS evening_slot, sp.total_amount AS amount_paid,
         pu.full_name AS passenger_name, pu.phone AS passenger_phone,
         pu.email AS passenger_email,
         'Standard Route' AS route_name, sr.pickup_address AS route_pickup, sr.drop_address AS route_drop,
         sp.distance_km, null AS estimated_duration_min,
         sr.morning_pickup_time, sr.evening_return_time AS evening_pickup_time,
         v.brand AS vehicle_brand, v.model AS vehicle_model,
         v.vehicle_number, v.color AS vehicle_color
       FROM subscription_plans sp
       JOIN subscription_requests sr ON sp.request_id = sr.id
       JOIN users pu ON sp.user_id = pu.id
       LEFT JOIN vehicles v ON sp.vehicle_id = v.id
       WHERE sp.driver_id = $1 AND sp.status = 'active'
       ORDER BY sr.start_date ASC`
);

content = content.replace(
/SELECT id FROM driver_attendance\s+WHERE driver_id = \$1 AND subscription_id = \$2 AND date = \$3 AND slot = \$4/m,
`SELECT id FROM trips
       WHERE driver_id = $1 AND subscription_plan_id = $2 AND date = $3 AND slot = $4`
);

content = content.replace(
/INSERT INTO driver_attendance\s+\(driver_id, subscription_id, date, slot, status, pickup_time, drop_time,\s+driver_lat_at_pickup, driver_lng_at_pickup\)\s+VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9\)\s+RETURNING id, driver_id, subscription_id, date, slot, status,\s+pickup_time, drop_time, created_at/m,
`INSERT INTO trips
         (driver_id, subscription_plan_id, date, slot, status, actual_pickup_time, actual_drop_time,
          driver_lat_at_pickup, driver_lng_at_pickup)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, driver_id, subscription_plan_id as subscription_id, date, slot, status,
                 actual_pickup_time as pickup_time, actual_drop_time as drop_time, created_at`
);

content = content.replace(
/SELECT\s+da\.id, da\.date, da\.slot, da\.status,\s+da\.pickup_time, da\.drop_time, da\.created_at,\s+pu\.full_name AS passenger_name,\s+us\.pickup_address, us\.drop_address\s+FROM driver_attendance da\s+JOIN user_subscriptions us ON da\.subscription_id = us\.id\s+JOIN users pu ON us\.user_id = pu\.id\s+WHERE da\.driver_id = \$1 AND da\.date >= \$2 AND da\.date < \$3\s+ORDER BY da\.date DESC, da\.slot ASC/m,
`SELECT
         da.id, da.date, da.slot, da.status,
         da.actual_pickup_time AS pickup_time, da.actual_drop_time AS drop_time, da.created_at,
         pu.full_name AS passenger_name,
         sr.pickup_address, sr.drop_address
       FROM trips da
       JOIN subscription_plans us ON da.subscription_plan_id = us.id
       JOIN subscription_requests sr ON us.request_id = sr.id
       JOIN users pu ON us.user_id = pu.id
       WHERE da.driver_id = $1 AND da.date >= $2 AND da.date < $3
       ORDER BY da.date DESC, da.slot ASC`
);

content = content.replace(
/SELECT\s+COUNT\(\*\) AS total,\s+COUNT\(\*\) FILTER \(WHERE status = 'completed'\) AS completed,\s+COUNT\(\*\) FILTER \(WHERE status = 'missed'\) AS missed,\s+COUNT\(\*\) FILTER \(WHERE status = 'pending'\) AS pending\s+FROM driver_attendance\s+WHERE driver_id = \$1 AND date >= \$2 AND date < \$3/m,
`SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE status = 'missed') AS missed,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending
       FROM trips
       WHERE driver_id = $1 AND date >= $2 AND date < $3`
);

content = content.replace(
/SELECT COALESCE\(SUM\(p\.amount\), 0\) AS total\s+FROM payments p\s+JOIN user_subscriptions us ON p\.subscription_id = us\.id\s+WHERE us\.driver_id = \$1 AND p\.status = 'success'/m,
`SELECT COALESCE(SUM(p.driver_amount), 0) AS total
       FROM payments p
       JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
       WHERE sp.driver_id = $1 AND p.status = 'success'`
);

content = content.replace(
/SELECT COALESCE\(SUM\(p\.amount\), 0\) AS total\s+FROM payments p\s+JOIN user_subscriptions us ON p\.subscription_id = us\.id\s+WHERE us\.driver_id = \$1 AND p\.status = 'success' AND p\.created_at >= \$2/m,
`SELECT COALESCE(SUM(p.driver_amount), 0) AS total
       FROM payments p
       JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
       WHERE sp.driver_id = $1 AND p.status = 'success' AND p.created_at >= $2`
);

content = content.replace(
/SELECT COALESCE\(SUM\(p\.amount\), 0\) AS total\s+FROM payments p\s+JOIN user_subscriptions us ON p\.subscription_id = us\.id\s+WHERE us\.driver_id = \$1 AND p\.status = 'success'\s+AND p\.created_at >= \$2 AND p\.created_at < \$3/m,
`SELECT COALESCE(SUM(p.driver_amount), 0) AS total
       FROM payments p
       JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
       WHERE sp.driver_id = $1 AND p.status = 'success'
         AND p.created_at >= $2 AND p.created_at < $3`
);

content = content.replace(
/SELECT\s+p\.id AS payment_id, p\.amount, p\.status AS payment_status,\s+p\.created_at AS payment_date,\s+sp\.plan_name,\s+pu\.full_name AS passenger_name\s+FROM payments p\s+JOIN user_subscriptions us ON p\.subscription_id = us\.id\s+JOIN subscription_plans sp ON us\.plan_id = sp\.id\s+JOIN users pu ON us\.user_id = pu\.id\s+WHERE us\.driver_id = \$1 AND p\.status = 'success'\s+ORDER BY p\.created_at DESC\s+LIMIT 20/m,
`SELECT
         p.id AS payment_id, p.amount, p.status AS payment_status,
         p.created_at AS payment_date,
         sp.plan_type AS plan_name,
         pu.full_name AS passenger_name
       FROM payments p
       JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
       JOIN users pu ON sp.user_id = pu.id
       WHERE sp.driver_id = $1 AND p.status = 'success'
       ORDER BY p.created_at DESC
       LIMIT 20`
);

content = content.replace(
/SELECT COUNT\(\*\) AS count FROM user_subscriptions\s+WHERE driver_id = \$1 AND status = 'active'/m,
`SELECT COUNT(*) AS count FROM subscription_plans
       WHERE driver_id = $1 AND status = 'active'`
);

content = content.replace(
/SELECT COUNT\(\*\) AS count FROM driver_attendance\s+WHERE driver_id = \$1 AND date = \$2/m,
`SELECT COUNT(*) AS count FROM trips
       WHERE driver_id = $1 AND date = $2`
);

content = content.replace(
/SELECT COUNT\(\*\) AS count FROM driver_attendance\s+WHERE driver_id = \$1 AND date = \$2 AND status = 'completed'/m,
`SELECT COUNT(*) AS count FROM trips
       WHERE driver_id = $1 AND date = $2 AND status = 'completed'`
);

content = content.replace(
/SELECT COUNT\(\*\) AS count FROM driver_attendance\s+WHERE driver_id = \$1 AND date >= \$2 AND status = 'completed'/m,
`SELECT COUNT(*) AS count FROM trips
       WHERE driver_id = $1 AND date >= $2 AND status = 'completed'`
);

fs.writeFileSync('src/modules/drivers/drivers.service.js', content, 'utf8');
console.log('Fixed DB queries');
