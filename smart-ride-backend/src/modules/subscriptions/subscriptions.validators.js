// ========== FILE: src/modules/subscriptions/subscriptions.validators.js ==========
const { body } = require('express-validator');

// ───────────── Create Plan (Admin) ─────────────
const createPlanValidator = [
  body('plan_name')
    .notEmpty()
    .withMessage('Plan name is required')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Plan name must be between 3 and 100 characters'),

  body('plan_type')
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('Plan type must be monthly, quarterly, or yearly'),

  body('duration_days')
    .isInt({ min: 1 })
    .withMessage('Duration days must be at least 1'),

  body('price')
    .isFloat({ min: 1 })
    .withMessage('Price must be a positive number'),

  body('features')
    .optional()
    .isObject()
    .withMessage('Features must be a JSON object'),
];

// ───────────── Update Plan (Admin) ─────────────
const updatePlanValidator = [
  body('plan_name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Plan name must be between 3 and 100 characters'),

  body('plan_type')
    .optional()
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('Plan type must be monthly, quarterly, or yearly'),

  body('duration_days')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration days must be at least 1'),

  body('price')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Price must be a positive number'),

  body('features')
    .optional()
    .isObject()
    .withMessage('Features must be a JSON object'),
];

// ───────────── Create Subscription ─────────────
const createSubscriptionValidator = [
  body('distance_km')
    .notEmpty()
    .withMessage('Distance is required')
    .isFloat({ min: 0.1 })
    .withMessage('Distance must be greater than 0'),

  body('plan_type')
    .notEmpty()
    .withMessage('Plan type is required')
    .isIn(['weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'])
    .withMessage('Invalid plan type'),

  body('vehicle_type')
    .notEmpty()
    .withMessage('Vehicle type is required'),

  body('duration_days')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Duration days must be at least 1'),

  body('pickup_address')
    .notEmpty()
    .withMessage('Pickup address is required')
    .trim()
    .isLength({ max: 255 })
    .withMessage('Pickup address must not exceed 255 characters'),

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

  body('drop_address')
    .notEmpty()
    .withMessage('Drop address is required')
    .trim()
    .isLength({ max: 255 })
    .withMessage('Drop address must not exceed 255 characters'),

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

  body('start_date')
    .notEmpty()
    .withMessage('Start date is required')
    .isDate()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      // Must be today or future date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(value);
      if (startDate < today) {
        throw new Error('Start date must be today or a future date');
      }
      return true;
    }),

  body('morning_slot')
    .optional()
    .isBoolean()
    .withMessage('Morning slot must be a boolean'),

  body('evening_slot')
    .optional()
    .isBoolean()
    .withMessage('Evening slot must be a boolean'),

  body()
    .custom((value) => {
      if (!value.morning_slot && !value.evening_slot) {
        throw new Error('At least one of morning_slot or evening_slot must be true');
      }
      return true;
    }),
];

// ───────────── Cancel Subscription ─────────────
const cancelSubscriptionValidator = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
];

module.exports = {
  createPlanValidator,
  updatePlanValidator,
  createSubscriptionValidator,
  cancelSubscriptionValidator,
};
// ========== END ==========
