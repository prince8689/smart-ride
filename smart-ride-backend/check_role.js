const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Prince%40123@localhost:5432/smartride_new' });

async function checkConstraint() {
  await client.connect();
  try {
    const r = await client.query(`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'users_role_check'`);
    console.log(r.rows);
  } finally {
    await client.end();
  }
}

checkConstraint();
