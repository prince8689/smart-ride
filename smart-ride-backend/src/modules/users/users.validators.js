// ========== FILE: src/modules/users/users.validators.js ==========
const { body } = require('express-validator');

// ───────────── Update Profile ─────────────
const updateProfileValidator = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),

  body('profile_photo')
    .optional()
    .isString()
    .withMessage('Profile photo must be a valid string'),
];

// ───────────── Add Address (Pickup & Drop) ─────────────
const addAddressValidator = [
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
];

// ───────────── Submit Complaint ─────────────
const submitComplaintValidator = [
  body('subscription_id')
    .optional()
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),

  body('driver_id')
    .optional()
    .isUUID()
    .withMessage('Driver ID must be a valid UUID'),

  body('subject')
    .notEmpty()
    .withMessage('Subject is required')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),

  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
];

module.exports = {
  updateProfileValidator,
  addAddressValidator,
  submitComplaintValidator,
};
// ========== END ==========
