import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Platform } from '../../src/config/constants.js';
import { parseUrl } from '../../src/profiles/url-parser.js';
import { extractUsername } from '../../src/profiles/username-extractor.js';

describe('extractUsername', () => {
  describe('Codeforces username extraction', () => {
    it('should extract username from /profile/<username>', () => {
      const parsed = parseUrl('https://codeforces.com/profile/tourist')!;
      const username = extractUsername(Platform.CODEFORCES, parsed);
      assert.equal(username, 'tourist');
    });

    it('should extract username with numbers', () => {
      const parsed = parseUrl('https://codeforces.com/profile/user123')!;
      const username = extractUsername(Platform.CODEFORCES, parsed);
      assert.equal(username, 'user123');
    });

    it('should extract username with underscores', () => {
      const parsed = parseUrl('https://codeforces.com/profile/user_name')!;
      const username = extractUsername(Platform.CODEFORCES, parsed);
      assert.equal(username, 'user_name');
    });

    it('should return null for invalid path', () => {
      const parsed = parseUrl('https://codeforces.com/contests')!;
      const username = extractUsername(Platform.CODEFORCES, parsed);
      assert.equal(username, null);
    });

    it('should return null for empty username', () => {
      const parsed = parseUrl('https://codeforces.com/profile/')!;
      const username = extractUsername(Platform.CODEFORCES, parsed);
      assert.equal(username, null);
    });
  });

  describe('LeetCode username extraction', () => {
    it('should extract username from /u/<username>/', () => {
      const parsed = parseUrl('https://leetcode.com/u/username/')!;
      const username = extractUsername(Platform.LEETCODE, parsed);
      assert.equal(username, 'username');
    });

    it('should extract username without trailing slash', () => {
      const parsed = parseUrl('https://leetcode.com/u/username')!;
      const username = extractUsername(Platform.LEETCODE, parsed);
      assert.equal(username, 'username');
    });

    it('should extract username with hyphens', () => {
      const parsed = parseUrl('https://leetcode.com/u/user-name/')!;
      const username = extractUsername(Platform.LEETCODE, parsed);
      assert.equal(username, 'user-name');
    });

    it('should return null for invalid path', () => {
      const parsed = parseUrl('https://leetcode.com/problems/')!;
      const username = extractUsername(Platform.LEETCODE, parsed);
      assert.equal(username, null);
    });

    it('should return null for empty username', () => {
      const parsed = parseUrl('https://leetcode.com/u/')!;
      const username = extractUsername(Platform.LEETCODE, parsed);
      assert.equal(username, null);
    });
  });

  describe('CodeChef username extraction', () => {
    it('should extract username from /users/<username>', () => {
      const parsed = parseUrl('https://www.codechef.com/users/chef123')!;
      const username = extractUsername(Platform.CODECHEF, parsed);
      assert.equal(username, 'chef123');
    });

    it('should extract username with trailing slash', () => {
      const parsed = parseUrl('https://www.codechef.com/users/chef123/')!;
      const username = extractUsername(Platform.CODECHEF, parsed);
      assert.equal(username, 'chef123');
    });

    it('should extract username with underscores', () => {
      const parsed = parseUrl('https://www.codechef.com/users/chef_123')!;
      const username = extractUsername(Platform.CODECHEF, parsed);
      assert.equal(username, 'chef_123');
    });

    it('should return null for invalid path', () => {
      const parsed = parseUrl('https://www.codechef.com/contests')!;
      const username = extractUsername(Platform.CODECHEF, parsed);
      assert.equal(username, null);
    });

    it('should return null for empty username', () => {
      const parsed = parseUrl('https://www.codechef.com/users/')!;
      const username = extractUsername(Platform.CODECHEF, parsed);
      assert.equal(username, null);
    });
  });

  describe('edge cases', () => {
    it('should handle username with special characters in Codeforces', () => {
      const parsed = parseUrl('https://codeforces.com/profile/user.name')!;
      const username = extractUsername(Platform.CODEFORCES, parsed);
      assert.equal(username, 'user.name');
    });

    it('should handle complex usernames', () => {
      const parsed = parseUrl('https://leetcode.com/u/User_Name-123/')!;
      const username = extractUsername(Platform.LEETCODE, parsed);
      assert.equal(username, 'User_Name-123');
    });

    it('should not extract from wrong path structure', () => {
      const parsed = parseUrl('https://codeforces.com/contest/123/problem/A')!;
      const username = extractUsername(Platform.CODEFORCES, parsed);
      assert.equal(username, null);
    });
  });
});
