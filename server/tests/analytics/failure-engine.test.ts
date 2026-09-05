import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { FailureEngine } from '../../src/analytics/failure-engine.js';
import { v4 as uuidv4 } from 'uuid';

describe('FailureEngine', () => {
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

      CREATE TABLE failure_patterns (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        failure_type TEXT NOT NULL,
        frequency INTEGER NOT NULL DEFAULT 1,
        severity REAL NOT NULL DEFAULT 1.0,
        first_detected TEXT NOT NULL,
        last_detected TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

  it('should detect boundary-errors pattern for binary search failures', () => {
    const problemId = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare('INSERT INTO problems (id, platform, external_id, title, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-1000A', 'Test', 1400, now
    );

    const topicId = uuidv4();
    db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
      topicId, problemId, 'binary-search', 1.0
    );

    for (let i = 0; i < 5; i++) {
      const subId = uuidv4();
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${i}`, now, 'C++', 'Wrong Answer', 1
      );
    }

    const failureEngine = new FailureEngine(db);
    const analysis = failureEngine.analyzeFailures(userId);

    assert.ok(analysis.patterns.length > 0);
    const pattern = analysis.patterns.find(p => p.topic === 'binary-search');
    assert.ok(pattern);
    assert.strictEqual(pattern.failureType, 'boundary-errors');
    assert.ok(pattern.description.includes('boundary') || pattern.description.includes('off-by-one'));
  });

  it('should detect inefficient-algorithm pattern for TLE on easy problems', () => {
    const problemId = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare('INSERT INTO problems (id, platform, external_id, title, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-1000A', 'Test', 1200, now
    );

    const topicId = uuidv4();
    db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
      topicId, problemId, 'sorting', 1.0
    );

    for (let i = 0; i < 4; i++) {
      const subId = uuidv4();
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${i}`, now, 'C++', 'Time Limit Exceeded', 1
      );
    }

    const failureEngine = new FailureEngine(db);
    const analysis = failureEngine.analyzeFailures(userId);

    const pattern = analysis.patterns.find(p => p.topic === 'sorting');
    assert.ok(pattern);
    assert.strictEqual(pattern.failureType, 'inefficient-algorithm');
  });

  it('should calculate verdict distribution', () => {
    const problemId = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare('INSERT INTO problems (id, platform, external_id, title, created_at) VALUES (?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-1000A', 'Test', now
    );

    const topicId = uuidv4();
    db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
      topicId, problemId, 'math', 1.0
    );

    const verdicts = ['Wrong Answer', 'Wrong Answer', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error'];

    for (let i = 0; i < verdicts.length; i++) {
      const subId = uuidv4();
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${i}`, now, 'C++', verdicts[i], 1
      );
    }

    const failureEngine = new FailureEngine(db);
    const analysis = failureEngine.analyzeFailures(userId);

    assert.strictEqual(analysis.verdictDistribution['Wrong Answer'], 3);
    assert.strictEqual(analysis.verdictDistribution['Time Limit Exceeded'], 1);
    assert.strictEqual(analysis.verdictDistribution['Runtime Error'], 1);
  });

  it('should save patterns to failure_patterns table', () => {
    const problemId = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare('INSERT INTO problems (id, platform, external_id, title, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-1000A', 'Test', 1500, now
    );

    const topicId = uuidv4();
    db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
      topicId, problemId, 'graphs', 1.0
    );

    for (let i = 0; i < 3; i++) {
      const subId = uuidv4();
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${i}`, now, 'C++', 'Wrong Answer', 1
      );
    }

    const failureEngine = new FailureEngine(db);
    failureEngine.analyzeFailures(userId);

    const savedPattern = db.prepare('SELECT * FROM failure_patterns WHERE user_id = ?').get(userId) as any;
    assert.ok(savedPattern);
    assert.strictEqual(savedPattern.topic, 'graphs');
    assert.strictEqual(savedPattern.frequency, 3);
  });

  it('should require minimum 3 failures to detect a pattern', () => {
    const problemId = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare('INSERT INTO problems (id, platform, external_id, title, created_at) VALUES (?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-1000A', 'Test', now
    );

    const topicId = uuidv4();
    db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
      topicId, problemId, 'strings', 1.0
    );

    for (let i = 0; i < 2; i++) {
      const subId = uuidv4();
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${i}`, now, 'C++', 'Wrong Answer', 1
      );
    }

    const failureEngine = new FailureEngine(db);
    const analysis = failureEngine.analyzeFailures(userId);

    assert.strictEqual(analysis.patterns.length, 0);
  });
});
