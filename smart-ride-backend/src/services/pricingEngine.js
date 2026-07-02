// ========== FILE: src/services/pricingEngine.js ==========
const { query } = require('../config/db');
const logger = require('../utils/logger');

// Optional Redis — graceful degradation if unavailable
let redisClient = null;
try {
  const Redis = require('ioredis');
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1000)),
    lazyConnect: true,
  });
  redisClient.connect().catch(() => {
    logger.warn('Redis not available for pricingEngine — caching disabled');
    redisClient = null;
  });
} catch (e) {
  logger.warn('ioredis not installed — pricingEngine caching disabled');
}

/**
 * Detect if a given time string falls within peak hours.
 * Morning peak: 7AM–10AM, Evening peak: 5PM–8PM
 * @param {string} pickupTime - HH:mm or HH:mm:ss format
 * @returns {boolean}
 */
const isPeakHour = (pickupTime) => {
  if (!pickupTime) return false;
  const parts = pickupTime.split(':');
  const hour = parseInt(parts[0], 10);
  // Morning peak: 7–9 (i.e. 07:00–09:59)
  if (hour >= 7 && hour <= 9) return true;
  // Evening peak: 17–19 (i.e. 17:00–19:59)
  if (hour >= 17 && hour <= 19) return true;
  return false;
};

/**
 * Get traffic multiplier based on traffic level.
 * @param {object} rule - pricing_rules row
 * @param {string} trafficLevel - 'light' | 'moderate' | 'heavy'
 * @returns {number}
 */
const getTrafficMultiplier = (rule, trafficLevel) => {
  switch (trafficLevel) {
    case 'heavy':
      return parseFloat(rule.traffic_heavy_multiplier) || 1.3;
    case 'moderate':
      return parseFloat(rule.traffic_moderate_multiplier) || 1.15;
    case 'light':
    default:
      return parseFloat(rule.traffic_light_multiplier) || 1.0;
  }
};

/**
 * Calculate subscription pricing for all plan durations.
 *
 * @param {object} params
 * @param {number} params.distanceKm - one-way distance in km
 * @param {string} params.vehicleType - sedan | suv | minivan | bus
 * @param {string} [params.roadType] - reserved for future use
 * @param {string} [params.pickupTime] - HH:mm format
 * @param {string} [params.trafficLevel] - light | moderate | heavy
 * @returns {object} { plans, breakdown }
 */
const calculateSubscriptionPrice = async ({ distanceKm, vehicleType, roadType, pickupTime, trafficLevel = 'light' }) => {
  // 1. Build cache key & check Redis
  const cacheKey = `pricing:${vehicleType}:${distanceKm}:${pickupTime || 'none'}:${trafficLevel}`;
  if (redisClient) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug('pricingEngine cache hit', { cacheKey });
        return JSON.parse(cached);
      }
    } catch (e) {
      // Redis read error — proceed without cache
    }
  }

  // 2. Fetch pricing rule for vehicleType
  const ruleResult = await query(
    'SELECT * FROM pricing_rules WHERE vehicle_type = $1 AND is_active = true LIMIT 1',
    [vehicleType]
  );
  if (ruleResult.rows.length === 0) {
    throw new Error('PRICING_RULE_NOT_FOUND');
  }
  const rule = ruleResult.rows[0];

  // 3. Multipliers
  const peakMultiplier = isPeakHour(pickupTime)
    ? parseFloat(rule.peak_hour_multiplier)
    : 1.0;
  const trafficMultiplier = getTrafficMultiplier(rule, trafficLevel);

  // 4. Calculate base cost (round trip = *2)
  const basePricePerKm = parseFloat(rule.base_price_per_km);
  const fuelCostPerKm = parseFloat(rule.fuel_cost_per_km);
  const baseCost = (basePricePerKm + fuelCostPerKm) * distanceKm * 2;

  // 5. Adjusted cost
  const adjustedCost = baseCost * peakMultiplier * trafficMultiplier;

  // 6. Commission
  const commissionPercent = parseFloat(rule.platform_commission_percent);
  const commission = adjustedCost * (commissionPercent / 100);
  const dailyCostWithCommission = adjustedCost + commission;

  // 7. Working days
  const workingDays = parseInt(rule.working_days_per_month, 10);

  // 8. Monthly price (rounded to nearest 10)
  const monthlyRaw = dailyCostWithCommission * workingDays;
  const monthlyPrice = Math.round(monthlyRaw / 10) * 10;

  // 9. Discount percentages
  const quarterlyDiscount = parseFloat(rule.quarterly_discount_percent) / 100;
  const halfYearlyDiscount = parseFloat(rule.half_yearly_discount_percent) / 100;
  const yearlyDiscount = parseFloat(rule.yearly_discount_percent) / 100;

  // 10. Plan prices
  const quarterlyPrice = Math.round((monthlyPrice * 3 * (1 - quarterlyDiscount)) / 10) * 10;
  const halfYearlyPrice = Math.round((monthlyPrice * 6 * (1 - halfYearlyDiscount)) / 10) * 10;
  const yearlyPrice = Math.round((monthlyPrice * 12 * (1 - yearlyDiscount)) / 10) * 10;

  // 11. Savings calculations
  const quarterlySavings = (monthlyPrice * 3) - quarterlyPrice;
  const halfYearlySavings = (monthlyPrice * 6) - halfYearlyPrice;
  const yearlySavings = (monthlyPrice * 12) - yearlyPrice;

  const result = {
    plans: {
      monthly: {
        price: monthlyPrice,
        duration_months: 1,
        savings: 0,
        savings_percent: 0,
      },
      quarterly: {
        price: quarterlyPrice,
        duration_months: 3,
        savings: quarterlySavings,
        savings_percent: parseFloat(((quarterlySavings / (monthlyPrice * 3)) * 100).toFixed(1)),
      },
      half_yearly: {
        price: halfYearlyPrice,
        duration_months: 6,
        savings: halfYearlySavings,
        savings_percent: parseFloat(((halfYearlySavings / (monthlyPrice * 6)) * 100).toFixed(1)),
      },
      yearly: {
        price: yearlyPrice,
        duration_months: 12,
        savings: yearlySavings,
        savings_percent: parseFloat(((yearlySavings / (monthlyPrice * 12)) * 100).toFixed(1)),
      },
    },
    breakdown: {
      base_cost: parseFloat(baseCost.toFixed(2)),
      commission: parseFloat(commission.toFixed(2)),
      peak_adjustment: peakMultiplier,
      traffic_adjustment: trafficMultiplier,
      daily_cost: parseFloat(dailyCostWithCommission.toFixed(2)),
      working_days_per_month: workingDays,
      distance_km: distanceKm,
      vehicle_type: vehicleType,
    },
  };

  // 12. Cache in Redis for 1 hour
  if (redisClient) {
    try {
      await redisClient.setex(cacheKey, 3600, JSON.stringify(result));
    } catch (e) {
      // Redis write error — ignore
    }
  }

  return result;
};

module.exports = {
  calculateSubscriptionPrice,
  isPeakHour,
};
// ========== END ==========
