// ========== FILE: src/modules/routes/routes.validators.js ==========
const { body, query: queryParam } = require('express-validator');

/**
 * Time format regex: HH:MM (00:00 to 23:59)
 */
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// ───────────── Create Route (Admin) ─────────────
const createRouteValidator = [
  body('route_name')
    .notEmpty()
    .withMessage('Route name is required')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Route name must be between 3 and 100 characters'),

  body('pickup_location')
    .notEmpty()
    .withMessage('Pickup location is required')
    .trim()
    .isLength({ max: 255 })
    .withMessage('Pickup location must not exceed 255 characters'),

  body('pickup_lat')
    .notEmpty()
    .withMessage('Pickup latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Pickup latitude must be between -90 and 90'),

  body('pickup_lng')
    .notEmpty()
    .withMessage('Pickup longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Pickup longitude must be between -180 and 180'),

  body('drop_location')
    .notEmpty()
    .withMessage('Drop location is required')
    .trim()
    .isLength({ max: 255 })
    .withMessage('Drop location must not exceed 255 characters'),

  body('drop_lat')
    .notEmpty()
    .withMessage('Drop latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Drop latitude must be between -90 and 90'),

  body('drop_lng')
    .notEmpty()
    .withMessage('Drop longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Drop longitude must be between -180 and 180'),

  body('distance_km')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Distance must be at least 0.1 km'),

  body('estimated_duration_min')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated duration must be at least 1 minute'),

  body('morning_pickup_time')
    .optional()
    .matches(TIME_REGEX)
    .withMessage('Morning pickup time must be in HH:MM format'),

  body('evening_pickup_time')
    .optional()
    .matches(TIME_REGEX)
    .withMessage('Evening pickup time must be in HH:MM format'),

  body('city')
    .notEmpty()
    .withMessage('City is required')
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),
];

// ───────────── Update Route (Admin) — all optional ─────────────
const updateRouteValidator = [
  body('route_name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Route name must be between 3 and 100 characters'),

  body('pickup_location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Pickup location must not exceed 255 characters'),

  body('pickup_lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Pickup latitude must be between -90 and 90'),

  body('pickup_lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Pickup longitude must be between -180 and 180'),

  body('drop_location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Drop location must not exceed 255 characters'),

  body('drop_lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Drop latitude must be between -90 and 90'),

  body('drop_lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Drop longitude must be between -180 and 180'),

  body('distance_km')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Distance must be at least 0.1 km'),

  body('estimated_duration_min')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated duration must be at least 1 minute'),

  body('morning_pickup_time')
    .optional()
    .matches(TIME_REGEX)
    .withMessage('Morning pickup time must be in HH:MM format'),

  body('evening_pickup_time')
    .optional()
    .matches(TIME_REGEX)
    .withMessage('Evening pickup time must be in HH:MM format'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),

  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
];

// ───────────── Search / Filter Routes (Query Params) ─────────────
const searchRoutesValidator = [
  queryParam('city')
    .optional()
    .trim(),

  queryParam('pickup_query')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Pickup search query must not exceed 100 characters'),

  queryParam('drop_query')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Drop search query must not exceed 100 characters'),

  queryParam('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  queryParam('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

module.exports = {
  createRouteValidator,
  updateRouteValidator,
  searchRoutesValidator,
};
// ========== END ==========
