const express = require('express');
const router = express.Router();
const pushController = require('./push.controller');
const { verifyToken } = require('../../middleware/auth');

router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Protected routes
router.use(verifyToken);
router.post('/subscribe', pushController.subscribe);
router.post('/unsubscribe', pushController.unsubscribe);

module.exports = router;
