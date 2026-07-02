const fs = require('fs');
let c = fs.readFileSync('src/modules/ratings/ratings.service.js', 'utf8');

c = c.replace(/INSERT INTO driver_ratings/g, 'INSERT INTO reviews');
c = c.replace(/driver_profile_id/g, 'driver_id');
c = c.replace(/driver_ratings/g, 'reviews');
c = c.replace(/user_subscriptions/g, 'subscription_plans');
c = c.replace(/subscription_id = \$1/g, 'subscription_plan_id = $1');

// Fix getUserRatings join from driver_profiles dp to drivers d (wait, reviews has driver_id, we can join with driver_profiles directly since driver_profiles still exists)
// Actually, `driver_id` in reviews points to `driver_profiles.id` or `drivers.id`? Since driver_profiles exists, let's keep the join on driver_profiles for now, just change dr.driver_profile_id to dr.driver_id.
c = c.replace(/JOIN driver_profiles dp ON dr\.driver_profile_id = dp\.id/, 'JOIN driver_profiles dp ON dr.driver_id = dp.id');

fs.writeFileSync('src/modules/ratings/ratings.service.js', c, 'utf8');
console.log('Fixed ratings service');
