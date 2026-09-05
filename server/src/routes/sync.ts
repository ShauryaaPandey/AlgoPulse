import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/sqlite.js';
import { SyncManager } from '../ingestion/sync-manager.js';
import { PlatformAccountsRepository } from '../db/repositories/platform-accounts.repo.js';
import { SyncStateRepository } from '../db/repositories/sync-state.repo.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

router.use(requireAuth);

router.post('/', async (req: AuthRequest, res) => {
  const db = getDb();
  const syncManager = new SyncManager(db);
  
  const platform = req.query['platform'] as string | undefined;
  const fullSync = req.query['full'] === 'true';

  try {
    if (platform) {
      const result = await syncManager.syncPlatformForUser(req.userId!, platform, fullSync);
      res.json({ results: [result] });
    } else {
      const results = await syncManager.syncAllForUser(req.userId!, fullSync);
      res.json({ results });
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
});

router.get('/status', (req: AuthRequest, res) => {
  const db = getDb();
  const platformAccountsRepo = new PlatformAccountsRepository(db);
  const syncStateRepo = new SyncStateRepository(db);

  const accounts = platformAccountsRepo.findByUserId(req.userId!);

  const status = accounts.map(account => {
    const syncState = syncStateRepo.findByPlatformAccountId(account.id);

    return {
      platform: account.platform,
      username: account.username,
      lastSync: syncState?.last_sync || account.last_synced_at || null,
      lastSubmissionTime: syncState?.last_submission_time || null
    };
  });

  res.json({ status });
});

export { router as syncRouter };
