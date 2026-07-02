const express = require('express');
const router = express.Router();
const queriesController = require('./queries.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');

// Public route to submit a query
router.post('/', queriesController.submitQuery);

// Admin routes
router.get('/', verifyToken, requireRole('admin'), queriesController.getQueries);
router.patch('/:id/resolve', verifyToken, requireRole('admin'), queriesController.resolveQuery);

module.exports = router;
