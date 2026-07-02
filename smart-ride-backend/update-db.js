const { Client } = require('pg');

const client = new Client({ 
  connectionString: 'postgresql://postgres:Prince%40123@localhost:5432/smart_ride_db' 
});

async function run() {
  await client.connect();
  try {
    await client.query(`ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check`);
    console.log("Dropped constraint successfully.");
    
    const types = ['bike', 'scooter', 'auto', 'car', 'sedan', 'suv', 'hatchback', 'van', 'mini_bus', 'bus', 'truck'];
    await client.query(`ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check CHECK (vehicle_type IN (${types.map(t => `'${t}'`).join(', ')}))`);
    console.log("Added new constraint successfully.");
  } catch(e) {
    console.error(e);
  }
  await client.end();
}

run();
