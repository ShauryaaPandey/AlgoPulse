import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { RoadmapEngine } from '../../src/recommendations/roadmap-engine.js';

const SCHEMA = `
  CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE platform_accounts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, platform TEXT NOT NULL, username TEXT NOT NULL, connected_at TEXT NOT NULL);
  CREATE TABLE problems (id TEXT PRIMARY KEY, platform TEXT NOT NULL, external_id TEXT NOT NULL, title TEXT NOT NULL, url TEXT, difficulty TEXT, rating INTEGER, description TEXT, created_at TEXT NOT NULL, UNIQUE(platform, external_id));
  CREATE TABLE problem_topics (id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, topic TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 1.0);
  CREATE TABLE submissions (id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, platform_account_id TEXT NOT NULL, external_submission_id TEXT NOT NULL, submitted_at TEXT NOT NULL, language TEXT NOT NULL, verdict TEXT NOT NULL, attempt_number INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE skill_scores (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL, score REAL NOT NULL, confidence REAL NOT NULL DEFAULT 1.0, updated_at TEXT NOT NULL, UNIQUE(user_id, topic));
  CREATE TABLE skill_history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL, score REAL NOT NULL, timestamp TEXT NOT NULL);
  CREATE TABLE recommendations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, problem_id TEXT NOT NULL, reason TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, completed_at TEXT);
`;

describe('RoadmapEngine', () => {
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

  function addWeakTopic(topic: string, score: number) {
    const now = new Date().toISOString();
    const pid = uuidv4();
    db.prepare('INSERT INTO problems VALUES (?,?,?,?,?,?,?,?,?)').run(pid, 'cf', uuidv4(), 'P', null, null, 1300, null, now);
    db.prepare('INSERT INTO problem_topics VALUES (?,?,?,?)').run(uuidv4(), pid, topic, 1.0);
    for (let i = 0; i < 5; i++) {
      db.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,?,?)').run(uuidv4(), pid, accountId, uuidv4(), now, 'C++', 'Wrong Answer', 2);
    }
    db.prepare('INSERT OR REPLACE INTO skill_scores VALUES (?,?,?,?,?,?)').run(uuidv4(), userId, topic, score, 0.7, now);
  }

  it('should return empty roadmap when no data exists', () => {
    const engine = new RoadmapEngine(db);
    const result = engine.buildRoadmap(userId, 4);
    assert.strictEqual(result.weeks.length, 0);
    assert.strictEqual(result.totalTopics, 0);
  });

  it('should build weeks for weak topics', () => {
    addWeakTopic('Graphs', 15);
    addWeakTopic('Dynamic Programming', 22);

    const engine = new RoadmapEngine(db);
    const result = engine.buildRoadmap(userId, 4);

    assert.ok(result.weeks.length >= 1, 'Should have at least 1 week');
    assert.ok(result.weeks.length <= 4, 'Should respect totalWeeks limit');
    for (const week of result.weeks) {
      assert.ok(week.weekNumber >= 1);
      assert.ok(week.topic.length > 0);
      assert.ok(week.targetRatingMin <= week.targetRatingMax);
    }
  });

  it('should prioritise critical-severity topics first', () => {
    addWeakTopic('Critical Topic', 5);
    addWeakTopic('Low Topic', 70);

    db.prepare('INSERT OR REPLACE INTO skill_scores VALUES (?,?,?,?,?,?)').run(uuidv4(), userId, 'Low Topic', 70, 0.9, new Date().toISOString());

    const engine = new RoadmapEngine(db);
    const result = engine.buildRoadmap(userId, 8);

    if (result.weeks.length >= 2) {
      const firstTopicScore = result.weeks[0]!.currentScore;
      const lastTopicScore = result.weeks[result.weeks.length - 1]!.currentScore;
      assert.ok(firstTopicScore <= lastTopicScore, 'Weaker topics should come first');
    }
  });

  it('should include summary string', () => {
    addWeakTopic('Trees', 18);
    const engine = new RoadmapEngine(db);
    const result = engine.buildRoadmap(userId, 4);
    assert.ok(typeof result.summary === 'string');
  });
});
