const { query } = require('./src/config/db');

async function clearData() {
  try {
    console.log('Clearing all transactional data, users, and drivers...');
    
    // Using TRUNCATE CASCADE on users will wipe out everything referencing users:
    // drivers, vehicles, subscription_plans, trips, payments, platform_wallet, notifications
    await query(`
      TRUNCATE TABLE 
        users,
        drivers,
        vehicles,
        subscription_plans,
        trips,
        payments,
        platform_wallet,
        notifications
      RESTART IDENTITY CASCADE;
    `);
    
    console.log('All dummy data cleared successfully! Database is completely fresh.');
    process.exit(0);
  } catch (e) {
    console.error('Error clearing data:', e);
    process.exit(1);
  }
}

clearData();
