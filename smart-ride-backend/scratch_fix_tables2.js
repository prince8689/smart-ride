const { query, pool } = require('./src/config/db');

async function fixTables() {
  try {
    console.log('Adding missing V1 columns to payments and complaints...');
    await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS subscription_id UUID;`);
    await query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS subscription_id UUID;`);
    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

fixTables();
