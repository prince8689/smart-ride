const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

const helmetConfig = helmet({
  hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
});

const corsConfig = cors({
  origin: env.FRONTEND_URL,
  credentials: true,
});

const sanitizeObj = (obj) => {
  if (Array.isArray(obj)) {
    obj.forEach(sanitizeObj);
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (key.startsWith('$')) {
        delete obj[key];
      } else {
        sanitizeObj(obj[key]);
      }
    }
  }
};

const sanitizeInput = (req, res, next) => {
  if (req.body) {
    sanitizeObj(req.body);
  }
  if (req.query) {
    sanitizeObj(req.query);
  }
  if (req.params) {
    sanitizeObj(req.params);
  }
  next();
};

const requestId = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

module.exports = {
  helmetConfig,
  corsConfig,
  sanitizeInput,
  requestId
};
