// ========== FILE: src/modules/drivers/drivers.validators.js ==========
const { body } = require('express-validator');

/**
 * Indian Driving License format:
 * 2 uppercase letters (state code) + 2 digits (RTO code)
 * + 1-2 uppercase letters + 4-7 digits
 * Example: MH0220170012345
 */
const LICENSE_REGEX = /^[A-Z0-9-]{8,20}$/i;

/**
 * Indian Vehicle Number Plate format:
 * 2 uppercase letters (state) + 2 digits (RTO) + 1-2 uppercase letters + 4 digits
 * Example: MH02AB1234
 */
const VEHICLE_NUMBER_REGEX = /^[A-Z0-9-]{6,15}$/i;

const currentYear = new Date().getFullYear();

// ───────────── Create Driver Profile ─────────────
const createDriverProfileValidator = [
  body('license_number')
    .notEmpty()
    .withMessage('License number is required')
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('License number must be between 8 and 20 characters')
    .matches(LICENSE_REGEX)
    .withMessage('Invalid Indian driving license format (e.g., MH0220170012345)'),

  body('pan_card_number')
    .optional()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN Card format'),

  body('bank_account_number')
    .optional()
    .isString()
    .withMessage('Invalid bank account format'),

  body('experience_years')
    .optional()
    .isInt({ min: 0, max: 60 })
    .withMessage('Invalid experience years'),

  body('pan_card_image').optional().isURL({ require_tld: false }).withMessage('Invalid image URL'),

  body('license_image').optional().isURL({ require_tld: false }).withMessage('Invalid image URL'),

  body('aadhar_image').optional().isURL({ require_tld: false }).withMessage('Invalid image URL'),

  body('license_expiry')
    .notEmpty()
    .withMessage('License expiry date is required')
    .isDate()
    .withMessage('License expiry must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('License expiry must be a future date');
      }
      return true;
    }),

  body('aadhar_number')
    .notEmpty()
    .withMessage('Aadhar number is required')
    .isLength({ min: 12, max: 12 })
    .withMessage('Aadhar number must be exactly 12 digits')
    .isNumeric()
    .withMessage('Aadhar number must contain only digits'),
];

// ───────────── Add Vehicle ─────────────
const addVehicleValidator = [
  body('vehicle_number')
    .notEmpty()
    .withMessage('Vehicle number is required')
    .trim()
    .toUpperCase()
    .matches(VEHICLE_NUMBER_REGEX)
    .withMessage('Invalid Indian vehicle number format (e.g., MH02AB1234)'),

  body('vehicle_type')
    .isIn(['bike', 'scooter', 'auto', 'car', 'sedan', 'suv', 'hatchback', 'van', 'mini_bus', 'bus', 'truck'])
    .withMessage('Invalid vehicle type'),

  body('brand')
    .notEmpty()
    .withMessage('Vehicle brand is required')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand must not exceed 50 characters'),

  body('model')
    .notEmpty()
    .withMessage('Vehicle model is required')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Model must not exceed 50 characters'),

  body('year')
    .isInt({ min: 2000, max: currentYear })
    .withMessage(`Year must be between 2000 and ${currentYear}`),

  body('color')
    .notEmpty()
    .withMessage('Vehicle color is required')
    .trim()
    .isLength({ max: 30 })
    .withMessage('Color must not exceed 30 characters'),

  body('seating_capacity')
    .isInt({ min: 2, max: 50 })
    .withMessage('Seating capacity must be between 2 and 50'),
];

// ───────────── Update Live Location ─────────────
const updateLocationValidator = [
  body('lat')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('lng')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
];

// ───────────── Mark Attendance ─────────────
const markAttendanceValidator = [
  body('subscription_id')
    .notEmpty()
    .withMessage('Subscription ID is required')
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),

  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isDate()
    .withMessage('Date must be a valid date (YYYY-MM-DD)'),

  body('slot')
    .isIn(['morning', 'evening'])
    .withMessage('Slot must be either morning or evening'),

  body('status')
    .isIn(['completed', 'missed'])
    .withMessage('Status must be either completed or missed'),

  body('pickup_time')
    .optional()
    .isISO8601()
    .withMessage('Pickup time must be a valid ISO 8601 timestamp'),

  body('drop_time')
    .optional()
    .isISO8601()
    .withMessage('Drop time must be a valid ISO 8601 timestamp'),
];

module.exports = {
  createDriverProfileValidator,
  addVehicleValidator,
  updateLocationValidator,
  markAttendanceValidator,
};
// ========== END ==========
