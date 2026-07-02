

const { query } = require('../../config/db');
const logger = require('../../utils/logger');

const getActivePricingConfig = async () => {
  try {
    const result = await query('SELECT * FROM pricing_config WHERE is_active = true ORDER BY created_at DESC LIMIT 1');
    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Fallback: should not happen if DB is initialized
    throw new Error('No active pricing config found');
  } catch (error) {
    logger.error('getActivePricingConfig error:', error);
    throw new Error('DB_ERROR');
  }
};

const _calculatePackagePrice = (config, distance_km, vehicle_multiplier, duration_days, discountOverride = 0, trip_type = 'round_trip') => {
  // Round trip distance (Pickup and Drop) vs One way
  const tripDistance = trip_type === 'round_trip' ? distance_km * 2 : distance_km;
  
  // Only use price_per_km as requested in the new simplified admin config
  const perDayCost = tripDistance * Number(config.price_per_km || 7) * vehicle_multiplier;

  let months = duration_days / 30;
  if (months < 1) months = 1;

  let subtotal = perDayCost * duration_days;

  const commissionPercentage = Number(config.platform_commission_percentage || 0);
  if (commissionPercentage > 0) {
    subtotal += subtotal * (commissionPercentage / 100);
  }

  // Hardcode min and max to ignore dirty database values
  const minFare = 0;
  const maxFare = Infinity;
  
  if (subtotal < minFare) subtotal = minFare;
  if (subtotal > maxFare) subtotal = maxFare;

  const discount = discountOverride > 0 ? discountOverride : Number(config.discount_percentage || 0);
  if (discount > 0) {
    subtotal = subtotal * (1 - (discount / 100));
  }

  // Force GST to 0 for the simplified pricing model
  const gstPercentage = 0;
  const gst = subtotal * (gstPercentage / 100);
  let total = subtotal + gst;

  const roundMethod = config.round_off_method || 'nearest_50';
  if (roundMethod === 'nearest_10') total = Math.round(total / 10) * 10;
  else if (roundMethod === 'nearest_50') total = Math.round(total / 50) * 50;
  else if (roundMethod === 'ceil') total = Math.ceil(total);
  else if (roundMethod === 'floor') total = Math.floor(total);
  else total = Math.round(total);

  return {
    subtotal: Math.round(subtotal),
    gst: Math.round(gst),
    total,
    duration_days,
    duration_months: months,
    savings: 0,
    savings_text: null
  };
};

const _generatePackages = (config, distance_km, vehicle_multiplier, trip_type = 'round_trip') => {
  const monthlyPkg = _calculatePackagePrice(config, distance_km, vehicle_multiplier, 30, 0, trip_type);
  // Give slight discounts for longer plans if not strictly using config discount
  const quarterlyPkg = _calculatePackagePrice(config, distance_km, vehicle_multiplier, 90, Number(config.discount_percentage || 0) + 5, trip_type);
  const halfYearlyPkg = _calculatePackagePrice(config, distance_km, vehicle_multiplier, 180, Number(config.discount_percentage || 0) + 10, trip_type);
  const yearlyPkg = _calculatePackagePrice(config, distance_km, vehicle_multiplier, 365, Number(config.discount_percentage || 0) + 15, trip_type);

  const monthlyEquivalent = monthlyPkg.total;

  quarterlyPkg.savings = Math.max(0, (monthlyEquivalent * 3) - quarterlyPkg.total);
  if (quarterlyPkg.savings > 0) quarterlyPkg.savings_text = "Save ₹" + quarterlyPkg.savings;

  halfYearlyPkg.savings = Math.max(0, (monthlyEquivalent * 6) - halfYearlyPkg.total);
  if (halfYearlyPkg.savings > 0) halfYearlyPkg.savings_text = "Save ₹" + halfYearlyPkg.savings;

  yearlyPkg.savings = Math.max(0, (monthlyEquivalent * 12) - yearlyPkg.total);
  if (yearlyPkg.savings > 0) yearlyPkg.savings_text = "Save ₹" + yearlyPkg.savings;

    return {
        monthly: monthlyPkg,
        quarterly: quarterlyPkg,
        half_yearly: halfYearlyPkg,
        yearly: yearlyPkg
    };
};

