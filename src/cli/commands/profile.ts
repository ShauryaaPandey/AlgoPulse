import { randomUUID } from 'node:crypto';
import { requireAuth } from '../../auth/middleware.js';
import { getDb } from '../../db/sqlite.js';
import { promptText, closePrompt } from '../prompt.js';
import { parseUrl } from '../../profiles/url-parser.js';
import { detectPlatform } from '../../profiles/platform-detector.js';
import { extractUsername } from '../../profiles/username-extractor.js';
import { Platform } from '../../config/constants.js';
import { CodeforcesAdapter } from '../../adapters/codeforces/adapter.js';
import type { PlatformAccount } from '../../types/platform.js';
import type { PlatformAdapter } from '../../adapters/interface.js';

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

function formatPlatformUrl(platform: string, username: string): string {
  switch (platform) {
    case Platform.CODEFORCES:
      return `codeforces.com/profile/${username}`;
    case Platform.LEETCODE:
      return `leetcode.com/u/${username}/`;
    case Platform.CODECHEF:
      return `www.codechef.com/users/${username}`;
    default:
      return username;
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

export async function profileCommand(subcommand?: string, arg?: string): Promise<void> {
  if (subcommand === 'add') {
    await profileAddCommand();
  } else if (subcommand === 'remove' && arg) {
    await profileRemoveCommand(arg);
  } else if (subcommand === 'verify') {
    await profileVerifyCommand();
  } else {
    await profileListCommand();
  }
}

async function profileListCommand(): Promise<void> {
  const user = requireAuth();
  const db = getDb();
  
  const accounts = db
    .prepare('SELECT * FROM platform_accounts WHERE user_id = ? ORDER BY platform, username')
    .all(user.id) as PlatformAccount[];

  console.log('CONNECTED PROFILES\n');
  
  if (accounts.length === 0) {
    console.log('(No connected profiles yet)');
    console.log('\nAdd a profile with: algopulse profile add');
    return;
  }

  for (const account of accounts) {
    console.log(getPlatformDisplayName(account.platform));
    console.log(`→ ${formatPlatformUrl(account.platform, account.username)}`);
    console.log('');
  }
}

async function profileAddCommand(): Promise<void> {
  const user = requireAuth();
  const db = getDb();

  try {
    const url = await promptText('Paste your coding profile URL: ');
    
    if (!url) {
      console.error('✗ No URL provided.');
      closePrompt();
      process.exit(1);
    }

    const parsed = parseUrl(url);
    if (!parsed) {
      console.error('✗ Invalid URL format.');
      closePrompt();
      process.exit(1);
    }

    const platform = detectPlatform(parsed);
    if (!platform) {
      console.error('✗ Unsupported platform.');
      console.error('Supported platforms: Codeforces, LeetCode, CodeChef');
      closePrompt();
      process.exit(1);
    }

    const username = extractUsername(platform, parsed);
    if (!username) {
      console.error('✗ Could not extract username from URL.');
      closePrompt();
      process.exit(1);
    }

    console.log(`✓ ${getPlatformDisplayName(platform)} profile detected.`);

    const existing = db
      .prepare('SELECT * FROM platform_accounts WHERE user_id = ? AND platform = ? AND username = ?')
      .get(user.id, platform, username) as PlatformAccount | undefined;

    if (existing) {
      console.error('✗ This profile is already connected.');
      closePrompt();
      process.exit(1);
    }

    const adapter = getAdapter(platform, username);
    if (!adapter) {
      console.error(`✗ ${getPlatformDisplayName(platform)} adapter not yet implemented.`);
      console.error('Currently only Codeforces is supported.');
      closePrompt();
      process.exit(1);
    }

    await adapter.connect();
    const verified = await adapter.verifyProfile(username);
    await adapter.disconnect();

    if (!verified) {
      console.error(`✗ Could not verify this ${getPlatformDisplayName(platform)} profile.`);
      console.error('Please check the URL and try again.');
      closePrompt();
      process.exit(1);
    }

    console.log('✓ Profile verified.');

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO platform_accounts (id, user_id, platform, username, profile_url, connected_at, last_verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), user.id, platform, username, parsed.full, now, now);

    console.log('✓ Account connected.');
    closePrompt();

  } catch (error) {
    console.error('✗ Error connecting profile:', error instanceof Error ? error.message : 'Unknown error');
    closePrompt();
    process.exit(1);
  }
}

async function profileRemoveCommand(platformArg: string): Promise<void> {
  const user = requireAuth();
  const db = getDb();

  const platform = platformArg.toLowerCase();
  
  const validPlatforms: Record<string, string> = {
    'codeforces': Platform.CODEFORCES,
    'leetcode': Platform.LEETCODE,
    'codechef': Platform.CODECHEF,
  };

  const normalizedPlatform = validPlatforms[platform];
  if (!normalizedPlatform) {
    console.error('✗ Invalid platform.');
    console.error('Valid platforms: codeforces, leetcode, codechef');
    process.exit(1);
  }

  const account = db
    .prepare('SELECT * FROM platform_accounts WHERE user_id = ? AND platform = ?')
    .get(user.id, normalizedPlatform) as PlatformAccount | undefined;

  if (!account) {
    console.error(`✗ No ${getPlatformDisplayName(normalizedPlatform)} account connected.`);
    process.exit(1);
  }

  db.prepare('DELETE FROM platform_accounts WHERE id = ?').run(account.id);

  console.log(`✓ ${getPlatformDisplayName(normalizedPlatform)} profile removed.`);
}

async function profileVerifyCommand(): Promise<void> {
  const user = requireAuth();
  const db = getDb();

  const accounts = db
    .prepare('SELECT * FROM platform_accounts WHERE user_id = ?')
    .all(user.id) as PlatformAccount[];

  if (accounts.length === 0) {
    console.log('No profiles to verify.');
    return;
  }

  console.log('Verifying profiles...\n');

  for (const account of accounts) {
    const adapter = getAdapter(account.platform as Platform, account.username);
    
    if (!adapter) {
      console.log(`${getPlatformDisplayName(account.platform)} (${account.username})`);
      console.log('✗ Adapter not available\n');
      continue;
    }

    try {
      await adapter.connect();
      const verified = await adapter.verifyProfile(account.username);
      await adapter.disconnect();

      console.log(`${getPlatformDisplayName(account.platform)} (${account.username})`);
      
      if (verified) {
        const now = new Date().toISOString();
        db.prepare('UPDATE platform_accounts SET last_verified_at = ? WHERE id = ?')
          .run(now, account.id);
        console.log('✓ Verified\n');
      } else {
        console.log('✗ Verification failed\n');
      }
    } catch (error) {
      console.log(`${getPlatformDisplayName(account.platform)} (${account.username})`);
      console.log(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }
}
