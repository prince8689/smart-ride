const logger = require('../utils/logger');
const { errorResponse } = require('../utils/response');
const { NODE_ENV } = require('../config/env');

/**
 * Global Express error handler.
 * Must be registered LAST with app.use().
 * Catches all unhandled errors, logs them, and returns a clean response.
 */
const errorHandler = (err, req, res, _next) => {
  // Log the full error internally
  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  // Determine status code
  let statusCode = err.statusCode || err.status || 500;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
  } else if (err.code === '23505') {
    // PostgreSQL unique violation
    statusCode = 409;
    return errorResponse(res, 'Duplicate entry — resource already exists', statusCode);
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    return errorResponse(res, 'Invalid reference — related resource not found', statusCode);
  }

  // Build error message — never leak stack traces in production
  const message =
    NODE_ENV === 'production' && statusCode === 500
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  return errorResponse(res, message, statusCode);
};

module.exports = errorHandler;
