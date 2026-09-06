import { config } from 'dotenv';
config();

import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { initDb, closeDb } from './db/sqlite.js';
import { runMigrations } from './db/migrator.js';
import { env } from './config/env.js';
import { closeMongoClient, isMongoConfigured } from './vector/mongo.js';

const PORT = env.PORT || 3000;

function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`);

  closeDb();

  if (isMongoConfigured()) {
    closeMongoClient().then(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    }).catch(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

async function bootstrap() {
  try {
    logger.info('Initializing database...');
    const db = initDb();
    runMigrations(db);
    logger.info('Database initialized');

    const app = createApp();

    const server = app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });

    process.once('SIGINT', () => {
      server.close(() => shutdown('SIGINT'));
    });

    process.once('SIGTERM', () => {
      server.close(() => shutdown('SIGTERM'));
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
