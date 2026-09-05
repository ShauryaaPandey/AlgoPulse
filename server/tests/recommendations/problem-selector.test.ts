import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { ProblemSelector } from '../../src/recommendations/problem-selector.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL,
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE platform_accounts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, platform TEXT NOT NULL,
      username TEXT NOT NULL, connected_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE problems (
      id TEXT PRIMARY KEY, platform TEXT NOT NULL, external_id TEXT NOT NULL,
      title TEXT NOT NULL, url TEXT, difficulty TEXT, rating INTEGER,
      description TEXT, created_at TEXT NOT NULL, UNIQUE(platform, external_id)
    );
    CREATE TABLE problem_topics (
      id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, topic TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 1.0,
      FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
    );
    CREATE TABLE submissions (
      id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, platform_account_id TEXT NOT NULL,
      external_submission_id TEXT NOT NULL, submitted_at TEXT NOT NULL,
      language TEXT NOT NULL, verdict TEXT NOT NULL, attempt_number INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
      FOREIGN KEY (platform_account_id) REFERENCES platform_accounts(id) ON DELETE CASCADE
    );
    CREATE TABLE recommendations (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, problem_id TEXT NOT NULL,
      reason TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL, completed_at TEXT
    );
  `);
  return db;
}

function insertUser(db: Database.Database): string {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(id, 'u@t.com', 'U', 'h', now, now);
  return id;
}

function insertAccount(db: Database.Database, userId: string): string {
  const id = uuidv4();
  db.prepare('INSERT INTO platform_accounts VALUES (?,?,?,?,?)').run(id, userId, 'cf', 'user', new Date().toISOString());
  return id;
}

function insertProblem(db: Database.Database, platform: string, externalId: string, rating: number, topics: string[]): string {
  const id = uuidv4();
  db.prepare('INSERT INTO problems (id,platform,external_id,title,rating,created_at) VALUES (?,?,?,?,?,?)').run(
    id, platform, externalId, `Problem ${externalId}`, rating, new Date().toISOString()
  );
  for (const topic of topics) {
    db.prepare('INSERT INTO problem_topics VALUES (?,?,?,?)').run(uuidv4(), id, topic, 1.0);
  }
  return id;
}

function insertSubmission(db: Database.Database, platformAccountId: string, problemId: string, verdict: string): void {
  db.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,?,?)').run(
    uuidv4(), problemId, platformAccountId, uuidv4(), new Date().toISOString(), 'C++', verdict, 1
  );
}

describe('ProblemSelector', () => {
  let db: Database.Database;
  let userId: string;
  let accountId: string;

  beforeEach(() => {
    db = setupDb();
    userId = insertUser(db);
    accountId = insertAccount(db, userId);
  });

  afterEach(() => db.close());

  describe('selectCandidates', () => {
    it('should return problems matching the topic within the rating range', () => {
      insertProblem(db, 'cf', 'P1', 1300, ['graphs']);
      insertProblem(db, 'cf', 'P2', 1600, ['graphs']);
      insertProblem(db, 'cf', 'P3', 2000, ['graphs']);
      insertProblem(db, 'cf', 'P4', 1400, ['dp']);

      const selector = new ProblemSelector(db);
      const results = selector.selectCandidates(userId, ['graphs'], 1200, 1700, 50);

      assert.strictEqual(results.length, 2);
      const ratings = results.map(r => r.rating).sort((a, b) => (a ?? 0) - (b ?? 0));
      assert.deepStrictEqual(ratings, [1300, 1600]);
    });

    it('should exclude already-solved problems', () => {
      const p1 = insertProblem(db, 'cf', 'P1', 1300, ['graphs']);
      const p2 = insertProblem(db, 'cf', 'P2', 1400, ['graphs']);
      insertSubmission(db, accountId, p1, 'Accepted');

      const selector = new ProblemSelector(db);
      const results = selector.selectCandidates(userId, ['graphs'], 1000, 2000, 50);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, p2);
    });

    it('should exclude problems with open recommendations', () => {
      const p1 = insertProblem(db, 'cf', 'P1', 1300, ['graphs']);
      const p2 = insertProblem(db, 'cf', 'P2', 1400, ['graphs']);
      const now = new Date().toISOString();
      db.prepare('INSERT INTO recommendations VALUES (?,?,?,?,?,?,?)').run(
        uuidv4(), userId, p1, 'reason', 100, now, null
      );

      const selector = new ProblemSelector(db);
      const results = selector.selectCandidates(userId, ['graphs'], 1000, 2000, 50);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, p2);
    });

    it('should not exclude completed (solved) recommendations — problem already accepted', () => {
      const p1 = insertProblem(db, 'cf', 'P1', 1300, ['graphs']);
      const p2 = insertProblem(db, 'cf', 'P2', 1400, ['graphs']);
      const now = new Date().toISOString();
      db.prepare('INSERT INTO recommendations VALUES (?,?,?,?,?,?,?)').run(
        uuidv4(), userId, p1, 'reason', 100, now, now
      );

      const selector = new ProblemSelector(db);
      const results = selector.selectCandidates(userId, ['graphs'], 1000, 2000, 50);

      assert.strictEqual(results.length, 2);
    });

    it('should return empty when no topics given', () => {
      insertProblem(db, 'cf', 'P1', 1300, ['graphs']);
      const selector = new ProblemSelector(db);
      assert.deepStrictEqual(selector.selectCandidates(userId, [], 1000, 2000, 50), []);
    });

    it('should attach all topics for a matched problem', () => {
      insertProblem(db, 'cf', 'P1', 1400, ['graphs', 'bfs', 'shortest-path']);
      const selector = new ProblemSelector(db);
      const [result] = selector.selectCandidates(userId, ['graphs'], 1000, 2000, 50);
      assert.ok(result.topics.includes('graphs'));
      assert.ok(result.topics.includes('bfs'));
      assert.ok(result.topics.includes('shortest-path'));
    });

    it('should respect the limit parameter', () => {
      for (let i = 0; i < 20; i++) {
        insertProblem(db, 'cf', `P${i}`, 1300 + i * 10, ['dp']);
      }
      const selector = new ProblemSelector(db);
      const results = selector.selectCandidates(userId, ['dp'], 1000, 2500, 5);
      assert.strictEqual(results.length, 5);
    });
  });

  describe('selectCandidatesForTopic', () => {
    it('should set rating window relative to consistentRating', () => {
      insertProblem(db, 'cf', 'TooEasy', 900, ['binary-search']);
      insertProblem(db, 'cf', 'InRange1', 1400, ['binary-search']);
      insertProblem(db, 'cf', 'InRange2', 1500, ['binary-search']);
      insertProblem(db, 'cf', 'TooHard', 2200, ['binary-search']);

      const selector = new ProblemSelector(db);
      const results = selector.selectCandidatesForTopic(userId, 'binary-search', 1400, 10);

      const ratings = results.map(r => r.rating ?? 0);
      assert.ok(ratings.every(r => r >= 1300 && r <= 1700), `Ratings out of range: ${ratings}`);
    });
  });

  describe('selectFailedProblemsForRevision', () => {
    it('should return only problems that have been failed and never accepted', () => {
      const failed = insertProblem(db, 'cf', 'Failed', 1300, ['dp']);
      const solved = insertProblem(db, 'cf', 'Solved', 1400, ['dp']);

      insertSubmission(db, accountId, failed, 'Wrong Answer');
      insertSubmission(db, accountId, solved, 'Wrong Answer');
      insertSubmission(db, accountId, solved, 'Accepted');

      const selector = new ProblemSelector(db);
      const results = selector.selectFailedProblemsForRevision(userId, ['dp']);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, failed);
    });

    it('should return empty when all attempted problems are solved', () => {
      const p = insertProblem(db, 'cf', 'P1', 1300, ['dp']);
      insertSubmission(db, accountId, p, 'Wrong Answer');
      insertSubmission(db, accountId, p, 'Accepted');

      const selector = new ProblemSelector(db);
      const results = selector.selectFailedProblemsForRevision(userId, ['dp']);

      assert.strictEqual(results.length, 0);
    });

    it('should return empty when no topics given', () => {
      const selector = new ProblemSelector(db);
      assert.deepStrictEqual(selector.selectFailedProblemsForRevision(userId, []), []);
    });
  });
});
