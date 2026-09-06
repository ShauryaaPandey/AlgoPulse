import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { SkillEngine } from '../../src/analytics/skill-engine.js';
import { v4 as uuidv4 } from 'uuid';

describe('SkillEngine', () => {
  let db: Database.Database;
  let userId: string;
  let platformAccountId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
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
        profile_url TEXT,
        connected_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE problems (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        external_id TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT,
        difficulty TEXT,
        rating INTEGER,
        description TEXT,
        created_at TEXT NOT NULL,
        UNIQUE (platform, external_id)
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
        execution_time REAL,
        memory_used REAL,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
        FOREIGN KEY (platform_account_id) REFERENCES platform_accounts(id) ON DELETE CASCADE
      );

      CREATE TABLE contests (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        external_id TEXT NOT NULL,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        rating_change INTEGER,
        rank INTEGER
      );

      CREATE TABLE contest_problems (
        id TEXT PRIMARY KEY,
        contest_id TEXT NOT NULL,
        problem_id TEXT NOT NULL,
        problem_index TEXT NOT NULL,
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
      );

      CREATE TABLE contest_submissions (
        id TEXT PRIMARY KEY,
        contest_id TEXT NOT NULL,
        submission_id TEXT NOT NULL,
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
      );

      CREATE TABLE skill_scores (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        score REAL NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, topic)
      );

      CREATE TABLE skill_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        score REAL NOT NULL,
        timestamp TEXT NOT NULL,
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

  it('should compute skill scores with high success rate', () => {
    const problemId = uuidv4();
    db.prepare('INSERT INTO problems (id, platform, external_id, title, difficulty, rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-1000A', 'Test Problem', 'Medium', 1500, new Date().toISOString()
    );

    const topicId = uuidv4();
    db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
      topicId, problemId, 'Dynamic Programming', 1.0
    );

    for (let i = 0; i < 10; i++) {
      const subId = uuidv4();
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${i}`, new Date().toISOString(), 'C++', 'Accepted', 1
      );
    }

    const skillEngine = new SkillEngine(db);
    const scores = skillEngine.computeSkillScores(userId);

    assert.strictEqual(scores.length, 1);
    assert.strictEqual(scores[0].topic, 'Dynamic Programming');
    assert.ok(scores[0].score > 50);
    assert.ok(scores[0].confidence > 0);
  });

  it('should penalize low success rate', () => {
    const problemId = uuidv4();
    db.prepare('INSERT INTO problems (id, platform, external_id, title, difficulty, rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-1000A', 'Test Problem', 'Easy', 1000, new Date().toISOString()
    );

    const topicId = uuidv4();
    db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
      topicId, problemId, 'Graphs', 1.0
    );

    for (let i = 0; i < 10; i++) {
      const subId = uuidv4();
      const verdict = i < 3 ? 'Accepted' : 'Wrong Answer';
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        subId, problemId, platformAccountId, `SUB-${i}`, new Date().toISOString(), 'C++', verdict, 1
      );
    }

    const skillEngine = new SkillEngine(db);
    const scores = skillEngine.computeSkillScores(userId);

    assert.strictEqual(scores.length, 1);
    assert.strictEqual(scores[0].topic, 'Graphs');
    assert.ok(scores[0].score < 50);
  });

  it('should handle multiple topics', () => {
    const problems = [
      { id: uuidv4(), topic: 'Dynamic Programming', rating: 1500 },
      { id: uuidv4(), topic: 'Graphs', rating: 1600 }
    ];

    const now = new Date().toISOString();

    for (const problem of problems) {
      db.prepare('INSERT INTO problems (id, platform, external_id, title, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        problem.id, 'codeforces', `CF-${problem.id}`, 'Test', problem.rating, now
      );

      const topicId = uuidv4();
      db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
        topicId, problem.id, problem.topic, 1.0
      );

      for (let i = 0; i < 5; i++) {
        const subId = uuidv4();
        db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          subId, problem.id, platformAccountId, `SUB-${problem.id}-${i}`, now, 'C++', 'Accepted', 1
        );
      }
    }

    const skillEngine = new SkillEngine(db);
    const scores = skillEngine.computeSkillScores(userId);

    assert.strictEqual(scores.length, 2);
    const topics = scores.map(s => s.topic).sort();
    assert.deepStrictEqual(topics, ['Dynamic Programming', 'Graphs']);
  });

  it('should save scores to skill_scores and skill_history tables', () => {
    const problemId = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare('INSERT INTO problems (id, platform, external_id, title, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-1000A', 'Test', 1500, now
    );

    const topicId = uuidv4();
    db.prepare('INSERT INTO problem_topics (id, problem_id, topic, confidence) VALUES (?, ?, ?, ?)').run(
      topicId, problemId, 'Arrays', 1.0
    );

    const subId = uuidv4();
    db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      subId, problemId, platformAccountId, 'SUB-1', now, 'C++', 'Accepted', 1
    );

    const skillEngine = new SkillEngine(db);
    skillEngine.computeSkillScores(userId);

    const savedScore = db.prepare('SELECT * FROM skill_scores WHERE user_id = ? AND topic = ?').get(userId, 'Arrays') as any;
    assert.ok(savedScore);
    assert.strictEqual(savedScore.topic, 'Arrays');
    assert.ok(savedScore.score > 0);

    const historyCount = db.prepare('SELECT COUNT(*) as count FROM skill_history WHERE user_id = ? AND topic = ?').get(userId, 'Arrays') as any;
    assert.strictEqual(historyCount.count, 1);
  });

  it('should not crash and should return no scores when a problem has zero topic rows', () => {
    const problemId = uuidv4();
    const now = new Date().toISOString();

    db.prepare('INSERT INTO problems (id, platform, external_id, title, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      problemId, 'codeforces', 'CF-NOTOPICS', 'Topicless Problem', 1400, now
    );

    for (let i = 0; i < 5; i++) {
      db.prepare('INSERT INTO submissions (id, problem_id, platform_account_id, external_submission_id, submitted_at, language, verdict, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        uuidv4(), problemId, platformAccountId, `SUB-NOTOPIC-${i}`, now, 'C++', 'Accepted', 1
      );
    }

    const skillEngine = new SkillEngine(db);
    let scores: { topic: string; score: number; confidence: number }[] | undefined;
    assert.doesNotThrow(() => {
      scores = skillEngine.computeSkillScores(userId);
    });
    assert.strictEqual(scores!.length, 0);

    const nullScores = db.prepare('SELECT * FROM skill_scores WHERE user_id = ? AND topic IS NULL').all(userId) as unknown[];
    assert.strictEqual(nullScores.length, 0);
  });
});
