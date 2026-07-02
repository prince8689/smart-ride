const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response');

const createLimiter = (max, windowMs, message) => {
  return rateLimit({
    windowMs,
    max,
    handler: (req, res) => {
      errorResponse(res, message || 'Too many requests, please try again later.', 429);
    }
  });
};

const authLimiter = createLimiter(
  10000, // Increased from 5 to 10000 as per user request to never lock out
  15 * 60 * 1000,
  'Too many login/register attempts. Please try again after 15 minutes.'
);

const otpLimiter = createLimiter(
  1000,
  60 * 60 * 1000,
  'Too many OTP requests. Please try again after an hour.'
);

const apiLimiter = createLimiter(
  10000,
  15 * 60 * 1000,
  'Too many requests to the API. Please try again later.'
);

const pricingLimiter = createLimiter(
  60,
  60 * 1000,
  'Too many pricing calculations. Please try again later.'
);

const adminLimiter = createLimiter(
  10000,
  15 * 60 * 1000,
  'Too many administrative requests.'
);

module.exports = {
  authLimiter,
  otpLimiter,
  apiLimiter,
  pricingLimiter,
  adminLimiter
};
