const ratingsService = require('./ratings.service');
const { validationResult } = require('express-validator');
const { successResponse, errorResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

exports.submitRating = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const rating = await ratingsService.submitRating(req.user.id, req.body);
    return successResponse(res, { rating }, 'Rating submitted successfully', 201);
  } catch (error) {
    logger.error(`Rating Submit Error: ${error.message}`);
    return errorResponse(res, error.message, 400);
  }
};

exports.getDriverRatings = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 400, errors.array());

    const { driverProfileId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const data = await ratingsService.getDriverRatings(driverProfileId, page, limit);
    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
};

exports.getUserRatings = async (req, res, next) => {
  try {
    const ratings = await ratingsService.getUserRatings(req.user.id);
    return successResponse(res, { ratings });
  } catch (error) {
    next(error);
  }
};

exports.checkCanRate = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 400, errors.array());

    const status = await ratingsService.checkCanRate(req.user.id, req.params.subscriptionId);
    return successResponse(res, status);
  } catch (error) {
    next(error);
  }
};
