const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:Prince%40123@localhost:5432/smartride_new' });
c.connect().then(() => {
  c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`).then(r => {
    console.log(r.rows);
    c.end();
  });
});
