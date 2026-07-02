// Order matters — follow exactly:
require('./src/config/validateEnv')(); // Trigger restart
// validate env first

const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: env.FRONTEND_URL, methods: ['GET','POST'], credentials: true },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

app.set('io', io);

// Socket.io initialization
const { initializeSocket } = require('./src/socket/socket.init');
if (initializeSocket) {
  initializeSocket(io);
}

// Start scheduler
const scheduler = require('./src/utils/scheduler');
if (scheduler && scheduler.initSchedulers) {
  scheduler.initSchedulers();
} else if (scheduler && scheduler.startScheduler) {
  scheduler.startScheduler();
}

// Start V2 BullMQ workers (graceful — won't crash if Redis unavailable)
try {
  const { initializeWorkers } = require('./src/workers/index');
  initializeWorkers();
} catch (e) {
  console.warn('V2 Workers not initialized:', e.message);
}

// Start server
httpServer.listen(env.PORT, () => {
  logger.info(`Smart Ride server running on port ${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Frontend URL: ${env.FRONTEND_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  httpServer.close(() => {
    const db = require('./src/config/db');
    db.pool.end(() => {
      logger.info('DB pool closed');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 30000);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', { reason: reason?.message || reason });
  process.exit(1);
});
