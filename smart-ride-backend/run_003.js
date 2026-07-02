const { query } = require('./src/config/db');
const fs = require('fs');

async function run() {
  try {
    await query('DROP TABLE IF EXISTS assignment_logs CASCADE;');
    const sql = fs.readFileSync('./src/config/migrations/003_assignment_logs.sql', 'utf8');
    await query(sql);
    console.log('Migration 003 applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
