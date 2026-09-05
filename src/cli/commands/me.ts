import { requireAuth } from '../../auth/middleware.js';
import { getDb } from '../../db/sqlite.js';
import type { PlatformAccount } from '../../types/platform.js';

function formatPlatformUrl(platform: string, username: string): string {
  switch (platform) {
    case 'codeforces':
      return `codeforces.com/profile/${username}`;
    case 'leetcode':
      return `leetcode.com/u/${username}/`;
    case 'codechef':
      return `www.codechef.com/users/${username}`;
    default:
      return username;
  }
}

function getPlatformDisplayName(platform: string): string {
  switch (platform) {
    case 'codeforces':
      return 'Codeforces';
    case 'leetcode':
      return 'LeetCode';
    case 'codechef':
      return 'CodeChef';
    default:
      return platform;
  }
}

export async function meCommand(): Promise<void> {
  const user = requireAuth();
  const db = getDb();

  console.log('╭────────────────────────────────────╮');
  console.log('│          ALGOPULSE ACCOUNT         │');
  console.log('╰────────────────────────────────────╯');
  console.log(`Name       ${user.name}`);
  console.log(`Email      ${user.email}`);
  console.log('\nCONNECTED PROFILES');
  
  const accounts = db
    .prepare('SELECT * FROM platform_accounts WHERE user_id = ? ORDER BY platform, username')
    .all(user.id) as PlatformAccount[];

  if (accounts.length === 0) {
    console.log('(No connected profiles yet)');
  } else {
    for (const account of accounts) {
      console.log(getPlatformDisplayName(account.platform));
      console.log(`→ ${formatPlatformUrl(account.platform, account.username)}`);
    }
  }
}
