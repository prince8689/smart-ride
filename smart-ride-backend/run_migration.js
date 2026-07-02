const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Prince%40123@localhost:5432/smartride_new'
});

async function run() {
  try {
    const client = await pool.connect();
    await client.query(`
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS pan_card_number VARCHAR(50) UNIQUE;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS pan_card_image TEXT;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_image TEXT;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS aadhar_image TEXT;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN DEFAULT false;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);
    console.log('Migration successful!');
    client.release();
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    pool.end();
  }
}

run();
