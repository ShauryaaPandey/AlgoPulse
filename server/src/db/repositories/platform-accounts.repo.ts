import type Database from 'better-sqlite3';
import type { PlatformAccount } from '../../types/platform.js';

export class PlatformAccountsRepository {
  constructor(private db: Database.Database) {}

  findById(id: string): PlatformAccount | undefined {
    return this.db
      .prepare('SELECT * FROM platform_accounts WHERE id = ?')
      .get(id) as PlatformAccount | undefined;
  }

  findByUserId(userId: string): PlatformAccount[] {
    return this.db
      .prepare('SELECT * FROM platform_accounts WHERE user_id = ? ORDER BY platform, username')
      .all(userId) as PlatformAccount[];
  }

  findByUserIdAndPlatform(userId: string, platform: string): PlatformAccount | undefined {
    return this.db
      .prepare('SELECT * FROM platform_accounts WHERE user_id = ? AND platform = ?')
      .get(userId, platform) as PlatformAccount | undefined;
  }

  updateLastSynced(id: string, lastSyncedAt: string): void {
    this.db
      .prepare('UPDATE platform_accounts SET last_synced_at = ? WHERE id = ?')
      .run(lastSyncedAt, id);
  }
}
