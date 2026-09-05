import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('vector-search (unit — filter and URL logic)', () => {
  it('should build codeforces URL from problem ID', () => {
    const buildUrl = (platform: string, problemId: string): string | null => {
      if (platform === 'codeforces') {
        const match = problemId.match(/^(\d+)([A-Z].*)$/);
        if (match) return `https://codeforces.com/problemset/problem/${match[1]}/${match[2]}`;
        return null;
      }
      if (platform === 'leetcode') return `https://leetcode.com/problems/${problemId}/`;
      if (platform === 'codechef') return `https://www.codechef.com/problems/${problemId}`;
      return null;
    };

    assert.strictEqual(buildUrl('codeforces', '1234A'), 'https://codeforces.com/problemset/problem/1234/A');
    assert.strictEqual(buildUrl('codeforces', '999B1'), 'https://codeforces.com/problemset/problem/999/B1');
    assert.strictEqual(buildUrl('codeforces', 'INVALID'), null);
    assert.strictEqual(buildUrl('leetcode', 'two-sum'), 'https://leetcode.com/problems/two-sum/');
    assert.strictEqual(buildUrl('codechef', 'ADDTWO'), 'https://www.codechef.com/problems/ADDTWO');
    assert.strictEqual(buildUrl('unknown', 'foo'), null);
  });

  it('should exclude solved problems from results by checking the set', () => {
    const solvedIds = new Set(['p1', 'p2', 'p3']);

    const rawResults = [
      { problemId: 'p1', title: 'Already solved' },
      { problemId: 'p4', title: 'New problem' },
      { problemId: 'p2', title: 'Also solved' },
      { problemId: 'p5', title: 'Another new problem' }
    ];

    const filtered = rawResults.filter(r => !solvedIds.has(r.problemId));
    assert.strictEqual(filtered.length, 2);
    assert.ok(filtered.every(r => !solvedIds.has(r.problemId)));
  });

  it('should apply topic filter correctly in filter clause construction', () => {
    interface Filter { topic?: string; platform?: string; difficulty?: string; minRating?: number; maxRating?: number }

    function buildFilterClauses(filters: Filter): Record<string, unknown>[] {
      const clauses: Record<string, unknown>[] = [];
      if (filters.topic) clauses.push({ topics: filters.topic });
      if (filters.platform) clauses.push({ platform: filters.platform });
      if (filters.difficulty) clauses.push({ difficulty: filters.difficulty });
      if (filters.minRating !== undefined || filters.maxRating !== undefined) {
        const rf: Record<string, number> = {};
        if (filters.minRating !== undefined) rf['$gte'] = filters.minRating;
        if (filters.maxRating !== undefined) rf['$lte'] = filters.maxRating;
        clauses.push({ rating: rf });
      }
      return clauses;
    }

    const c1 = buildFilterClauses({ topic: 'Graphs' });
    assert.strictEqual(c1.length, 1);
    assert.deepStrictEqual(c1[0], { topics: 'Graphs' });

    const c2 = buildFilterClauses({ platform: 'leetcode', minRating: 1200, maxRating: 1800 });
    assert.strictEqual(c2.length, 2);
    assert.deepStrictEqual(c2[0], { platform: 'leetcode' });
    assert.deepStrictEqual(c2[1], { rating: { $gte: 1200, $lte: 1800 } });

    const c3 = buildFilterClauses({});
    assert.strictEqual(c3.length, 0);
  });

  it('should correctly cap limit to avoid overfetching', () => {
    const requested = 25;
    const maxAllowed = 50;
    const actual = Math.min(maxAllowed, Math.max(1, requested));
    assert.strictEqual(actual, 25);

    assert.strictEqual(Math.min(50, Math.max(1, 0)), 1);
    assert.strictEqual(Math.min(50, Math.max(1, 200)), 50);
  });
});
