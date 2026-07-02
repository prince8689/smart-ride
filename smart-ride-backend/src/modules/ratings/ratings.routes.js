const express = require('express');
const router = express.Router();
const ratingsController = require('./ratings.controller');
const validators = require('./ratings.validators');
const { verifyToken, requireRole } = require('../../middleware/auth');

// Public route to view driver ratings
router.get('/driver/:driverProfileId', validators.validateDriverParams, ratingsController.getDriverRatings);

// Protected routes
router.use(verifyToken);

router.post(
  '/', 
  requireRole('user'), 
  validators.validateRating, 
  ratingsController.submitRating
);

router.get(
  '/my', 
  requireRole('user'), 
  ratingsController.getUserRatings
);

router.get(
  '/can-rate/:subscriptionId', 
  requireRole('user'), 
  validators.validateSubParams, 
  ratingsController.checkCanRate
);

module.exports = router;
