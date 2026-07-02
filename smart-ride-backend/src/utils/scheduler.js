const { query } = require('../config/db');
const logger = require('./logger');

const weeklyPayoutScheduler = async () => {
  try {
    logger.info('Running weeklyPayoutScheduler...');
    // 1. Find all verified active drivers
    const driversResult = await query('SELECT id, user_id, wallet_balance FROM drivers WHERE is_verified = true AND is_active = true');
    const drivers = driversResult.rows;

    let totalDriversPaid = 0;
    let totalAmountPending = 0;

    const today = new Date(); // Sunday
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - 6);
    
    const todayStr = today.toISOString().split('T')[0];
    const lastMondayStr = lastMonday.toISOString().split('T')[0];

    // 2. For each driver
    for (const driver of drivers) {
      // a. Find trips WHERE status='completed' AND date BETWEEN last Monday AND today (Sunday)
      const tripsResult = await query(`
        SELECT t.id, t.subscription_plan_id, sp.driver_amount, sp.duration_days, sp.wants_evening_return
        FROM trips t
        JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
        WHERE t.driver_id = $1 AND t.status = 'completed' AND t.date BETWEEN $2 AND $3
      `, [driver.id, lastMondayStr, todayStr]);

      const trips = tripsResult.rows;
      if (trips.length === 0) continue;

      let total_payout = 0;

      // b. For each completed trip
      for (const trip of trips) {
        // Per trip amount = subscription_plan.driver_amount / (duration_days * (wants_evening_return ? 2 : 1))
        const totalTripsInPlan = trip.duration_days * (trip.wants_evening_return ? 2 : 1);
        const perTripAmount = Number(trip.driver_amount) / totalTripsInPlan;
        total_payout += perTripAmount;
      }

      total_payout = Math.round(total_payout * 100) / 100;

      // d. If total_payout > 0
      if (total_payout > 0) {
        // INSERT into driver_payouts
        const payoutResult = await query(`
          INSERT INTO driver_payouts (driver_id, amount, status)
          VALUES ($1, $2, 'pending') RETURNING id
        `, [driver.id, total_payout]);

        // UPDATE drivers SET wallet_balance
        await query(`
          UPDATE drivers SET wallet_balance = wallet_balance + $1 WHERE id = $2
        `, [total_payout, driver.id]);

        // INSERT into platform_wallet
        await query(`
          INSERT INTO platform_wallet (driver_payout_id, amount, type, description, balance_after)
          VALUES ($1, $2, 'debit', 'Weekly driver payout', 
            COALESCE((SELECT balance_after FROM platform_wallet ORDER BY created_at DESC LIMIT 1), 0) - $2
          )
        `, [payoutResult.rows[0].id, total_payout]);

        totalDriversPaid++;
        totalAmountPending += total_payout;
      }
    }

    // 3. Notify admin
    logger.info(`Weekly payouts calculated. ${totalDriversPaid} drivers, ₹${totalAmountPending} total pending.`);
    // Get admins
    const adminsResult = await query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of adminsResult.rows) {
      await query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, 'Weekly Payouts Calculated', $2, 'system')
      `, [admin.id, `Weekly payouts calculated. ${totalDriversPaid} drivers, ₹${totalAmountPending} total pending.`]);
    }

  } catch (error) {
    logger.error('weeklyPayoutScheduler error:', error);
  }
};

const subscriptionExpiryChecker = async () => {
  try {
    logger.info('Running subscriptionExpiryChecker...');
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. UPDATE subscription_plans SET status='expired' WHERE end_date < TODAY AND status='active'
    const expiredResult = await query(`
      UPDATE subscription_plans 
      SET status = 'expired', updated_at = NOW() 
      WHERE end_date < $1 AND status = 'active'
      RETURNING id, user_id
    `, [todayStr]);

    // 2. For each expired: notify user
    for (const plan of expiredResult.rows) {
      await query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, 'Subscription Expired', 'Your subscription expired. Renew to continue.', 'subscription')
      `, [plan.user_id]);
    }

    // 3. Send renewal reminder 7 days before expiry too
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const remindResult = await query(`
      SELECT id, user_id FROM subscription_plans 
      WHERE end_date = $1 AND status = 'active'
    `, [nextWeekStr]);

    for (const plan of remindResult.rows) {
      // Avoid duplicate notifications in 24 hours
      const recentNotif = await query(`
        SELECT id FROM notifications 
        WHERE user_id = $1 AND title = 'Subscription Expiring Soon' AND created_at >= NOW() - INTERVAL '24 hours'
      `, [plan.user_id]);

      if (recentNotif.rows.length === 0) {
        await query(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES ($1, 'Subscription Expiring Soon', 'Your subscription expires in 7 days. Please renew to continue.', 'subscription')
        `, [plan.user_id]);
      }
    }

  } catch (error) {
    logger.error('subscriptionExpiryChecker error:', error);
  }
};

function initSchedulers() {
  logger.info('Initializing schedulers...');

  // Subscription Expiry Checker: Run every 24 hours
  setInterval(subscriptionExpiryChecker, 24 * 60 * 60 * 1000);
  subscriptionExpiryChecker(); // Run once on startup

  // Weekly Payout Scheduler: Run every Sunday at 11 PM
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7;
  let nextSunday11PM = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 0, 0, 0);
  
  if (now > nextSunday11PM) {
    // If it's already past 11 PM on Sunday, set to next week
    nextSunday11PM.setDate(nextSunday11PM.getDate() + 7);
  }

  const timeUntilFirstRun = nextSunday11PM.getTime() - now.getTime();

  setTimeout(() => {
    weeklyPayoutScheduler();
    // Then run every 7 days
    setInterval(weeklyPayoutScheduler, 7 * 24 * 60 * 60 * 1000);
  }, timeUntilFirstRun);
}

module.exports = {
  initSchedulers,
  weeklyPayoutScheduler,
  subscriptionExpiryChecker
};
