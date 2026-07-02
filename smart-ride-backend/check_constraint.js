const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Prince%40123@localhost:5432/smartride_new'
});

async function run() {
  try {
    const client = await pool.connect();
    const res = await client.query(`SELECT pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'vehicles_vehicle_type_check'));`);
    console.log('Constraint:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('Error', err);
  } finally {
    pool.end();
  }
}

run();
