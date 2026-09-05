import { logger } from '../utils/logger.js';
import { getDb } from '../db/sqlite.js';
import { runMigrations } from '../db/migrator.js';
import { parseArgs } from './parser.js';
import { route } from './router.js';

export async function bootstrap(): Promise<void> {
  try {
    const db = getDb();
    runMigrations(db);

    const parsed = parseArgs(process.argv.slice(2));
    await route(parsed);
  } catch (error) {
    logger.error('Fatal initialization error:', error);
    process.exitCode = 1;
  }
}

bootstrap();