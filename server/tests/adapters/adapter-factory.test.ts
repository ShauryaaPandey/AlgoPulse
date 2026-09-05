import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createAdapter } from '../../src/adapters/index.js';
import { CodeforcesAdapter } from '../../src/adapters/codeforces/adapter.js';
import { LeetCodeAdapter } from '../../src/adapters/leetcode/adapter.js';
import { CodeChefAdapter } from '../../src/adapters/codechef/adapter.js';

describe('Adapter Factory (createAdapter)', () => {
  it('should return a CodeforcesAdapter for platform "codeforces"', () => {
    const adapter = createAdapter('codeforces', 'tourist');
    assert.ok(adapter instanceof CodeforcesAdapter, 'Expected CodeforcesAdapter instance');
  });

  it('should return a LeetCodeAdapter for platform "leetcode"', () => {
    const adapter = createAdapter('leetcode', 'torvalds');
    assert.ok(adapter instanceof LeetCodeAdapter, 'Expected LeetCodeAdapter instance');
  });

  it('should return a CodeChefAdapter for platform "codechef"', () => {
    const adapter = createAdapter('codechef', 'gennady');
    assert.ok(adapter instanceof CodeChefAdapter, 'Expected CodeChefAdapter instance');
  });

  it('should return null for an unknown platform', () => {
    const adapter = createAdapter('atcoder', 'user');
    assert.strictEqual(adapter, null);
  });

  it('should return null for an empty platform string', () => {
    const adapter = createAdapter('', 'user');
    assert.strictEqual(adapter, null);
  });

  it('each adapter should satisfy the PlatformAdapter interface', () => {
    const methods = ['connect', 'verifyProfile', 'getProfile', 'getSubmissions', 'getContests', 'getProblems', 'disconnect'];

    for (const [platform, username] of [['codeforces', 'u'], ['leetcode', 'u'], ['codechef', 'u']] as const) {
      const adapter = createAdapter(platform, username)!;
      for (const method of methods) {
        assert.strictEqual(typeof (adapter as unknown as Record<string, unknown>)[method], 'function',
          `${platform} adapter missing method: ${method}`);
      }
    }
  });
});
