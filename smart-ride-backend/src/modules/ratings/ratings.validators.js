const { query } = require('../../config/db');
const { body, param } = require('express-validator');

exports.validateRating = [
  body('subscription_id').isUUID().withMessage('Valid subscription ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
  body('review').optional().isString().isLength({ max: 500 }).withMessage('Review must be string and max 500 characters')
];

exports.validateDriverParams = [
  param('driverProfileId').isUUID().withMessage('Valid driver profile ID is required')
];

exports.validateSubParams = [
  param('subscriptionId').isUUID().withMessage('Valid subscription ID is required')
];
