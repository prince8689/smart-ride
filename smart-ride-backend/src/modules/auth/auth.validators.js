const { body, validationResult } = require('express-validator');
const { errorResponse } = require('../../utils/response');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    const extractedErrors = errors.array().map(err => ({ [err.param || err.path]: err.msg }));
    return errorResponse(res, 'Validation failed', 400, extractedErrors);
  };
};

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const passwordMessage = 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number';

const registerValidator = validate([
  body('full_name').trim().notEmpty().withMessage('Full name is required').isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().isLength({ min: 10, max: 10 }).isNumeric().withMessage('Valid 10-digit phone number is required'),
  body('password').matches(passwordRegex).withMessage(passwordMessage)
]);

const verifyEmailOTPValidator = validate([
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit OTP is required')
]);

const verifyPhoneOTPValidator = validate([
  body('phone').isLength({ min: 10, max: 10 }).isNumeric().withMessage('Valid 10-digit phone number is required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit OTP is required')
]);

const loginValidator = validate([
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
]);

const forgotPasswordValidator = validate([
  body('email').isEmail().withMessage('Valid email is required')
]);

const resetPasswordValidator = validate([
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit OTP is required'),
  body('new_password').matches(passwordRegex).withMessage(passwordMessage)
]);

const changePasswordValidator = validate([
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').matches(passwordRegex).withMessage(passwordMessage)
]);

module.exports = {
  registerValidator,
  verifyEmailOTPValidator,
  verifyPhoneOTPValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator
};
