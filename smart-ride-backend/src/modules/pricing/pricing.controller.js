const pricingService = require('./pricing.service');
const { successResponse, errorResponse } = require('../../utils/response');

const calculatePricing = async (req, res) => {
  try {
    const { distance_km, vehicle_type, trip_type } = req.query;

    if (!distance_km || isNaN(distance_km) || Number(distance_km) <= 0) {
      return errorResponse(res, 'Valid distance_km is required', 400);
    }

    const validVehicles = ['sedan', 'suv', 'hatchback', 'van', 'mini_bus', 'bus'];
    if (!vehicle_type || !validVehicles.includes(vehicle_type)) {
      return errorResponse(res, 'Valid vehicle_type is required', 400);
    }

    const result = await pricingService.calculatePricing(Number(distance_km), vehicle_type, trip_type || 'round_trip');
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, 'Failed to calculate pricing', 500);
  }
};

const calculateSamplePricing = async (req, res) => {
  try {
    const data = req.body;
    const result = await pricingService.calculateSamplePricing(data);
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, 'Failed to calculate sample pricing', 500);
  }
};

const getPricingConfig = async (req, res) => {
  try {
    const config = await pricingService.getActivePricingConfig();
    return successResponse(res, config);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch pricing config', 500);
  }
};

const updatePricingConfig = async (req, res) => {
  try {
    const data = req.body;
    const { admin_upi_id } = data;
    
    if (data.price_per_km === undefined) {
      return errorResponse(res, `Missing required field: price_per_km`, 400);
    }

    if (data.gst_percentage < 0 || data.gst_percentage > 30) {
      return errorResponse(res, 'GST must be between 0 and 30', 400);
    }

    if (data.platform_commission_percentage < 0 || data.platform_commission_percentage > 50) {
      return errorResponse(res, 'Platform commission must be between 0 and 50', 400);
    }

    if (!admin_upi_id || !admin_upi_id.includes('@')) {
      return errorResponse(res, 'Valid admin_upi_id is required', 400);
    }

    const config = await pricingService.updatePricingConfig(req.user.id, data);
    return successResponse(res, config, 'Pricing configuration updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update pricing config', 500);
  }
};

const getPricingHistory = async (req, res) => {
  try {
    const history = await pricingService.getPricingHistory();
    return successResponse(res, history);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch pricing history', 500);
  }
};

module.exports = {
  calculatePricing,
  calculateSamplePricing,
  getPricingConfig,
  updatePricingConfig,
  getPricingHistory
};
