import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logger } from '../src/utils/logger.js';
import {
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
  PlatformError,
  RateLimitError,
} from '../src/utils/errors.js';
import { retry } from '../src/utils/retry.js';
import {
  daysSince,
  toMonthBucket,
  formatDate,
  startOfDayUtc,
  groupByMonth,
} from '../src/utils/dates.js';
import { Platform, Verdict, DEFAULT_RATE_LIMITS } from '../src/config/constants.js';
import { getDb } from '../src/db/sqlite.js';
import { runMigrations } from '../src/db/migrator.js';

describe('AlgoPulse Foundational Layer', () => {
  it('loads constants correctly', () => {
    assert.deepEqual(Object.values(Platform), ['codeforces', 'leetcode', 'codechef']);
    assert.equal(Verdict.ACCEPTED, 'Accepted');
    assert.equal(Verdict.WRONG_ANSWER, 'Wrong Answer');
    assert.ok(DEFAULT_RATE_LIMITS[Platform.CODEFORCES].windowMs > 0);
  });

  it('instantiates custom errors with correct status and codes', () => {
    const valErr = new ValidationError('Invalid email', { field: 'email' });
    assert.equal(valErr.statusCode, 400);
    assert.equal(valErr.code, 'VALIDATION_ERROR');

    const authErr = new AuthError('Unauthorized access');
    assert.equal(authErr.statusCode, 401);
    assert.equal(authErr.code, 'AUTH_ERROR');

    const notFoundErr = new NotFoundError('Problem', 'Problem not found');
    assert.equal(notFoundErr.statusCode, 404);
    assert.equal(notFoundErr.code, 'NOT_FOUND');
    assert.equal(notFoundErr.resource, 'Problem');

    const platErr = new PlatformError('codeforces', 'API rate limited');
    assert.equal(platErr.statusCode, 502);
    assert.equal(platErr.platform, 'codeforces');

    const rateErr = new RateLimitError('Limit hit', 3000);
    assert.equal(rateErr.statusCode, 429);
    assert.equal(rateErr.retryAfterMs, 3000);
  });

  it('formats dates and month buckets correctly', () => {
    const dSince = daysSince('2026-09-01T00:00:00Z', '2026-09-05T00:00:00Z');
    assert.equal(dSince, 4);

    const bucket = toMonthBucket('2026-09-05T12:00:00Z');
    assert.equal(bucket, '2026-09');

    const items = [
      { date: '2026-08-10', val: 1 },
      { date: '2026-09-01', val: 2 },
      { date: '2026-09-15', val: 3 },
    ];
    const grouped = groupByMonth(items, (i) => i.date);
    assert.equal(grouped['2026-08']?.length, 1);
    assert.equal(grouped['2026-09']?.length, 2);
  });

  it('retries failing async actions with backoff', async () => {
    let attempts = 0;
    const result = await retry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      },
      { maxRetries: 3, initialDelayMs: 20, backoffFactor: 1.2 }
    );

    assert.equal(result, 'success');
    assert.equal(attempts, 3);
  });

  it('initializes sqlite database and schema correctly', () => {
    const db = getDb();
    const result = runMigrations(db);
    assert.ok(result.totalMigrations >= 1);

    const requiredTables = [
      'users',
      'platform_accounts',
      'problems',
      'problem_topics',
      'submissions',
      'contests',
      'contest_problems',
      'contest_submissions',
      'skill_scores',
      'skill_history',
      'failure_patterns',
      'recommendations',
      'sync_state',
    ];

    const existingTables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[]
    ).map((r) => r.name);

    for (const table of requiredTables) {
      assert.ok(existingTables.includes(table), `Expected table "${table}" to exist`);
    }
  });
});
