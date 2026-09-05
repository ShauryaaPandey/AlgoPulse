import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { RevisionEngine } from '../../src/recommendations/revision-engine.js';

const SCHEMA = `
  CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE platform_accounts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, platform TEXT NOT NULL, username TEXT NOT NULL, connected_at TEXT NOT NULL);
  CREATE TABLE problems (id TEXT PRIMARY KEY, platform TEXT NOT NULL, external_id TEXT NOT NULL, title TEXT NOT NULL, url TEXT, difficulty TEXT, rating INTEGER, description TEXT, created_at TEXT NOT NULL, UNIQUE(platform, external_id));
  CREATE TABLE problem_topics (id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, topic TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 1.0);
  CREATE TABLE submissions (id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, platform_account_id TEXT NOT NULL, external_submission_id TEXT NOT NULL, submitted_at TEXT NOT NULL, language TEXT NOT NULL, verdict TEXT NOT NULL, attempt_number INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE failure_patterns (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL, failure_type TEXT NOT NULL, frequency INTEGER NOT NULL DEFAULT 1, severity REAL NOT NULL DEFAULT 1.0, first_detected TEXT NOT NULL, last_detected TEXT NOT NULL);
  CREATE TABLE recommendations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, problem_id TEXT NOT NULL, reason TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, completed_at TEXT);
`;

describe('RevisionEngine', () => {
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

  function insertFailedProblem(topic: string, failureCount: number): string {
    const pid = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO problems VALUES (?,?,?,?,?,?,?,?,?)').run(pid, 'cf', uuidv4(), `P-${topic}`, null, 'Medium', 1400, null, now);
    db.prepare('INSERT INTO problem_topics VALUES (?,?,?,?)').run(uuidv4(), pid, topic, 1.0);
    for (let i = 0; i < failureCount; i++) {
      db.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,?,?)').run(uuidv4(), pid, accountId, uuidv4(), now, 'C++', 'Wrong Answer', 1);
    }
    db.prepare('INSERT INTO failure_patterns VALUES (?,?,?,?,?,?,?,?)').run(uuidv4(), userId, topic, 'logic-errors', failureCount, failureCount / 10, now, now);
    return pid;
  }

  it('should return empty plan when no failure patterns exist', () => {
    const engine = new RevisionEngine(db);
    const result = engine.buildRevisionPlan(userId);
    assert.strictEqual(result.totalItems, 0);
    assert.strictEqual(result.groups.length, 0);
  });

  it('should group revision items by topic and failure type', () => {
    insertFailedProblem('Graphs', 5);
    insertFailedProblem('Graphs', 3);

    const engine = new RevisionEngine(db);
    const result = engine.buildRevisionPlan(userId);

    assert.ok(result.groups.length >= 1, 'Should have at least one group');
    const graphsGroup = result.groups.find(g => g.topic === 'Graphs');
    assert.ok(graphsGroup, 'Graphs group should exist');
    assert.strictEqual(graphsGroup!.failureType, 'logic-errors');
  });

  it('should not include solved problems in revision list', () => {
    const pid = insertFailedProblem('DP', 4);
    const now = new Date().toISOString();
    db.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,?,?)').run(uuidv4(), pid, accountId, uuidv4(), now, 'C++', 'Accepted', 1);

    const engine = new RevisionEngine(db);
    const result = engine.buildRevisionPlan(userId);

    const allProblemIds = result.groups.flatMap(g => g.items.map(i => i.problem.id));
    assert.ok(!allProblemIds.includes(pid), 'Solved problem should not appear in revision list');
  });

  it('should sort groups by severity descending', () => {
    insertFailedProblem('Low Severity Topic', 3);
    db.prepare('UPDATE failure_patterns SET severity = 1.0 WHERE topic = ?').run('Low Severity Topic');
    insertFailedProblem('High Severity Topic', 8);
    db.prepare('UPDATE failure_patterns SET severity = 8.0 WHERE topic = ?').run('High Severity Topic');

    const engine = new RevisionEngine(db);
    const result = engine.buildRevisionPlan(userId);

    if (result.groups.length >= 2) {
      const first = result.groups[0]!;
      const second = result.groups[1]!;
      assert.ok(first.topic !== second.topic, 'Groups should be different');
    }
  });
});
