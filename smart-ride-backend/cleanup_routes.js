const { query } = require('./src/config/db');

async function fix() {
  try {
    const res = await query(`
      UPDATE driver_routes 
      SET status = 'inactive' 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER(PARTITION BY driver_id ORDER BY created_at DESC) as rn 
          FROM driver_routes 
          WHERE status = 'active'
        ) t WHERE rn = 1
      ) AND status = 'active';
    `);
    console.log(`Updated ${res.rowCount} rows`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

fix();
