import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseUrl } from '../../src/profiles/url-parser.js';

describe('parseUrl', () => {
  describe('valid URLs', () => {
    it('should parse HTTPS URLs correctly', () => {
      const result = parseUrl('https://codeforces.com/profile/tourist');
      assert.notEqual(result, null);
      assert.equal(result?.protocol, 'https:');
      assert.equal(result?.hostname, 'codeforces.com');
      assert.equal(result?.pathname, '/profile/tourist');
    });

    it('should parse HTTP URLs correctly', () => {
      const result = parseUrl('http://codeforces.com/profile/tourist');
      assert.notEqual(result, null);
      assert.equal(result?.protocol, 'http:');
      assert.equal(result?.hostname, 'codeforces.com');
      assert.equal(result?.pathname, '/profile/tourist');
    });

    it('should auto-prepend https:// for URLs without protocol', () => {
      const result = parseUrl('codeforces.com/profile/tourist');
      assert.notEqual(result, null);
      assert.equal(result?.protocol, 'https:');
      assert.equal(result?.hostname, 'codeforces.com');
      assert.equal(result?.pathname, '/profile/tourist');
    });

    it('should handle URLs with www prefix', () => {
      const result = parseUrl('www.leetcode.com/u/username/');
      assert.notEqual(result, null);
      assert.equal(result?.hostname, 'www.leetcode.com');
      assert.equal(result?.pathname, '/u/username/');
    });

    it('should handle URLs with trailing slashes', () => {
      const result = parseUrl('https://codechef.com/users/chef123/');
      assert.notEqual(result, null);
      assert.equal(result?.pathname, '/users/chef123/');
    });

    it('should trim whitespace from input', () => {
      const result = parseUrl('  https://codeforces.com/profile/tourist  ');
      assert.notEqual(result, null);
      assert.equal(result?.hostname, 'codeforces.com');
    });
  });

  describe('invalid URLs', () => {
    it('should return null for empty string', () => {
      const result = parseUrl('');
      assert.equal(result, null);
    });

    it('should return null for whitespace only', () => {
      const result = parseUrl('   ');
      assert.equal(result, null);
    });

    it('should return null for invalid URL format', () => {
      const result = parseUrl('not a url at all');
      assert.equal(result, null);
    });

    it('should return null for malformed URLs', () => {
      const result = parseUrl('http://');
      assert.equal(result, null);
    });
  });

  describe('all three platform URL shapes', () => {
    it('should parse Codeforces profile URLs', () => {
      const result = parseUrl('https://codeforces.com/profile/tourist');
      assert.notEqual(result, null);
      assert.equal(result?.hostname, 'codeforces.com');
      assert.equal(result?.pathname, '/profile/tourist');
    });

    it('should parse LeetCode profile URLs', () => {
      const result = parseUrl('https://leetcode.com/u/username/');
      assert.notEqual(result, null);
      assert.equal(result?.hostname, 'leetcode.com');
      assert.equal(result?.pathname, '/u/username/');
    });

    it('should parse CodeChef profile URLs', () => {
      const result = parseUrl('https://www.codechef.com/users/chef123');
      assert.notEqual(result, null);
      assert.equal(result?.hostname, 'www.codechef.com');
      assert.equal(result?.pathname, '/users/chef123');
    });
  });
});
