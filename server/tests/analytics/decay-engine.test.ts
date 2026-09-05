import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { DecayEngine } from '../../src/analytics/decay-engine.js';

const SCHEMA = `
  CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE platform_accounts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, platform TEXT NOT NULL, username TEXT NOT NULL, connected_at TEXT NOT NULL);
  CREATE TABLE problems (id TEXT PRIMARY KEY, platform TEXT NOT NULL, external_id TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE problem_topics (id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, topic TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 1.0);
  CREATE TABLE submissions (id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, platform_account_id TEXT NOT NULL, external_submission_id TEXT NOT NULL, submitted_at TEXT NOT NULL, language TEXT NOT NULL, verdict TEXT NOT NULL, attempt_number INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE skill_scores (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL, score REAL NOT NULL, confidence REAL NOT NULL DEFAULT 1.0, updated_at TEXT NOT NULL, UNIQUE(user_id, topic));
  CREATE TABLE skill_history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL, score REAL NOT NULL, timestamp TEXT NOT NULL);
`;

function setupDb() {
  const db = new Database(':memory:');
  db.exec(SCHEMA);
  return db;
}

function insertUser(db: Database.Database) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(id, 'u@t.com', 'U', 'h', now, now);
  return id;
}

function insertAccount(db: Database.Database, userId: string) {
  const id = uuidv4();
  db.prepare('INSERT INTO platform_accounts VALUES (?,?,?,?,?)').run(id, userId, 'cf', 'user', new Date().toISOString());
  return id;
}

function insertProblemWithTopic(db: Database.Database, topic: string) {
  const pid = uuidv4();
  db.prepare('INSERT INTO problems VALUES (?,?,?,?,?)').run(pid, 'cf', uuidv4(), 'P', new Date().toISOString());
  db.prepare('INSERT INTO problem_topics VALUES (?,?,?,?)').run(uuidv4(), pid, topic, 1.0);
  return pid;
}

function insertSubmission(db: Database.Database, accountId: string, problemId: string, submittedAt: string) {
  db.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,?,?)').run(uuidv4(), problemId, accountId, uuidv4(), submittedAt, 'C++', 'Accepted', 1);
}

describe('DecayEngine', () => {
  let db: Database.Database;
  let userId: string;
  let accountId: string;

  beforeEach(() => {
    db = setupDb();
    userId = insertUser(db);
    accountId = insertAccount(db, userId);
  });

  afterEach(() => db.close());

  it('should detect decaying skill with high score drop and long inactivity', () => {
    const topic = 'Dynamic Programming';
    const pid = insertProblemWithTopic(db, topic);
    const longAgo = new Date(Date.now() - 100 * 86400_000).toISOString();
    const now = new Date().toISOString();

    insertSubmission(db, accountId, pid, longAgo);

    db.prepare('INSERT OR REPLACE INTO skill_scores VALUES (?,?,?,?,?,?)').run(uuidv4(), userId, topic, 45, 0.8, now);
    db.prepare('INSERT INTO skill_history VALUES (?,?,?,?,?)').run(uuidv4(), userId, topic, 80, longAgo);

    const engine = new DecayEngine(db);
    const decaying = engine.detectDecayingSkills(userId);

    assert.ok(decaying.length > 0, 'Should detect at least one decaying skill');
    const d = decaying.find(x => x.topic === topic);
    assert.ok(d, 'Should find Dynamic Programming as decaying');
    assert.ok(d!.scoreDrop > 0, 'Score drop should be positive');
    assert.ok(d!.daysSinceLastPractice >= 90, 'Days since practice should be >= 90');
    assert.ok(['critical', 'high'].includes(d!.decaySeverity), 'Severity should be critical or high');
  });

  it('should not flag recently-practised skills as decaying', () => {
    const topic = 'Arrays';
    const pid = insertProblemWithTopic(db, topic);
    const recent = new Date(Date.now() - 2 * 86400_000).toISOString();
    const now = new Date().toISOString();

    insertSubmission(db, accountId, pid, recent);
    db.prepare('INSERT OR REPLACE INTO skill_scores VALUES (?,?,?,?,?,?)').run(uuidv4(), userId, topic, 72, 0.9, now);
    db.prepare('INSERT INTO skill_history VALUES (?,?,?,?,?)').run(uuidv4(), userId, topic, 75, recent);

    const engine = new DecayEngine(db);
    const decaying = engine.detectDecayingSkills(userId);

    const found = decaying.find(x => x.topic === topic);
    assert.ok(!found, 'Recently-practised skill should not be flagged');
  });

  it('should return empty list when no skill data exists', () => {
    const engine = new DecayEngine(db);
    const result = engine.detectDecayingSkills(userId);
    assert.strictEqual(result.length, 0);
  });

  it('should sort results by severity (critical first)', () => {
    const topics = ['Graphs', 'Strings', 'DP'];
    const now = new Date().toISOString();

    for (const topic of topics) {
      const pid = insertProblemWithTopic(db, topic);
      const daysAgo = topic === 'Graphs' ? 100 : topic === 'Strings' ? 60 : 35;
      const dateStr = new Date(Date.now() - daysAgo * 86400_000).toISOString();
      insertSubmission(db, accountId, pid, dateStr);
      const score = topic === 'Graphs' ? 20 : topic === 'Strings' ? 45 : 60;
      const bestScore = topic === 'Graphs' ? 75 : topic === 'Strings' ? 65 : 70;
      db.prepare('INSERT OR REPLACE INTO skill_scores VALUES (?,?,?,?,?,?)').run(uuidv4(), userId, topic, score, 0.8, now);
      db.prepare('INSERT INTO skill_history VALUES (?,?,?,?,?)').run(uuidv4(), userId, topic, bestScore, dateStr);
    }

    const engine = new DecayEngine(db);
    const result = engine.detectDecayingSkills(userId);

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    for (let i = 0; i < result.length - 1; i++) {
      const a = severityOrder[result[i]!.decaySeverity];
      const b = severityOrder[result[i + 1]!.decaySeverity];
      assert.ok(a <= b, 'Results should be sorted by severity (critical first)');
    }
  });
});
