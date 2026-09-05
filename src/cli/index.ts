import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { getDb } from '../db/sqlite.js';
import { runMigrations } from '../db/migrator.js';

export function bootstrap(): void {
  try {
    logger.debug('Starting AlgoPulse foundation initialization...');
    logger.debug(`Environment loaded. Log level: ${env.LOG_LEVEL}`);

    const db = getDb();
    logger.debug('Database connection established.');

    const migrationResult = runMigrations(db);
    if (migrationResult.appliedCount > 0) {
      logger.info(
        `Applied ${migrationResult.appliedCount} migration(s). Database schema initialized.`
      );
    }

    console.log('AlgoPulse ready.');
  } catch (error) {
    logger.error('Fatal initialization error:', error);
    process.exitCode = 1;
  }
}

bootstrap();