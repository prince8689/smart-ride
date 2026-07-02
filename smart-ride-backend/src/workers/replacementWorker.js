// ========== FILE: src/workers/replacementWorker.js ==========
const logger = require('../utils/logger');
const { replaceDriver } = require('../services/replacementEngine');

/**
 * Replacement Worker
 * Listens to the replacement queue and processes driver replacement jobs.
 *
 * Job data: { subscriptionId, reason }
 */
const processReplacement = async (job) => {
  try {
    const { subscriptionId, reason } = job.data;
    logger.info('replacementWorker: Processing', { subscriptionId, reason });

    const result = await replaceDriver(subscriptionId, reason);

    logger.info('replacementWorker: Completed', {
      subscriptionId,
      success: result.success,
      newDriver: result.new_driver_id,
    });

    return result;
  } catch (error) {
    logger.error('replacementWorker error:', error);
    throw error;
  }
};

module.exports = { processReplacement };
// ========== END ==========
