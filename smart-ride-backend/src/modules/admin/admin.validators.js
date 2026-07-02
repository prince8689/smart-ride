// ========== FILE: src/modules/admin/admin.validators.js ==========
const { body, query } = require('express-validator');

// ───────────── Driver Assignment ─────────────
const assignDriverValidator = [
  body('subscription_id')
    .notEmpty().withMessage('Subscription ID is required')
    .isUUID().withMessage('Invalid Subscription ID'),
  body('driver_id')
    .notEmpty().withMessage('Driver Profile ID is required')
    .isUUID().withMessage('Invalid Driver ID'),
  body('vehicle_id')
    .notEmpty().withMessage('Vehicle ID is required')
    .isUUID().withMessage('Invalid Vehicle ID')
];

const bulkAssignDriverValidator = [
  body('assignments')
    .optional()
    .isArray({ min: 1, max: 50 }).withMessage('Assignments must be an array of 1 to 50 items'),
  body('assignments.*.subscription_id')
    .optional()
    .isUUID().withMessage('Invalid Subscription ID in bulk assignment'),
  body('assignments.*.driver_id')
    .optional()
    .isUUID().withMessage('Invalid Driver Profile ID in bulk assignment'),
  body('assignments.*.vehicle_id')
    .optional()
    .isUUID().withMessage('Invalid Vehicle ID in bulk assignment')
];

// ───────────── Status Updates ─────────────
const updateSubscriptionStatusValidator = [
  body('status')
    .isIn(['active', 'paused', 'cancelled', 'expired']).withMessage('Invalid status'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Reason must be under 500 characters')
];

const updateUserStatusValidator = [
  body('is_active')
    .isBoolean().withMessage('is_active must be a boolean'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Reason must be under 500 characters')
];

// ───────────── Drivers ─────────────
const rejectDriverValidator = [
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Reason must be between 10 and 1000 characters')
];

// ───────────── Complaints ─────────────
const respondComplaintValidator = [
  body('admin_response')
    .notEmpty().withMessage('Admin response is required')
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Response must be between 10 and 1000 characters'),
  body('status')
    .isIn(['in_progress', 'resolved', 'closed']).withMessage('Invalid status')
];

// ───────────── Create Admin ─────────────
const createAdminValidator = [
  body('full_name')
    .notEmpty().withMessage('Full name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .isMobilePhone('en-IN').withMessage('Must be a valid Indian phone number'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

// ───────────── Analytics Filters ─────────────
const analyticsQueryValidator = [
  query('start_date').optional().isDate().withMessage('Valid start_date required (YYYY-MM-DD)'),
  query('end_date').optional().isDate().withMessage('Valid end_date required (YYYY-MM-DD)'),
  query('city').optional().trim(),
  query('plan_type').optional().isIn(['monthly', 'quarterly', 'yearly']).withMessage('Invalid plan type')
];

module.exports = {
  assignDriverValidator,
  bulkAssignDriverValidator,
  updateSubscriptionStatusValidator,
  updateUserStatusValidator,
  respondComplaintValidator,
  createAdminValidator,
  analyticsQueryValidator,
  rejectDriverValidator
};
// ========== END ==========
