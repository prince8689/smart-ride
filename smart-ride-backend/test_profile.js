const { query } = require('./src/config/db');
async function test() {
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('Test@123', salt);
  const res = await query('INSERT INTO users (full_name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id', ['New Driver', 'newdriver99@test.in', '8888888888', hash, 'driver']);
  const id = res.rows[0].id;
  const token = require('jsonwebtoken').sign({id, role:'driver'}, 'your_super_secret_jwt_key_change_this_in_production');
  fetch('http://127.0.0.1:5000/api/users/profile', {headers: {Authorization: 'Bearer ' + token}}).then(r=>r.text()).then(t => {console.log('Profile:', t); process.exit(0)}).catch(console.error);
}
test();
