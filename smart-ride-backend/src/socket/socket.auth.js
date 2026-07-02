const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const logger = require('../utils/logger');
const env = require('../config/env');

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || 
                  (socket.handshake.headers?.authorization && socket.handshake.headers.authorization.split(' ')[1]) || 
                  socket.handshake.query?.token;

    if (!token) {
      return next(new Error('AUTH_REQUIRED'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    socket.user = { id: decoded.id, email: decoded.email, role: decoded.role, full_name: decoded.full_name };

    if (decoded.role === 'driver') {
      const dp = await query('SELECT id FROM drivers WHERE user_id = $1', [decoded.id]);
      if (dp.rows.length > 0) {
        socket.driverProfileId = dp.rows[0].id;
      }
    }

    next();
  } catch (error) {
    logger.error(`Socket auth error: ${error.message}`);
    next(new Error('INVALID_TOKEN'));
  }
};

module.exports = { socketAuthMiddleware };
