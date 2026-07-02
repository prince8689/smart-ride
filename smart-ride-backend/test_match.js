const { query } = require('./src/config/db');
const smartMatch = require('./src/utils/smartMatch');

async function test() {
  const plan = await query("SELECT id FROM subscription_plans WHERE user_id = (SELECT id FROM users WHERE full_name = 'VNS Prince' LIMIT 1) LIMIT 1");
  const result = await smartMatch.smartMatchDriver(plan.rows[0].id);
  console.log('Match Result:', JSON.stringify(result, null, 2));
  process.exit();
}
test();
