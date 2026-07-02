// ========== FILE: src/modules/v2/pricing/pricing.v2.routes.js ==========
const express = require('express');
const router = express.Router();
const pricingController = require('./pricing.v2.controller');

// POST /api/v2/pricing/calculate
router.post('/calculate', pricingController.calculatePrice);

module.exports = router;
// ========== END ==========
