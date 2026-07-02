const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@smartride.in',
      password: 'admin123'
    });
    
    const token = loginRes.data.data.token;
    
    const api = axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const res = await api.get('/admin/drivers');
    console.log('drivers data:', res.data.data);
    
    const res2 = await api.get('/admin/users', { params: { role: 'admin' } });
    console.log('users data:', res2.data.data);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
