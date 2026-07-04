const env = require('./env');
const logger = require('../utils/logger');

const validateEnv = () => {
  const requiredEnvs = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'EMAIL_USER',
    'EMAIL_PASS',
    'GOOGLE_MAPS_API_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'FRONTEND_URL'
  ];

  const missing = [];
  requiredEnvs.forEach(v => {
    if (!env[v]) missing.push(v);
  });

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters long for security.');
  }

  if (env.NODE_ENV === 'production' && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_ID.startsWith('rzp_test_')) {
    logger.warn('Using test keys in production (Razorpay)');
  }

  if (!env.GOOGLE_CLIENT_ID) {
    logger.warn('GOOGLE_CLIENT_ID is missing. Google Login will not work.');
  }

  logger.info('Environment validated. Map: Google Maps | Email: configured | Cloudinary: configured');
};

module.exports = validateEnv;
