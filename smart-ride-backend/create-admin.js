const { query } = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    const passwordHash = await bcrypt.hash('Admin@1234', 12);
    
    await query(`
      INSERT INTO users (full_name, email, phone, password_hash, role, is_active, is_email_verified, is_phone_verified)
      VALUES ('System Admin', 'admin@smartride.in', '9000000000', $1, 'admin', true, true, true)
    `, [passwordHash]);
    
    console.log('Admin user CREATED successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
