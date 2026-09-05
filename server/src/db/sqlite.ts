import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let dbInstance: Database.Database | null = null;

export function initDb(dbPath: string = env.SQLITE_DATABASE_PATH): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const resolvedPath = path.resolve(dbPath);
  const dbDir = path.dirname(resolvedPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.debug(`Created SQLite database directory: ${dbDir}`);
  }

  logger.debug(`Opening SQLite database at: ${resolvedPath}`);
  const db = new Database(resolvedPath);

  const journalMode = db.pragma('journal_mode = WAL', { simple: true });
  logger.debug(`SQLite journal_mode set to: ${journalMode}`);

  db.pragma('foreign_keys = ON');
  logger.debug('SQLite foreign_keys constraint enabled (ON)');

  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  dbInstance = db;
  return dbInstance;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    logger.debug('Closing SQLite database connection');
    dbInstance.close();
    dbInstance = null;
  }
}
