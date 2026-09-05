import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export interface SyncState {
  id: string;
  platform_account_id: string;
  cursor: string | null;
  last_submission_time: string | null;
  last_sync: string;
}

export class SyncStateRepository {
  constructor(private db: Database.Database) {}

  findByPlatformAccountId(platformAccountId: string): SyncState | undefined {
    return this.db
      .prepare('SELECT * FROM sync_state WHERE platform_account_id = ?')
      .get(platformAccountId) as SyncState | undefined;
  }

  upsert(state: Omit<SyncState, 'id'>): SyncState {
    const existing = this.findByPlatformAccountId(state.platform_account_id);

    if (existing) {
      this.db.prepare(`
        UPDATE sync_state
        SET cursor = ?, last_submission_time = ?, last_sync = ?
        WHERE id = ?
      `).run(
        state.cursor,
        state.last_submission_time,
        state.last_sync,
        existing.id
      );
      return { ...existing, ...state };
    }

    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO sync_state (id, platform_account_id, cursor, last_submission_time, last_sync)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      state.platform_account_id,
      state.cursor,
      state.last_submission_time,
      state.last_sync
    );

    return { id, ...state };
  }

  delete(platformAccountId: string): void {
    this.db
      .prepare('DELETE FROM sync_state WHERE platform_account_id = ?')
      .run(platformAccountId);
  }
}
