import type Database from 'better-sqlite3';
import { getDb } from './sqlite.js';
import { migrations, type Migration } from './schema/index.js';
import { logger } from '../utils/logger.js';

export interface MigrationResult {
  appliedCount: number;
  totalMigrations: number;
  appliedMigrationIds: string[];
}

export function runMigrations(db: Database.Database = getDb()): MigrationResult {
  logger.debug('Checking database migrations...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db
    .prepare('SELECT id FROM schema_migrations ORDER BY applied_at ASC')
    .all() as { id: string }[];

  const appliedIds = new Set(appliedRows.map((r) => r.id));
  const pendingMigrations = migrations.filter((m) => !appliedIds.has(m.id));

  if (pendingMigrations.length === 0) {
    logger.debug('Database schema is already up to date. No pending migrations.');
    return {
      appliedCount: 0,
      totalMigrations: migrations.length,
      appliedMigrationIds: [],
    };
  }

  const newlyApplied: string[] = [];

  for (const migration of pendingMigrations) {
    logger.info(`Applying database migration [${migration.id}]: ${migration.name}...`);

    const applyTx = db.transaction((m: Migration) => {
      db.exec(m.sql);

      db.prepare(
        'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)'
      ).run(m.id, m.name, new Date().toISOString());
    });

    try {
      applyTx(migration);
      newlyApplied.push(migration.id);
      logger.info(`Successfully applied migration: [${migration.id}]`);
    } catch (error) {
      logger.error(`Failed to apply migration [${migration.id}]:`, error);
      throw error;
    }
  }

  return {
    appliedCount: newlyApplied.length,
    totalMigrations: migrations.length,
    appliedMigrationIds: newlyApplied,
  };
}
