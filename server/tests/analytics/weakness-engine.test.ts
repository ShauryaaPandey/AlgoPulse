import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { WeaknessEngine } from '../../src/analytics/weakness-engine.js';
import { v4 as uuidv4 } from 'uuid';

describe('WeaknessEngine', () => {
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

      CREATE TABLE skill_scores (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        score REAL NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        updated_at TEXT NOT NULL,
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

  it('should identify critical weakness with high failure rate and low skill score', () => {
    const problemId = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare('INSERT INTO problems (id, platform, external_id, title, created_at) VALUES (?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-1000A', 'Test', now
    );

    const topicId = uuidv4();
    db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
      topicId, problemId, 'Graph Theory', 1.0
    );

    for (let i = 0; i < 10; i++) {
      const subId = uuidv4();
      const verdict = i < 2 ? 'Accepted' : 'Wrong Answer';
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${i}`, now, 'C++', verdict, i < 2 ? 1 : 3
      );
    }

    db.prepare('INSERT INTO skill_scores (id, user_id, topic, score, confidence, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      uuidv4(), userId, 'Graph Theory', 25, 0.8, now
    );

    const weaknessEngine = new WeaknessEngine(db);
    const weaknesses = weaknessEngine.computeWeaknesses(userId);

    assert.strictEqual(weaknesses.length, 1);
    assert.strictEqual(weaknesses[0].topic, 'Graph Theory');
    assert.ok(weaknesses[0].severity === 'critical' || weaknesses[0].severity === 'high');
    assert.ok(weaknesses[0].weaknessScore > 50);
  });

  it('should rank weaknesses by score', () => {
    const topics = [
      { name: 'Weak Topic', failures: 8, total: 10, score: 20 },
      { name: 'Medium Topic', failures: 5, total: 10, score: 45 },
      { name: 'Strong Topic', failures: 2, total: 10, score: 75 }
    ];

    const now = new Date().toISOString();

    for (const topic of topics) {
      const problemId = uuidv4();
      db.prepare('INSERT INTO problems (id, platform, external_id, title, created_at) VALUES (?, ?, ?, ?, ?)').run(
        problemId, 'codeforces', `CF-${topic.name}`, 'Test', now
      );

      const topicId = uuidv4();
      db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
        topicId, problemId, topic.name, 1.0
      );

      for (let i = 0; i < topic.total; i++) {
        const subId = uuidv4();
        const verdict = i < (topic.total - topic.failures) ? 'Accepted' : 'Wrong Answer';
        db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          subId, problemId, platformAccountId, `SUB-${topic.name}-${i}`, now, 'C++', verdict, 1
        );
      }

      db.prepare('INSERT INTO skill_scores (id, user_id, topic, score, confidence, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        uuidv4(), userId, topic.name, topic.score, 0.8, now
      );
    }

    const weaknessEngine = new WeaknessEngine(db);
    const weaknesses = weaknessEngine.computeWeaknesses(userId);

    assert.strictEqual(weaknesses.length, 3);
    assert.strictEqual(weaknesses[0].topic, 'Weak Topic');
    assert.strictEqual(weaknesses[2].topic, 'Strong Topic');
    assert.ok(weaknesses[0].weaknessScore > weaknesses[1].weaknessScore);
    assert.ok(weaknesses[1].weaknessScore > weaknesses[2].weaknessScore);
  });

  it('should require minimum 3 problems for weakness detection', () => {
    const problemId = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare('INSERT INTO problems (id, platform, external_id, title, created_at) VALUES (?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-1000A', 'Test', now
    );

    const topicId = uuidv4();
    db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
      topicId, problemId, 'Arrays', 1.0
    );

    for (let i = 0; i < 2; i++) {
      const subId = uuidv4();
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${i}`, now, 'C++', 'Wrong Answer', 1
      );
    }

    const weaknessEngine = new WeaknessEngine(db);
    const weaknesses = weaknessEngine.computeWeaknesses(userId);

    assert.strictEqual(weaknesses.length, 0);
  });

  it('should assign correct severity levels', () => {
    const severityTests = [
      { score: 25, failureRate: 0.8, severity: 'critical' },
      { score: 40, failureRate: 0.6, severity: 'high' },
      { score: 55, failureRate: 0.4, severity: 'medium' },
      { score: 70, failureRate: 0.2, severity: 'low' }
    ];

    const now = new Date().toISOString();

    for (let idx = 0; idx < severityTests.length; idx++) {
      const test = severityTests[idx];
      const problemId = uuidv4();
      const topic = `Topic-${idx}`;
      
      db.prepare('INSERT INTO problems (id, platform, external_id, title, created_at) VALUES (?, ?, ?, ?, ?)').run(
        problemId, 'codeforces', `CF-${idx}`, 'Test', now
      );

      const topicId = uuidv4();
      db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
        topicId, problemId, topic, 1.0
      );

      const total = 10;
      const failures = Math.round(total * test.failureRate);

      for (let i = 0; i < total; i++) {
        const subId = uuidv4();
        const verdict = i < (total - failures) ? 'Accepted' : 'Wrong Answer';
        db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          subId, problemId, platformAccountId, `SUB-${topic}-${i}`, now, 'C++', verdict, 1
        );
      }

      db.prepare('INSERT INTO skill_scores (id, user_id, topic, score, confidence, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        uuidv4(), userId, topic, test.score, 0.8, now
      );
    }

    const weaknessEngine = new WeaknessEngine(db);
    const weaknesses = weaknessEngine.computeWeaknesses(userId);

    assert.strictEqual(weaknesses.length, 4);

    for (let idx = 0; idx < severityTests.length; idx++) {
      const weakness = weaknesses.find(w => w.topic === `Topic-${idx}`);
      assert.ok(weakness);
    }
  });

  it('should not crash and should return no weaknesses when a problem has no topic rows', () => {
    const problemId = uuidv4();
    const now = new Date().toISOString();

    db.prepare('INSERT INTO problems (id, platform, external_id, title, created_at) VALUES (?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-NOTOPIC', 'Topicless Problem', now
    );

    for (let i = 0; i < 5; i++) {
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        uuidv4(), problemId, platformAccountId, `SUB-NOTOPIC-${i}`, now, 'C++', 'Wrong Answer', 1
      );
    }

    const weaknessEngine = new WeaknessEngine(db);
    let weaknesses: ReturnType<typeof weaknessEngine.computeWeaknesses> | undefined;
    assert.doesNotThrow(() => {
      weaknesses = weaknessEngine.computeWeaknesses(userId);
    });
    assert.strictEqual(weaknesses!.length, 0);
  });
});
