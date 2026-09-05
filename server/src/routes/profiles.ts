import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/sqlite.js';
import { parseUrl } from '../profiles/url-parser.js';
import { detectPlatform } from '../profiles/platform-detector.js';
import { extractUsername } from '../profiles/username-extractor.js';
import { Platform } from '../config/constants.js';
import { CodeforcesAdapter } from '../adapters/codeforces/adapter.js';
import type { PlatformAccount } from '../types/platform.js';
import type { PlatformAdapter } from '../adapters/interface.js';
import { ValidationError, PlatformError } from '../utils/errors.js';

const router = Router();

router.use(requireAuth);

function getAdapter(platform: Platform, username: string): PlatformAdapter | null {
  switch (platform) {
    case Platform.CODEFORCES:
      return new CodeforcesAdapter(username);
    case Platform.LEETCODE:
    case Platform.CODECHEF:
      return null;
    default:
      return null;
  }
}

function getPlatformDisplayName(platform: string): string {
  switch (platform) {
    case Platform.CODEFORCES:
      return 'Codeforces';
    case Platform.LEETCODE:
      return 'LeetCode';
    case Platform.CODECHEF:
      return 'CodeChef';
    default:
      return platform;
  }
}

const addProfileSchema = z.object({
  url: z.string().min(1, 'URL is required')
});

router.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const accounts = db
    .prepare('SELECT * FROM platform_accounts WHERE user_id = ? ORDER BY platform, username')
    .all(req.userId!) as PlatformAccount[];

  res.json({
    profiles: accounts.map(acc => ({
      id: acc.id,
      platform: acc.platform,
      username: acc.username,
      profile_url: acc.profile_url,
      connected_at: acc.connected_at,
      last_verified_at: acc.last_verified_at
    }))
  });
});

router.post('/', async (req: AuthRequest, res) => {
  const validation = addProfileSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validation.error.format()
      }
    });
    return;
  }

  const { url } = validation.data;

  const parsed = parseUrl(url);
  if (!parsed) {
    throw new ValidationError('Invalid URL format');
  }

  const platform = detectPlatform(parsed);
  if (!platform) {
    throw new ValidationError('Unsupported platform. Supported: Codeforces, LeetCode, CodeChef');
  }

  const username = extractUsername(platform, parsed);
  if (!username) {
    throw new ValidationError('Could not extract username from URL');
  }

  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM platform_accounts WHERE user_id = ? AND platform = ? AND username = ?')
    .get(req.userId!, platform, username) as PlatformAccount | undefined;

  if (existing) {
    throw new ValidationError('This profile is already connected');
  }

  const adapter = getAdapter(platform, username);
  if (!adapter) {
    throw new PlatformError(
      platform,
      `${getPlatformDisplayName(platform)} adapter not yet implemented. Currently only Codeforces is supported.`
    );
  }

  await adapter.connect();
  const verified = await adapter.verifyProfile(username);
  await adapter.disconnect();

  if (!verified) {
    throw new PlatformError(
      platform,
      `Could not verify this ${getPlatformDisplayName(platform)} profile. Please check the URL and try again.`
    );
  }

  const now = new Date().toISOString();
  const accountId = randomUUID();

  db.prepare(`
    INSERT INTO platform_accounts (id, user_id, platform, username, profile_url, connected_at, last_verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(accountId, req.userId!, platform, username, parsed.full, now, now);

  const account = db
    .prepare('SELECT * FROM platform_accounts WHERE id = ?')
    .get(accountId) as PlatformAccount;

  res.status(201).json({
    profile: {
      id: account.id,
      platform: account.platform,
      username: account.username,
      profile_url: account.profile_url,
      connected_at: account.connected_at,
      last_verified_at: account.last_verified_at
    },
    message: `${getPlatformDisplayName(platform)} profile verified and connected`
  });
});

router.delete('/:platform', (req: AuthRequest, res) => {
  const platformParam = req.params['platform'];
  if (!platformParam || Array.isArray(platformParam)) {
    throw new ValidationError('Invalid platform parameter');
  }
  
  const platform = platformParam.toLowerCase();

  const validPlatforms: Record<string, string> = {
    'codeforces': Platform.CODEFORCES,
    'leetcode': Platform.LEETCODE,
    'codechef': Platform.CODECHEF,
  };

  const normalizedPlatform = validPlatforms[platform!];
  if (!normalizedPlatform) {
    throw new ValidationError('Invalid platform. Valid platforms: codeforces, leetcode, codechef');
  }

  const db = getDb();
  const account = db
    .prepare('SELECT * FROM platform_accounts WHERE user_id = ? AND platform = ?')
    .get(req.userId!, normalizedPlatform) as PlatformAccount | undefined;

  if (!account) {
    throw new ValidationError(`No ${getPlatformDisplayName(normalizedPlatform)} account connected`);
  }

  db.prepare('DELETE FROM platform_accounts WHERE id = ?').run(account.id);

  res.json({
    message: `${getPlatformDisplayName(normalizedPlatform)} profile removed`
  });
});

router.post('/verify', async (req: AuthRequest, res) => {
  const db = getDb();
  const accounts = db
    .prepare('SELECT * FROM platform_accounts WHERE user_id = ?')
    .all(req.userId!) as PlatformAccount[];

  if (accounts.length === 0) {
    res.json({ message: 'No profiles to verify', results: [] });
    return;
  }

  const results = [];

  for (const account of accounts) {
    const adapter = getAdapter(account.platform as Platform, account.username);

    if (!adapter) {
      results.push({
        platform: account.platform,
        username: account.username,
        verified: false,
        error: 'Adapter not available'
      });
      continue;
    }

    try {
      await adapter.connect();
      const verified = await adapter.verifyProfile(account.username);
      await adapter.disconnect();

      if (verified) {
        const now = new Date().toISOString();
        db.prepare('UPDATE platform_accounts SET last_verified_at = ? WHERE id = ?')
          .run(now, account.id);
      }

      results.push({
        platform: account.platform,
        username: account.username,
        verified
      });
    } catch (error) {
      results.push({
        platform: account.platform,
        username: account.username,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  res.json({ results });
});

export { router as profilesRouter };
