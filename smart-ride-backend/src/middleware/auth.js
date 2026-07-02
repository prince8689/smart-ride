const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const env = require('../config/env');
const { errorResponse } = require('../utils/response');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      console.error('JWT VERIFY ERROR:', err.message);
      return errorResponse(res, 'Invalid or expired token', 401);
    }

    const result = await query('SELECT id, email, role, full_name, is_active, password_changed_at FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return errorResponse(res, 'Account is disabled', 403);
    }

    if (user.password_changed_at) {
      const changedTimestamp = parseInt(user.password_changed_at.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return errorResponse(res, 'Token expired due to password change', 401);
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    };

    next();
  } catch (error) {
    return errorResponse(res, 'Server error in auth middleware', 500);
  }
};

const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return errorResponse(res, 'No refresh token provided', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(refresh_token, env.JWT_REFRESH_SECRET);
    } catch (err) {
      return errorResponse(res, 'Invalid or expired refresh token', 401);
    }

    const result = await query('SELECT id, refresh_token FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const user = result.rows[0];
    if (!user.refresh_token) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    const isMatch = await bcrypt.compare(refresh_token, user.refresh_token);
    if (!isMatch) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    req.user = { id: user.id };
    next();
  } catch (error) {
    return errorResponse(res, 'Server error in refresh token middleware', 500);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, 'Forbidden', 403);
    }
    next();
  };
};

module.exports = {
  verifyToken,
  verifyRefreshToken,
  requireRole
};
