import { Platform } from '../config/constants.js';
import type { PlatformAdapter } from './interface.js';
import { CodeforcesAdapter } from './codeforces/adapter.js';
import { LeetCodeAdapter } from './leetcode/adapter.js';
import { CodeChefAdapter } from './codechef/adapter.js';

export function createAdapter(platform: string, username: string): PlatformAdapter | null {
  switch (platform) {
    case Platform.CODEFORCES:
      return new CodeforcesAdapter(username);
    case Platform.LEETCODE:
      return new LeetCodeAdapter(username);
    case Platform.CODECHEF:
      return new CodeChefAdapter(username);
    default:
      return null;
  }
}

export { CodeforcesAdapter, LeetCodeAdapter, CodeChefAdapter };
