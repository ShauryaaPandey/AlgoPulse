import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { DifficultyEngine } from '../../src/analytics/difficulty-engine.js';
import { v4 as uuidv4 } from 'uuid';

describe('DifficultyEngine', () => {
  let db: Database.Database;
  let userId: string;
  let platformAccountId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE platform_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        username TEXT NOT NULL,
        connected_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE problems (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        external_id TEXT NOT NULL,
        title TEXT NOT NULL,
        difficulty TEXT,
        rating INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE problem_topics (
        id TEXT PRIMARY KEY,
        problem_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
      );

      CREATE TABLE submissions (
        id TEXT PRIMARY KEY,
        problem_id TEXT NOT NULL,
        platform_account_id TEXT NOT NULL,
        external_submission_id TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        language TEXT NOT NULL,
        verdict TEXT NOT NULL,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
        FOREIGN KEY (platform_account_id) REFERENCES platform_accounts(id) ON DELETE CASCADE
      );
    `);

    const now = new Date().toISOString();
    userId = uuidv4();
    platformAccountId = uuidv4();

    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      userId, 'test@example.com', 'Test User', 'hash', now, now
    );

    db.prepare('INSERT INTO platform_accounts (id, user_id, platform, username, connected_at) VALUES (?, ?, ?, ?, ?)').run(
      platformAccountId, userId, 'codeforces', 'testuser', now
    );
  });

  afterEach(() => {
    db.close();
  });

  it('should compute difficulty ceiling from accepted submissions', () => {
    const ratings = [1200, 1400, 1600, 1800, 2000];
    const now = new Date().toISOString();

    for (const rating of ratings) {
      const problemId = uuidv4();
      db.prepare('INSERT INTO problems (id, platform, external_id, title, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        problemId, 'codeforces', `CF-${rating}`, 'Test', rating, now
      );

      const topicId = uuidv4();
      db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
        topicId, problemId, 'Binary Search', 1.0
      );

      const subId = uuidv4();
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${rating}`, now, 'C++', 'Accepted', 1
      );
    }

    const difficultyEngine = new DifficultyEngine(db);
    const ceilings = difficultyEngine.computeDifficultyCeilings(userId);

    assert.strictEqual(ceilings.length, 1);
    assert.strictEqual(ceilings[0].topic, 'Binary Search');
    assert.strictEqual(ceilings[0].maxRating, 2000);
    assert.ok(ceilings[0].consistentRating >= 1600);
  });

  it('should determine correct difficulty labels', () => {
    const testCases = [
      { rating: 1100, expectedDifficulty: 'Easy' },
      { rating: 1500, expectedDifficulty: 'Medium' },
      { rating: 1900, expectedDifficulty: 'Hard' },
      { rating: 2300, expectedDifficulty: 'Very Hard' },
      { rating: 2600, expectedDifficulty: 'Expert' }
    ];

    const now = new Date().toISOString();

    for (const testCase of testCases) {
      const problemId = uuidv4();
      const topic = `Topic-${testCase.rating}`;
      
      db.prepare('INSERT INTO problems (id, platform, external_id, title, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        problemId, 'codeforces', `CF-${testCase.rating}`, 'Test', testCase.rating, now
      );

      const topicId = uuidv4();
      db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
        topicId, problemId, topic, 1.0
      );

      const subId = uuidv4();
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${testCase.rating}`, now, 'C++', 'Accepted', 1
      );
    }

    const difficultyEngine = new DifficultyEngine(db);
    const ceilings = difficultyEngine.computeDifficultyCeilings(userId);

    assert.strictEqual(ceilings.length, testCases.length);

    for (const testCase of testCases) {
      const ceiling = ceilings.find(c => c.topic === `Topic-${testCase.rating}`);
      assert.ok(ceiling);
      assert.strictEqual(ceiling.maxDifficulty, testCase.expectedDifficulty);
    }
  });

  it('should detect improving trend', () => {
    const ratings = [1200, 1300, 1400, 1500, 1600, 1700];
    const now = new Date();

    for (let i = 0; i < ratings.length; i++) {
      const problemId = uuidv4();
      db.prepare('INSERT INTO problems (id, platform, external_id, title, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        problemId, 'codeforces', `CF-${ratings[i]}`, 'Test', ratings[i], now.toISOString()
      );

      const topicId = uuidv4();
      db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
        topicId, problemId, 'Greedy', 1.0
      );

      const submittedAt = new Date(now.getTime() + i * 24 * 60 * 60 * 1000).toISOString();
      const subId = uuidv4();
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${i}`, submittedAt, 'C++', 'Accepted', 1
      );
    }

    const difficultyEngine = new DifficultyEngine(db);
    const ceilings = difficultyEngine.computeDifficultyCeilings(userId);

    assert.strictEqual(ceilings.length, 1);
    assert.strictEqual(ceilings[0].recentTrend, 'improving');
  });

  it('should handle missing difficulty with default rating', () => {
    const problemId = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare('INSERT INTO problems (id, platform, external_id, title, difficulty, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-1000A', 'Test', 'Medium', now
    );

    const topicId = uuidv4();
    db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
      topicId, problemId, 'Strings', 1.0
    );

    const subId = uuidv4();
    db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      subId, problemId, platformAccountId, 'SUB-1', now, 'C++', 'Accepted', 1
    );

    const difficultyEngine = new DifficultyEngine(db);
    const ceilings = difficultyEngine.computeDifficultyCeilings(userId);

    assert.strictEqual(ceilings.length, 1);
    assert.strictEqual(ceilings[0].maxRating, 1500);
  });
});
