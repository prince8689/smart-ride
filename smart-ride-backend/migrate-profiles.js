const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Prince%40123@localhost:5432/smart_ride_db' 
});

async function run() {
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE driver_profiles 
      ADD COLUMN IF NOT EXISTS pan_card_number VARCHAR(20) UNIQUE,
      ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS experience_years INTEGER,
      ADD COLUMN IF NOT EXISTS pan_card_image TEXT,
      ADD COLUMN IF NOT EXISTS license_image TEXT,
      ADD COLUMN IF NOT EXISTS aadhar_image TEXT;
    `);
    console.log('Successfully added new columns to driver_profiles');
  } catch (err) {
    console.error('Error adding columns:', err);
  } finally {
    await client.end();
  }
}

run();
