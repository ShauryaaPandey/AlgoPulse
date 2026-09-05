import { config } from 'dotenv';
config();

import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { initDb } from './db/sqlite.js';
import { runMigrations } from './db/migrator.js';
import { env } from './config/env.js';

const PORT = env.PORT || 3000;

async function bootstrap() {
  try {
    logger.info('Initializing database...');
    const db = initDb();
    runMigrations(db);
    logger.info('Database initialized');

    const app = createApp();

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`   Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
