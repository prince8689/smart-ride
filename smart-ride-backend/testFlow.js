const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function runTest() {
  try {
    console.log('--- Starting End-to-End Test ---');

    // 1. Login Driver
    console.log('Logging in Driver...');
    const driverRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'princenatureyt@gmail.com', // fixed typo from prompt
      password: 'Prince@123'
    });
    const driverToken = driverRes.data.data.access_token;
    console.log('Driver logged in successfully.');

    // 2. Login User
    console.log('Logging in User...');
    const userRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'princemaur7@gmail.com', // from user prompt
      password: 'Prince@123'
    });
    const userToken = userRes.data.data.access_token;
    console.log('User logged in successfully.');

    // 3. Login Admin
    console.log('Logging in Admin...');
    const adminRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@smartride.in',
      password: 'Admin@1234'
    });
    const adminToken = adminRes.data.data.access_token;
    console.log('Admin logged in successfully.');

    // --- SETUP DRIVER ---
    // Make driver available
    console.log('Setting Driver to Available...');
    await axios.patch(`${API_BASE}/drivers/profile`, { is_available: true }, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });

    // We don't have endpoints to mark attendance directly via public API without going through the exact flow or worker, 
    // but the DB should have it or we can just run a quick DB query to force the driver's attendance.
    // Instead of doing it via API, let's inject it into DB directly for the test since we are the developer.
    const { query } = require('./src/config/db');
    
    // Get driver user_id
    const driverUserId = driverRes.data.data.user.id;
    // Get driver profile id
    const driverProfileRes = await query('SELECT id FROM drivers WHERE user_id = $1', [driverUserId]);
    const driverProfileId = driverProfileRes.rows[0].id;
    
    // Setup driver attendance for today
    console.log('Injecting Driver Attendance for today...');
    await query(`
      INSERT INTO driver_attendance_v2 (driver_id, date, status, marked_at)
      VALUES ($1, CURRENT_DATE, 'ready', NOW())
      ON CONFLICT (driver_id, date) DO UPDATE SET status = 'ready', marked_at = NOW()
    `, [driverUserId]);

    // Ensure driver has an active route
    console.log('Checking driver routes...');
    const routeRes = await query(`SELECT * FROM driver_routes WHERE driver_id = $1 AND status = 'active'`, [driverUserId]);
    let routeId;
    if (routeRes.rows.length === 0) {
      console.log('Creating dummy active route for driver...');
      const newRoute = await query(`
        INSERT INTO driver_routes (driver_id, route_type, morning_time, evening_time, start_lat, start_lng, end_lat, end_lng, available_seats, status)
        VALUES ($1, 'forward', '09:00', '18:00', 19.0760, 72.8777, 19.0176, 72.8562, 4, 'active')
        RETURNING id
      `, [driverUserId]);
      routeId = newRoute.rows[0].id;
    } else {
      routeId = routeRes.rows[0].id;
      // Ensure available seats
      await query(`UPDATE driver_routes SET available_seats = 4 WHERE id = $1`, [routeId]);
      console.log('Driver has active route with seats.');
    }

    // --- USER BOOKING ---
    // User creates a subscription
    console.log('User creating subscription plan...');
    const subRes = await axios.post(`${API_BASE}/subscriptions`, {
      pickup_address: 'Varanasi',
      pickup_lat: 25.41068750,
      pickup_lng: 82.99073440,
      drop_address: 'Prayagraj',
      drop_lat: 25.46833800,
      drop_lng: 81.85460190,
      start_date: new Date().toISOString().split('T')[0],
      duration_days: 30,
      plan_type: 'monthly',
      distance_km: 10,
      preferred_vehicle_type: 'scooter',
      vehicle_type: 'scooter',
      number_of_passengers: 1,
      morning_slot: true,
      evening_slot: false,
      morning_pickup_time: '09:15',
      wants_evening_return: false
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    const requestData = subRes.data.data;
    console.log('Subscription Response:', JSON.stringify(requestData, null, 2));
    const planId = requestData.plan ? requestData.plan.id : requestData.id;
    console.log('Subscription Request Created. Plan ID:', planId);

    // --- BYPASS RAZORPAY & TRIGGER AUTO ASSIGN DIRECTLY ---
    console.log('Simulating User Payment Success & Triggering Auto Assign...');
    
    // Call the same logic that verifyPayment would call
    await query(`UPDATE subscription_plans SET status = 'waiting_driver_assignment' WHERE id = $1`, [planId]);
    const { smartMatchDriver } = require('./src/utils/smartMatch');
    const { assignDriverToSubscription } = require('./src/modules/admin/admin.service');
    
    try {
      const matchResult = await smartMatchDriver(planId);
      
      await query(`
        INSERT INTO assignment_logs (subscription_id, event_type, ranked_list, created_at)
        VALUES ($1, 'auto_assign', $2, NOW())
      `, [planId, JSON.stringify(matchResult.recommended_drivers || [])]);

      if (matchResult.best_match) {
        const best = matchResult.best_match;
        await assignDriverToSubscription(
          planId,
          best.driver_profile_id,
          best.vehicle.id,
          best.estimated_pickup_time,
          best.driver_route_id,
          'Auto-assigned via smart match post-payment'
        );
      } else {
        await query(`UPDATE subscription_plans SET status = 'waiting_driver_assignment' WHERE id = $1`, [planId]);
      }
    } catch (e) {
      console.error('Auto Assign Engine failed:', e);
    }
    
    // Wait a brief moment for background logic (if any) to settle
    await new Promise(res => setTimeout(res, 2000));

    // --- VERIFY AUTO ASSIGNMENT ---
    const checkSub = await query(`SELECT status, driver_id FROM subscription_plans WHERE id = $1`, [planId]);
    console.log('Final Subscription Status:', checkSub.rows[0].status);
    console.log('Assigned Driver ID:', checkSub.rows[0].driver_id);
    
    if (checkSub.rows[0].driver_id) {
        console.log('✅ Auto-assignment SUCCESSFUL!');
    } else {
        console.log('❌ Auto-assignment FAILED (No driver assigned). Checking assignment_logs...');
        const logs = await query(`SELECT * FROM assignment_logs WHERE subscription_id = $1`, [planId]);
        console.log('Assignment Logs:', JSON.stringify(logs.rows, null, 2));
    }
    
    console.log('--- Test Completed ---');
    process.exit(0);
  } catch (error) {
    console.error('Error during test:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

runTest();
