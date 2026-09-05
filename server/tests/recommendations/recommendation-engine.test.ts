import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { RecommendationEngine } from '../../src/recommendations/recommendation-engine.js';

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
    CREATE TABLE skill_scores (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL,
      score REAL NOT NULL, confidence REAL NOT NULL DEFAULT 1.0, updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE(user_id, topic)
    );
    CREATE TABLE skill_history (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL,
      score REAL NOT NULL, timestamp TEXT NOT NULL
    );
    CREATE TABLE failure_patterns (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL,
      failure_type TEXT NOT NULL, frequency INTEGER NOT NULL DEFAULT 1,
      severity REAL NOT NULL DEFAULT 1.0, first_detected TEXT NOT NULL, last_detected TEXT NOT NULL
    );
    CREATE TABLE recommendations (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, problem_id TEXT NOT NULL,
      reason TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL, completed_at TEXT
    );
    CREATE TABLE contests (
      id TEXT PRIMARY KEY, platform TEXT NOT NULL, external_id TEXT NOT NULL,
      name TEXT NOT NULL, date TEXT NOT NULL
    );
    CREATE TABLE contest_problems (
      id TEXT PRIMARY KEY, contest_id TEXT NOT NULL, problem_id TEXT NOT NULL, problem_index TEXT NOT NULL
    );
    CREATE TABLE contest_submissions (
      id TEXT PRIMARY KEY, contest_id TEXT NOT NULL, submission_id TEXT NOT NULL
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

function insertProblem(db: Database.Database, externalId: string, rating: number, topics: string[]): string {
  const id = uuidv4();
  db.prepare('INSERT INTO problems (id,platform,external_id,title,rating,created_at) VALUES (?,?,?,?,?,?)').run(
    id, 'cf', externalId, `Problem ${externalId}`, rating, new Date().toISOString()
  );
  for (const topic of topics) {
    db.prepare('INSERT INTO problem_topics VALUES (?,?,?,?)').run(uuidv4(), id, topic, 1.0);
  }
  return id;
}

function insertSubmissions(db: Database.Database, accountId: string, problemId: string, verdicts: string[]): void {
  for (const verdict of verdicts) {
    db.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,?,?)').run(
      uuidv4(), problemId, accountId, uuidv4(), new Date().toISOString(), 'C++', verdict, 1
    );
  }
}

function insertSkillScore(db: Database.Database, userId: string, topic: string, score: number): void {
  const now = new Date().toISOString();
  db.prepare('INSERT OR REPLACE INTO skill_scores VALUES (?,?,?,?,?,?)').run(uuidv4(), userId, topic, score, 0.8, now);
  db.prepare('INSERT INTO skill_history VALUES (?,?,?,?,?)').run(uuidv4(), userId, topic, score, now);
}

