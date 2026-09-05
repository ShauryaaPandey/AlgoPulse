import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Platform } from '../../src/config/constants.js';
import { parseUrl } from '../../src/profiles/url-parser.js';
import { detectPlatform } from '../../src/profiles/platform-detector.js';

describe('detectPlatform', () => {
  describe('Codeforces detection', () => {
    it('should detect codeforces.com', () => {
      const parsed = parseUrl('https://codeforces.com/profile/tourist')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, Platform.CODEFORCES);
    });

    it('should detect www.codeforces.com', () => {
      const parsed = parseUrl('https://www.codeforces.com/profile/tourist')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, Platform.CODEFORCES);
    });

    it('should be case insensitive', () => {
      const parsed = parseUrl('https://CodeForces.com/profile/tourist')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, Platform.CODEFORCES);
    });
  });

  describe('LeetCode detection', () => {
    it('should detect leetcode.com', () => {
      const parsed = parseUrl('https://leetcode.com/u/username/')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, Platform.LEETCODE);
    });

    it('should detect www.leetcode.com', () => {
      const parsed = parseUrl('https://www.leetcode.com/u/username/')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, Platform.LEETCODE);
    });

    it('should be case insensitive', () => {
      const parsed = parseUrl('https://LeetCode.com/u/username/')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, Platform.LEETCODE);
    });
  });

  describe('CodeChef detection', () => {
    it('should detect codechef.com', () => {
      const parsed = parseUrl('https://codechef.com/users/chef123')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, Platform.CODECHEF);
    });

    it('should detect www.codechef.com', () => {
      const parsed = parseUrl('https://www.codechef.com/users/chef123')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, Platform.CODECHEF);
    });

    it('should be case insensitive', () => {
      const parsed = parseUrl('https://CodeChef.com/users/chef123')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, Platform.CODECHEF);
    });
  });

  describe('unsupported platforms', () => {
    it('should return null for unknown domains', () => {
      const parsed = parseUrl('https://example.com/profile/user')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, null);
    });

    it('should return null for atcoder', () => {
      const parsed = parseUrl('https://atcoder.jp/users/user')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, null);
    });

    it('should return null for hackerrank', () => {
      const parsed = parseUrl('https://hackerrank.com/profile/user')!;
      const platform = detectPlatform(parsed);
      assert.equal(platform, null);
    });
  });
});
