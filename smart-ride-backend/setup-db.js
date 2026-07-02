const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDB() {
  const defaultClient = new Client({
    connectionString: 'postgresql://postgres:Prince%40123@localhost:5432/postgres'
  });

  try {
    await defaultClient.connect();
    console.log('Connected to default database');
    
    try {
      await defaultClient.query('CREATE DATABASE smartride_new;');
      console.log('Database smartride_new created successfully.');
    } catch (err) {
      if (err.code === '42P04') {
        console.log('Database smartride_new already exists.');
      } else {
        throw err;
      }
    }
  } finally {
    await defaultClient.end();
  }

  console.log('Applying schema...');
  const targetClient = new Client({
    connectionString: 'postgresql://postgres:Prince%40123@localhost:5432/smartride_new'
  });

  try {
    await targetClient.connect();
    const schemaPath = path.join(__dirname, 'src', 'config', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await targetClient.query(schemaSql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Error applying schema:', err);
  } finally {
    await targetClient.end();
  }
}

setupDB().catch(console.error);
