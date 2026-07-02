const http = require('http');

http.get('http://localhost:5000/api/admin/smart-match/8444eb6d-56a1-46ca-b0a3-e8497d0b1ff2', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('API Response:', data));
}).on('error', (err) => console.log('Error:', err.message));
