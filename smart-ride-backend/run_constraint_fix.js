const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Prince%40123@localhost:5432/smartride_new'
});

async function run() {
  try {
    const client = await pool.connect();
    
    await client.query(`
      ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
      ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check CHECK (vehicle_type IN ('bike','scooter','auto','car','sedan','suv','hatchback','van','mini_bus','bus','truck'));
    `);
    
    console.log('Constraint updated successfully!');
    client.release();
  } catch (err) {
    console.error('Error', err);
  } finally {
    pool.end();
  }
}

run();
