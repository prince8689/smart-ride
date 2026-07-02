const { smartMatchDriver } = require('../../utils/smartMatch');
const { successResponse, errorResponse } = require('../../utils/response');

exports.getSmartMatch = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    
    if (!subscriptionId) {
      return errorResponse(res, 'Subscription ID is required', 400);
    }

    const matchData = await smartMatchDriver(subscriptionId);
    
    return successResponse(res, matchData, 'Smart Match results calculated successfully');
  } catch (error) {
    next(error);
  }
};
