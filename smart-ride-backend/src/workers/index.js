// ========== FILE: src/workers/index.js ==========
const logger = require('../utils/logger');

/**
 * Initialize all BullMQ workers.
 * Gracefully degrades if Redis/BullMQ is not available.
 */
const initializeWorkers = () => {
  let Queue, Worker;
  let redisConnection;

  try {
    const bullmq = require('bullmq');
    Queue = bullmq.Queue;
    Worker = bullmq.Worker;
  } catch (e) {
    logger.warn('BullMQ not installed — background workers disabled. Run: npm install bullmq ioredis');
    return;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  // Parse Redis URL for BullMQ connection
  try {
    const url = new URL(redisUrl);
    redisConnection = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      maxRetriesPerRequest: null,
    };
  } catch (e) {
    redisConnection = { host: 'localhost', port: 6379, maxRetriesPerRequest: null };
  }

  // Test Redis connection first
  let IORedis;
  try {
    IORedis = require('ioredis');
  } catch (e) {
    logger.warn('ioredis not installed — background workers disabled. Run: npm install bullmq ioredis');
    return;
  }

  const testClient = new IORedis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 1 ? null : 200),
    lazyConnect: true,
  });

  testClient.connect()
    .then(() => {
      testClient.disconnect();
      logger.info('Redis connected — starting BullMQ workers');
      startWorkers(Queue, Worker, redisConnection);
    })
    .catch((err) => {
      logger.warn('Redis not available — background workers disabled. Error: ' + err.message);
      testClient.disconnect();
    });
};

function startWorkers(Queue, Worker, connection) {
  const { processAttendanceCheck } = require('./attendanceCheckWorker');
  const { processReassignment } = require('./reassignmentWorker');
  const { processDriverStatusCheck } = require('./driverStatusWorker');
  const { processSubscriptionMonitor } = require('./subscriptionMonitorWorker');
  const { processTripScheduleCreation } = require('./tripScheduleWorker');
  const { processWalletSettlement } = require('./walletSettlementWorker');
  const { processReplacement } = require('./replacementWorker');

  // ─── Queues ────────────────────────────────────────────────────────────────
  const replacementQueue = new Queue('driver-replacement', { connection });
  const scheduledQueue = new Queue('scheduled-tasks', { connection });
  const reassignmentQueue = new Queue('driver-reassignment', { connection });

  // ─── Replacement Worker (event-driven) ─────────────────────────────────────
  const replacementWorker = new Worker('driver-replacement', async (job) => {
    return processReplacement(job);
  }, { connection, concurrency: 3 });

  replacementWorker.on('completed', (job) => {
    logger.debug('Replacement job completed', { jobId: job.id });
  });
  replacementWorker.on('failed', (job, err) => {
    logger.error('Replacement job failed', { jobId: job?.id, error: err.message });
  });

  // ─── Reassignment Worker ───────────────────────────────────────────────────
  const reassignmentWorker = new Worker('driver-reassignment', async (job) => {
    return processReassignment(job);
  }, { connection, concurrency: 3 });

  reassignmentWorker.on('completed', (job) => {
    logger.debug('Reassignment job completed', { jobId: job.id });
  });
  reassignmentWorker.on('failed', (job, err) => {
    logger.error('Reassignment job failed', { jobId: job?.id, error: err.message });
  });

  // ─── Scheduled Tasks Worker ────────────────────────────────────────────────
  const scheduledWorker = new Worker('scheduled-tasks', async (job) => {
    switch (job.name) {
      case 'attendance-check':
        return processAttendanceCheck(replacementQueue);
      case 'driver-status-check':
        return processDriverStatusCheck(replacementQueue);
      case 'subscription-monitor':
        return processSubscriptionMonitor();
      case 'trip-schedule-creation':
        return processTripScheduleCreation();
      case 'wallet-settlement':
        return processWalletSettlement();
      default:
        logger.warn('Unknown scheduled task', { name: job.name });
    }
  }, { connection, concurrency: 1 });

  scheduledWorker.on('completed', (job) => {
    logger.debug('Scheduled task completed', { name: job.name, jobId: job.id });
  });
  scheduledWorker.on('failed', (job, err) => {
    logger.error('Scheduled task failed', { name: job?.name, jobId: job?.id, error: err.message });
  });

  // ─── Schedule repeating jobs ───────────────────────────────────────────────

  // Attendance check: daily at 7:30 AM IST
  scheduledQueue.add('attendance-check', {}, {
    repeat: { pattern: '30 7 * * *' }, // cron: 7:30 AM every day
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  // Driver status check: every 2 minutes
  scheduledQueue.add('driver-status-check', {}, {
    repeat: { every: 2 * 60 * 1000 }, // every 2 minutes
    removeOnComplete: 50,
    removeOnFail: 20,
  });

  // Subscription monitor: daily at midnight
  scheduledQueue.add('subscription-monitor', {}, {
    repeat: { pattern: '0 0 * * *' }, // cron: midnight
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  // Trip schedule creation: daily at 11 PM
  scheduledQueue.add('trip-schedule-creation', {}, {
    repeat: { pattern: '0 23 * * *' }, // cron: 11 PM
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  // Wallet settlement: every Monday at 9 AM
  scheduledQueue.add('wallet-settlement', {}, {
    repeat: { pattern: '0 9 * * 1' }, // cron: Monday 9 AM
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  logger.info('All BullMQ workers and scheduled tasks initialized');

  return { replacementQueue, scheduledQueue, reassignmentQueue };
}

module.exports = {
  initializeWorkers,
  addJob: async (queueName, jobName, data, options) => {
    try {
      const bullmq = require('bullmq');
      const connection = require('../config/redis');
      const q = new bullmq.Queue(queueName, { connection });
      return await q.add(jobName, data, options);
    } catch (e) {
      logger.error(`Failed to add job to ${queueName}:`, e.message);
    }
  }
};
// ========== END ==========
