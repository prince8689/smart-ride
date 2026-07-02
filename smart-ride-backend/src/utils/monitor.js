// ========== FILE: src/utils/monitor.js ==========
const logger = require('./logger');

const performanceMonitor = (req, res, next) => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    
    // Log if slow (> 500ms)
    if (responseTime > 500) {
      logger.warn(`Slow response: ${req.method} ${req.originalUrl} took ${responseTime}ms`);
    }
  });

  next();
};

const getMemoryUsage = () => {
  const used = process.memoryUsage();
  return {
    rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
    external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`,
  };
};

module.exports = { performanceMonitor, getMemoryUsage };
// ========== END ==========
