const bcrypt = require('bcryptjs');
const { query, pool } = require('./db');
const logger = require('../utils/logger');

const seedDB = async () => {
  try {
    logger.info('Starting database seeding...');
    const salt = await bcrypt.genSalt(12);

    // 1. Create admin
    const checkAdmin = await query("SELECT id FROM users WHERE email='admin@smartride.in'");
    if (checkAdmin.rows.length === 0) {
      const adminPass = await bcrypt.hash('Admin@1234', salt);
      await query(`
        INSERT INTO users (full_name, email, phone, password_hash, is_email_verified, is_phone_verified, role)
        VALUES ('System Admin', 'admin@smartride.in', '9000000000', $1, true, true, 'admin')
      `, [adminPass]);
      logger.info('Created Admin: admin@smartride.in / Admin@1234');
    } else {
      logger.info('Admin already exists, skipping.');
    }

    // 2. Create 2 test users
    const userPass = await bcrypt.hash('User@1234', salt);
    const users = [
      { name: 'Test User 1', email: 'user1@test.in', phone: '9000000001' },
      { name: 'Test User 2', email: 'user2@test.in', phone: '9000000002' }
    ];

    for (const u of users) {
      const checkUser = await query("SELECT id FROM users WHERE email=$1", [u.email]);
      if (checkUser.rows.length === 0) {
        await query(`
          INSERT INTO users (full_name, email, phone, password_hash, is_email_verified, is_phone_verified, role)
          VALUES ($1, $2, $3, $4, true, true, 'user')
        `, [u.name, u.email, u.phone, userPass]);
        logger.info(`Created User: ${u.email} / User@1234`);
      } else {
        logger.info(`User ${u.email} already exists, skipping.`);
      }
    }

    // 3. Create 2 test drivers
    const driverPass = await bcrypt.hash('Driver@1234', salt);
    const drivers = [
      { name: 'Test Driver 1', email: 'driver1@test.in', phone: '9000000003', license: 'DL-11111', aadhar: '111111111111' },
      { name: 'Test Driver 2', email: 'driver2@test.in', phone: '9000000004', license: 'DL-22222', aadhar: '222222222222' }
    ];

    for (const [index, d] of drivers.entries()) {
      const checkDriverUser = await query("SELECT id FROM users WHERE email=$1", [d.email]);
      let userId;
      if (checkDriverUser.rows.length === 0) {
        const result = await query(`
          INSERT INTO users (full_name, email, phone, password_hash, is_email_verified, is_phone_verified, role)
          VALUES ($1, $2, $3, $4, true, true, 'driver') RETURNING id
        `, [d.name, d.email, d.phone, driverPass]);
        userId = result.rows[0].id;
        logger.info(`Created Driver User: ${d.email} / Driver@1234`);
      } else {
        userId = checkDriverUser.rows[0].id;
        logger.info(`Driver User ${d.email} already exists, skipping user creation.`);
      }

      // 4. Create driver profile
      const checkDriverProfile = await query("SELECT id FROM drivers WHERE user_id=$1", [userId]);
      let driverId;
      if (checkDriverProfile.rows.length === 0) {
        const dResult = await query(`
          INSERT INTO drivers (user_id, license_number, license_expiry, aadhar_number, is_verified, is_available)
          VALUES ($1, $2, '2030-12-31', $3, true, true) RETURNING id
        `, [userId, d.license, d.aadhar]);
        driverId = dResult.rows[0].id;
        logger.info(`Created Verified Driver Profile for ${d.email}`);
      } else {
        driverId = checkDriverProfile.rows[0].id;
        logger.info(`Driver Profile for ${d.email} already exists, skipping.`);
      }

      // 5. Create vehicle
      const checkVehicle = await query("SELECT id FROM vehicles WHERE driver_id=$1", [driverId]);
      if (checkVehicle.rows.length === 0) {
        const vehicleNumber = `HR-26-XX-${1000 + index}`;
        const type = index === 0 ? 'sedan' : 'suv';
        await query(`
          INSERT INTO vehicles (driver_id, vehicle_number, vehicle_type, brand, model, year, color, seating_capacity, is_active)
          VALUES ($1, $2, $3, 'Test Brand', 'Test Model', 2022, 'White', 4, true)
        `, [driverId, vehicleNumber, type]);
        logger.info(`Created ${type} Vehicle ${vehicleNumber} for ${d.email}`);
      } else {
        logger.info(`Vehicle for ${d.email} already exists, skipping.`);
      }
    }

    logger.info('Database seeding completed successfully.');
  } catch (error) {
    logger.error('Error seeding database:', error);
  } finally {
    pool.end();
  }
};

seedDB();
