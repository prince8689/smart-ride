/**
 * Smart Ride — Idempotent Migration Runner
 *
 * Tracks applied migrations in a `schema_migrations` table.
 * Only runs migrations that haven't been applied yet.
 * Safe to run multiple times — will never re-apply a migration.
 *
 * Usage:  node src/config/runMigrations.js
 *   or:   npm run migrate:safe
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query(
    'SELECT filename FROM schema_migrations ORDER BY filename'
  );
  return new Set(result.rows.map((r) => r.filename));
}

async function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // Alphabetical sort ensures numeric-prefix order (001, 002, ...)
  return files;
}

async function runMigrations() {
  const client = await pool.connect();

  try {
    // Ensure tracking table exists
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const allFiles = await getMigrationFiles();

    const pending = allFiles.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('✅ All migrations already applied. Nothing to do.');
      return;
    }

    console.log(`\n📦 Found ${pending.length} pending migration(s):\n`);

    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`  ▶ Running: ${file} ...`);

      // Run each migration inside its own transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  ✅ Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Failed:  ${file}`);
        console.error(`     Error:  ${err.message}`);
        throw err; // Stop on first failure
      }
    }

    console.log(`\n🎉 All ${pending.length} migration(s) applied successfully.\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run
runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n💥 Migration runner failed:', err.message);
    process.exit(1);
  });
