// ========== FILE: src/modules/v2/pricing/pricing.v2.controller.js ==========
const { successResponse, errorResponse } = require('../../../utils/response');
const logger = require('../../../utils/logger');
const { calculateSubscriptionPrice } = require('../../../services/pricingEngine');

const calculatePrice = async (req, res) => {
  try {
    const { distanceKm, vehicleType, roadType, pickupTime, trafficLevel } = req.body;

    if (!distanceKm || !vehicleType) {
      return errorResponse(res, 'distanceKm and vehicleType are required', 400);
    }

    if (distanceKm <= 0 || distanceKm > 200) {
      return errorResponse(res, 'distanceKm must be between 0 and 200', 400);
    }

    const result = await calculateSubscriptionPrice({
      distanceKm: parseFloat(distanceKm),
      vehicleType,
      roadType,
      pickupTime,
      trafficLevel,
    });

    return successResponse(res, result, 'Pricing calculated successfully');
  } catch (error) {
    if (error.message === 'PRICING_RULE_NOT_FOUND') {
      return errorResponse(res, 'No pricing rule found for this vehicle type', 404);
    }
    logger.error('calculatePrice error:', error);
    return errorResponse(res, 'Failed to calculate pricing', 500);
  }
};

module.exports = { calculatePrice };
// ========== END ==========