const predictPricing = async (distance_km, vehicle_type, trip_type = 'round_trip') => {
  try {
    const config = await getActivePricingConfig();
    
    // Hardcode multiplier to 1.0 to completely ignore corrupted DB multipliers
    let vehicle_multiplier = 1.0;

    const packages = _generatePackages(config, Number(distance_km), vehicle_multiplier, trip_type);

    return {
      distance_km: Number(distance_km),
      vehicle_type,
      config_id: config.id,
      packages,
      vehicle_multiplier,
      breakdown: {
        base_fare: Number(config.base_fare),
        gst_percentage: Number(config.gst_percentage),
        platform_commission: Number(config.platform_commission_percentage)
      }
    };
  } catch (error) {
    logger.error('predictPricing error:', error);
    throw new Error('CALCULATION_FAILED');
  }
};

const calculatePricing = async (distance_km, vehicle_type, trip_type = 'round_trip') => {
  return await predictPricing(distance_km, vehicle_type, trip_type);
};

const calculateSamplePricing = async (configData) => {
  try {
    const config = { ...configData };
    const distance_km = 15; // sample distance

    const multipliers = typeof config.vehicle_multipliers === 'string' 
      ? JSON.parse(config.vehicle_multipliers) 
      : (config.vehicle_multipliers || { "hatchback": 1.0, "sedan": 1.3, "suv": 1.8 });

    const standard = _calculatePackagePrice(config, distance_km, multipliers['hatchback'] || 1.0, 30);

    return {
      option1: { name: 'Standard Commute', price: standard.total, duration: 'Month' }
    };
  } catch (error) {
    logger.error('calculateSamplePricing error:', error);
    throw new Error('CALCULATION_FAILED');
  }
};

const updatePricingConfig = async (adminId, data) => {
  try {
    await query('UPDATE pricing_config SET is_active = false WHERE is_active = true');

    const fields = [
      'base_fare', 'fuel_price', 'diesel_price', 'price_per_km',
      'platform_commission_percentage', 'platform_fixed_fee', 'vehicle_maintenance_charge',
      'driver_incentive', 'service_charge', 'gst_percentage', 'peak_hour_charge',
      'night_charge', 'traffic_charge', 'waiting_charge', 'minimum_fare',
      'maximum_fare', 'discount_percentage', 'round_off_method', 'vehicle_multipliers',
      'updated_by', 'is_active', 'admin_upi_id'
    ];

    const values = [
      data.base_fare || 0, data.fuel_price || 0, data.diesel_price || 0, data.price_per_km || 0,
      data.platform_commission_percentage || 0, data.platform_fixed_fee || 0, data.vehicle_maintenance_charge || 0,
      data.driver_incentive || 0, data.service_charge || 0, data.gst_percentage || 0, data.peak_hour_charge || 0,
      data.night_charge || 0, data.traffic_charge || 0, data.waiting_charge || 0, data.minimum_fare || 0,
      data.maximum_fare || 100000, data.discount_percentage || 0, data.round_off_method || 'nearest_50',
      data.vehicle_multipliers ? JSON.stringify(data.vehicle_multipliers) : '{"sedan":1.0,"suv":1.3,"hatchback":0.9,"van":1.5}',
      adminId, true, data.admin_upi_id || ''
    ];

    const placeholders = values.map((_, i) => '$' + (i + 1)).join(', ');

    const result = await query(`
      INSERT INTO pricing_config (
        ${fields.join(', ')}
      ) VALUES (${placeholders})
      RETURNING *
    `, values);

    return result.rows[0];
  } catch (error) {
    logger.error('updatePricingConfig error:', error);
    throw new Error('DB_ERROR');
  }
};

const getPricingHistory = async () => {
  try {
    const result = await query('SELECT * FROM pricing_config ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    logger.error('getPricingHistory error:', error);
    throw new Error('DB_ERROR');
  }
};

module.exports = {
  getActivePricingConfig,
  calculatePricing,
  predictPricing,
  calculateSamplePricing,
  updatePricingConfig,
  getPricingHistory
};

