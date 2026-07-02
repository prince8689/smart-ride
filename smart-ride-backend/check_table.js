const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    // Check which tables exist
    const res = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('drivers', 'driver_profiles')
      ORDER BY table_name
    `);
    console.log('Tables found:', res.rows.map(r => r.table_name));

    // Check columns of whichever driver table exists
    for (const row of res.rows) {
      const cols = await pool.query(`
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = $1 ORDER BY ordinal_position
      `, [row.table_name]);
      console.log(`\nColumns in ${row.table_name}:`);
      cols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
check();
