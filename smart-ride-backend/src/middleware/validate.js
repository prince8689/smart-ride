const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response');

/**
 * Validation middleware factory.
 * Wraps an array of express-validator checks and returns 400 if validation fails.
 * @param {Array} validations - Array of express-validator check chains
 * @returns {Function} Express middleware
 */
const validate = (validations) => {
  return async (req, res, next) => {
    try {
      // Run all validations
      await Promise.all(validations.map((validation) => validation.run(req)));

      const errors = validationResult(req);

      if (errors.isEmpty()) {
        return next();
      }

      // Format errors as { field, message } array
      const formattedErrors = errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      }));

      return errorResponse(res, 'Validation failed', 400, formattedErrors);
    } catch (error) {
      return errorResponse(res, 'Validation processing error', 500);
    }
  };
};

module.exports = { validate };