describe('RecommendationEngine', () => {
  let db: Database.Database;
  let userId: string;
  let accountId: string;

  beforeEach(() => {
    db = setupDb();
    userId = insertUser(db);
    accountId = insertAccount(db, userId);
  });

  afterEach(() => db.close());

  describe('generateRecommendations', () => {
    it('should produce recommendations ranked highest priority first', () => {
      const topics = ['graphs', 'dp', 'binary-search'];

      for (const topic of topics) {
        const p = insertProblem(db, `unsolved-${topic}`, 1400, [topic]);
        for (let i = 0; i < 10; i++) {
          insertSubmissions(db, accountId, p, i < 3 ? ['Accepted'] : ['Wrong Answer']);
        }
        insertSkillScore(db, userId, topic, topic === 'graphs' ? 20 : topic === 'dp' ? 35 : 50);
      }

      const engine = new RecommendationEngine(db);
      const recs = engine.generateRecommendations(userId);

      if (recs.length > 1) {
        for (let i = 0; i < recs.length - 1; i++) {
          assert.ok(
            recs[i].priority >= recs[i + 1].priority,
            `Rec[${i}] priority ${recs[i].priority} < rec[${i + 1}] priority ${recs[i + 1].priority}`
          );
        }
      }
    });

    it('should not create duplicate open recommendations for the same problem', () => {
      const problemId = insertProblem(db, 'target', 1400, ['graphs']);
      for (let i = 0; i < 5; i++) {
        insertSubmissions(db, accountId, problemId, ['Wrong Answer']);
      }
      insertSkillScore(db, userId, 'graphs', 20);

      const engine = new RecommendationEngine(db);
      engine.generateRecommendations(userId);
      engine.generateRecommendations(userId);

      const count = db.prepare(
        'SELECT COUNT(*) as c FROM recommendations WHERE user_id = ? AND problem_id = ? AND completed_at IS NULL'
      ).get(userId, problemId) as { c: number };

      assert.strictEqual(count.c, 1);
    });

    it('should persist recommendations to the database', () => {
      const p = insertProblem(db, 'persist-test', 1400, ['graphs']);
      for (let i = 0; i < 5; i++) {
        insertSubmissions(db, accountId, p, ['Wrong Answer']);
      }
      insertSkillScore(db, userId, 'graphs', 20);

      const engine = new RecommendationEngine(db);
      engine.generateRecommendations(userId);

      const row = db.prepare(
        'SELECT * FROM recommendations WHERE user_id = ?'
      ).get(userId) as any;

      assert.ok(row, 'Expected at least one recommendation in DB');
      assert.strictEqual(row.user_id, userId);
      assert.ok(row.reason.length > 0);
      assert.ok(row.priority > 0);
      assert.strictEqual(row.completed_at, null);
    });

    it('should return empty array when there is no submission data', () => {
      const engine = new RecommendationEngine(db);
      const recs = engine.generateRecommendations(userId);
      assert.strictEqual(recs.length, 0);
    });
  });

  describe('getOpenRecommendations', () => {
    it('should only return open (not completed) recommendations', () => {
      const p1 = insertProblem(db, 'open', 1300, ['graphs']);
      const p2 = insertProblem(db, 'done', 1400, ['graphs']);
      const now = new Date().toISOString();

      db.prepare('INSERT INTO recommendations VALUES (?,?,?,?,?,?,?)').run(uuidv4(), userId, p1, 'reason', 100, now, null);
      db.prepare('INSERT INTO recommendations VALUES (?,?,?,?,?,?,?)').run(uuidv4(), userId, p2, 'reason', 90, now, now);

      const engine = new RecommendationEngine(db);
      const open = engine.getOpenRecommendations(userId);

      assert.strictEqual(open.length, 1);
      assert.strictEqual(open[0].problemId, p1);
    });

    it('should return results ordered by priority descending', () => {
      const now = new Date().toISOString();
      const priorities = [50, 900, 300, 700];

      for (const priority of priorities) {
        const p = insertProblem(db, `p-${priority}`, 1300, ['math']);
        db.prepare('INSERT INTO recommendations VALUES (?,?,?,?,?,?,?)').run(uuidv4(), userId, p, 'r', priority, now, null);
      }

      const engine = new RecommendationEngine(db);
      const open = engine.getOpenRecommendations(userId);

      const returned = open.map(r => r.priority);
      const sorted = [...returned].sort((a, b) => b - a);
      assert.deepStrictEqual(returned, sorted);
    });
  });

  describe('dismiss', () => {
    it('should mark a recommendation as completed', () => {
      const p = insertProblem(db, 'dismiss-me', 1300, ['graphs']);
      const now = new Date().toISOString();
      const recId = uuidv4();
      db.prepare('INSERT INTO recommendations VALUES (?,?,?,?,?,?,?)').run(recId, userId, p, 'r', 100, now, null);

      const engine = new RecommendationEngine(db);
      const result = engine.dismiss(recId, userId);

      assert.strictEqual(result, true);

      const row = db.prepare('SELECT completed_at FROM recommendations WHERE id = ?').get(recId) as any;
      assert.ok(row.completed_at !== null);
    });

    it('should return false when recommendation does not belong to user', () => {
      const p = insertProblem(db, 'other', 1300, ['graphs']);
      const now = new Date().toISOString();
      const recId = uuidv4();
      const otherId = uuidv4();
      const otherNow = new Date().toISOString();
      db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(otherId, 'other@t.com', 'O', 'h', otherNow, otherNow);
      db.prepare('INSERT INTO recommendations VALUES (?,?,?,?,?,?,?)').run(recId, otherId, p, 'r', 100, now, null);

      const engine = new RecommendationEngine(db);
      const result = engine.dismiss(recId, userId);

      assert.strictEqual(result, false);
    });

    it('should return false when recommendation is already completed', () => {
      const p = insertProblem(db, 'already-done', 1300, ['graphs']);
      const now = new Date().toISOString();
      const recId = uuidv4();
      db.prepare('INSERT INTO recommendations VALUES (?,?,?,?,?,?,?)').run(recId, userId, p, 'r', 100, now, now);

      const engine = new RecommendationEngine(db);
      const result = engine.dismiss(recId, userId);

      assert.strictEqual(result, false);
    });
  });

  describe('autoCompleteForSolvedProblems', () => {
    it('should mark matching open recommendations as completed', () => {
      const p1 = insertProblem(db, 'ac1', 1300, ['graphs']);
      const p2 = insertProblem(db, 'ac2', 1400, ['graphs']);
      const now = new Date().toISOString();

      db.prepare('INSERT INTO recommendations VALUES (?,?,?,?,?,?,?)').run(uuidv4(), userId, p1, 'r', 100, now, null);
      db.prepare('INSERT INTO recommendations VALUES (?,?,?,?,?,?,?)').run(uuidv4(), userId, p2, 'r', 100, now, null);

      const engine = new RecommendationEngine(db);
      const count = engine.autoCompleteForSolvedProblems(userId, [p1]);

      assert.strictEqual(count, 1);

      const openCount = db.prepare(
        'SELECT COUNT(*) as c FROM recommendations WHERE user_id = ? AND completed_at IS NULL'
      ).get(userId) as { c: number };
      assert.strictEqual(openCount.c, 1);
    });

    it('should return 0 when no matching open recommendations exist', () => {
      const p = insertProblem(db, 'nomatch', 1300, ['graphs']);
      const engine = new RecommendationEngine(db);
      const count = engine.autoCompleteForSolvedProblems(userId, [p]);
      assert.strictEqual(count, 0);
    });

    it('should return 0 when given empty array', () => {
      const engine = new RecommendationEngine(db);
      const count = engine.autoCompleteForSolvedProblems(userId, []);
      assert.strictEqual(count, 0);
    });

    it('should not affect other users recommendations', () => {
      const p = insertProblem(db, 'cross-user', 1300, ['graphs']);
      const now = new Date().toISOString();
      const otherId = uuidv4();
      const otherNow = new Date().toISOString();
      db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(otherId, 'x@t.com', 'X', 'h', otherNow, otherNow);
      db.prepare('INSERT INTO recommendations VALUES (?,?,?,?,?,?,?)').run(uuidv4(), otherId, p, 'r', 100, now, null);

      const engine = new RecommendationEngine(db);
      engine.autoCompleteForSolvedProblems(userId, [p]);

      const row = db.prepare(
        'SELECT completed_at FROM recommendations WHERE user_id = ? AND problem_id = ?'
      ).get(otherId, p) as any;
      assert.strictEqual(row.completed_at, null);
    });
  });
});
