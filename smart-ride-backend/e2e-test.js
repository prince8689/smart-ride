// ========== FILE: e2e-test.js ==========
const axios = require('axios');
require('dotenv').config({ path: './src/config/.env' }); // or pass as param

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

const USERS = {
  admin: { email: 'admin@smartride.in', password: 'Admin@1234' },
  commuter: { email: 'user1@test.in', password: 'User@1234' },
  driver: { email: 'driver1@test.in', password: 'Driver@1234' }
};

let tokens = { admin: '', commuter: '', driver: '' };
let passCount = 0;
let failCount = 0;

const logRes = (name, res) => {
  console.log(`✅ [PASS] ${name} (${res.status} - ${res.statusText})`);
  passCount++;
};

const logErr = (name, err) => {
  console.error(`❌ [FAIL] ${name}`);
  console.error(`   Error: ${err.response ? err.response.data.message || err.response.statusText : err.message}`);
  failCount++;
};

async function testEndpoint(name, method, endpoint, data = null, role = null) {
  try {
    const headers = role ? { Authorization: `Bearer ${tokens[role]}` } : {};
    const start = Date.now();
    const res = await axios({ method, url: `${API_URL}${endpoint}`, data, headers });
    const duration = Date.now() - start;
    console.log(`✅ [PASS] ${name} (${duration}ms)`);
    passCount++;
    return res.data;
  } catch (err) {
    logErr(name, err);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Smart Ride E2E API Tests...\n');

  // 1. Health
  await testEndpoint('Health Check', 'GET', '/health');

  // 2. Auth (Login)
  const adminLogin = await testEndpoint('Admin Login', 'POST', '/auth/login', USERS.admin);
  if (adminLogin) tokens.admin = adminLogin.data.token;

  const commuterLogin = await testEndpoint('Commuter Login', 'POST', '/auth/login', USERS.commuter);
  if (commuterLogin) tokens.commuter = commuterLogin.data.token;

  const driverLogin = await testEndpoint('Driver Login', 'POST', '/auth/login', USERS.driver);
  if (driverLogin) tokens.driver = driverLogin.data.token;

  if (!tokens.admin || !tokens.commuter || !tokens.driver) {
    console.error('❌ Authentication failed. Cannot continue protected routes tests.');
    return;
  }

  // 3. User Routes (Commuter)
  await testEndpoint('Get Profile (Commuter)', 'GET', '/users/profile', null, 'commuter');
  await testEndpoint('Get User Subscriptions', 'GET', '/users/subscriptions', null, 'commuter');
  await testEndpoint('Get User Payments', 'GET', '/users/payments', null, 'commuter');
  await testEndpoint('Get User Notifications', 'GET', '/users/notifications', null, 'commuter');
  await testEndpoint('Get User Complaints', 'GET', '/users/complaints', null, 'commuter');

  // 4. Driver Routes
  await testEndpoint('Get Driver Profile', 'GET', '/drivers/profile', null, 'driver');
  await testEndpoint('Get Driver Passengers', 'GET', '/drivers/passengers', null, 'driver');
  await testEndpoint('Get Driver Attendance', 'GET', '/drivers/attendance', null, 'driver');

  // 5. Admin Routes
  await testEndpoint('Get Admin Dashboard Stats', 'GET', '/admin/dashboard', null, 'admin');
  await testEndpoint('Get Admin System Health', 'GET', '/admin/analytics/health', null, 'admin');
  await testEndpoint('Get All Users (Admin)', 'GET', '/admin/users', null, 'admin');
  await testEndpoint('Get All Drivers (Admin)', 'GET', '/admin/drivers', null, 'admin');
  await testEndpoint('Get All Subscriptions (Admin)', 'GET', '/admin/subscriptions', null, 'admin');
  
  // 6. Public Routes
  await testEndpoint('Get Subscription Plans', 'GET', '/subscriptions/plans');
  await testEndpoint('Get Routes', 'GET', '/routes');

  // 7. Security Check (Role mismatch)
  try {
    await axios.get(`${API_URL}/admin/dashboard`, { headers: { Authorization: `Bearer ${tokens.commuter}` } });
    logErr('Security: Commuter accessing Admin route', { message: 'Should have been forbidden' });
  } catch (err) {
    if (err.response && (err.response.status === 403 || err.response.status === 401)) {
      console.log(`✅ [PASS] Security: Commuter rejected from Admin route (403/401)`);
      passCount++;
    } else {
      logErr('Security: Commuter accessing Admin route', err);
    }
  }

  console.log('\n📊 Test Summary');
  console.log(`   Passed: ${passCount}`);
  console.log(`   Failed: ${failCount}`);
  
  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
// ========== END ==========
