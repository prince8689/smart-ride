const express = require('express');
const router = express.Router();

const pricingController = require('./pricing.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { pricingLimiter } = require('../../middleware/rateLimiter');

router.get('/calculate', pricingLimiter, pricingController.calculatePricing);
router.post('/calculate-sample', verifyToken, requireRole('admin'), pricingController.calculateSamplePricing);
router.get('/config', verifyToken, pricingController.getPricingConfig);
router.patch('/config', verifyToken, requireRole('admin'), pricingController.updatePricingConfig);
router.get('/history', verifyToken, requireRole('admin'), pricingController.getPricingHistory);

module.exports = router;
