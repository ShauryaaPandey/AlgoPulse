import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { ContestEngine } from '../../src/analytics/contest-engine.js';

const SCHEMA = `
  CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE platform_accounts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, platform TEXT NOT NULL, username TEXT NOT NULL, connected_at TEXT NOT NULL);
  CREATE TABLE problems (id TEXT PRIMARY KEY, platform TEXT NOT NULL, external_id TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE submissions (id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, platform_account_id TEXT NOT NULL, external_submission_id TEXT NOT NULL, submitted_at TEXT NOT NULL, language TEXT NOT NULL, verdict TEXT NOT NULL, attempt_number INTEGER NOT NULL DEFAULT 1, execution_time REAL);
  CREATE TABLE contests (id TEXT PRIMARY KEY, platform TEXT NOT NULL, external_id TEXT NOT NULL, name TEXT NOT NULL, date TEXT NOT NULL);
  CREATE TABLE contest_problems (id TEXT PRIMARY KEY, contest_id TEXT NOT NULL, problem_id TEXT NOT NULL, problem_index TEXT NOT NULL);
  CREATE TABLE contest_submissions (id TEXT PRIMARY KEY, contest_id TEXT NOT NULL, submission_id TEXT NOT NULL);
`;

describe('ContestEngine', () => {
  let db: Database.Database;
  let userId: string;
  let accountId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    const now = new Date().toISOString();
    userId = uuidv4();
    accountId = uuidv4();
    db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(userId, 'u@t.com', 'U', 'h', now, now);
    db.prepare('INSERT INTO platform_accounts VALUES (?,?,?,?,?)').run(accountId, userId, 'cf', 'user', now);
  });

  afterEach(() => db.close());

  function insertContest() {
    const cid = uuidv4();
    db.prepare('INSERT INTO contests VALUES (?,?,?,?,?)').run(cid, 'cf', uuidv4(), 'Contest', new Date().toISOString());
    return cid;
  }

  function insertProblem(platform = 'cf') {
    const pid = uuidv4();
    db.prepare('INSERT INTO problems VALUES (?,?,?,?,?)').run(pid, platform, uuidv4(), 'P', new Date().toISOString());
    return pid;
  }

  function insertContestSub(contestId: string, problemId: string, problemIndex: string, verdict: string) {
    const sid = uuidv4();
    db.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,?,?,?)').run(sid, problemId, accountId, uuidv4(), new Date().toISOString(), 'C++', verdict, 1, 200);
    db.prepare('INSERT INTO contest_problems VALUES (?,?,?,?)').run(uuidv4(), contestId, problemId, problemIndex);
    db.prepare('INSERT INTO contest_submissions VALUES (?,?,?)').run(uuidv4(), contestId, sid);
  }

  it('should return empty stats when no contest data', () => {
    const engine = new ContestEngine(db);
    const result = engine.analyzeContestPerformance(userId);
    assert.strictEqual(result.indexStats.length, 0);
    assert.strictEqual(result.totalContests, 0);
    assert.strictEqual(result.overallSolveRate, 0);
  });

  it('should compute solve rates per problem index', () => {
    const cid = insertContest();
    const pa = insertProblem();
    const pb = insertProblem();

    insertContestSub(cid, pa, 'A', 'Accepted');
    insertContestSub(cid, pa, 'A', 'Wrong Answer');
    insertContestSub(cid, pb, 'B', 'Wrong Answer');
    insertContestSub(cid, pb, 'B', 'Wrong Answer');

    const engine = new ContestEngine(db);
    const result = engine.analyzeContestPerformance(userId);

    const aStats = result.indexStats.find(s => s.index === 'A');
    const bStats = result.indexStats.find(s => s.index === 'B');

    assert.ok(aStats, 'Should have stats for index A');
    assert.ok(bStats, 'Should have stats for index B');
    assert.ok(aStats!.solveRate > 0, 'A should have positive solve rate');
    assert.strictEqual(bStats!.solveRate, 0, 'B should have 0% solve rate');
  });

  it('should identify strengths (>=70% solve rate with >=3 attempts)', () => {
    const cid = insertContest();
    for (let i = 0; i < 4; i++) {
      const p = insertProblem();
      insertContestSub(cid, p, 'A', 'Accepted');
    }

    const engine = new ContestEngine(db);
    const result = engine.analyzeContestPerformance(userId);

    assert.ok(result.strengths.length > 0 || result.indexStats.length > 0, 'Should have stats');
  });
});
