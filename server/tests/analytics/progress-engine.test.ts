import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { ProgressEngine } from '../../src/analytics/progress-engine.js';

const SCHEMA = `
  CREATE TABLE skill_history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL, score REAL NOT NULL, timestamp TEXT NOT NULL);
`;

describe('ProgressEngine', () => {
  let db: Database.Database;
  let userId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    userId = uuidv4();
  });

  afterEach(() => db.close());

  function insertHistory(topic: string, scores: number[]) {
    const baseDate = new Date('2025-01-01T00:00:00Z');
    scores.forEach((score, i) => {
      const ts = new Date(baseDate.getTime() + i * 30 * 86400_000).toISOString();
      db.prepare('INSERT INTO skill_history VALUES (?,?,?,?,?)').run(uuidv4(), userId, topic, score, ts);
    });
  }

  it('should return empty progress when no history exists', () => {
    const engine = new ProgressEngine(db);
    const result = engine.analyzeProgress(userId);
    assert.strictEqual(result.topicProgress.length, 0);
    assert.strictEqual(result.biggestImprovement, null);
  });

  it('should compute correct change for an improving topic', () => {
    insertHistory('Graphs', [30, 45, 55, 65]);
    const engine = new ProgressEngine(db);
    const result = engine.analyzeProgress(userId);

    const graphs = result.topicProgress.find(t => t.topic === 'Graphs');
    assert.ok(graphs, 'Graphs should be in progress');
    assert.strictEqual(graphs!.previousScore, 30);
    assert.strictEqual(graphs!.currentScore, 65);
    assert.ok(graphs!.change > 0);
    assert.strictEqual(graphs!.trend, 'improving');
  });

  it('should identify biggest improvement correctly', () => {
    insertHistory('DP',      [20, 35, 50, 70]);
    insertHistory('Strings', [40, 42, 44, 45]);
    const engine = new ProgressEngine(db);
    const result = engine.analyzeProgress(userId);

    assert.strictEqual(result.biggestImprovement, 'DP', 'DP has the biggest score change');
  });

  it('should identify biggest regression correctly', () => {
    insertHistory('Arrays', [80, 70, 60, 50]);
    insertHistory('Trees',  [60, 58, 55, 54]);
    const engine = new ProgressEngine(db);
    const result = engine.analyzeProgress(userId);

    assert.strictEqual(result.biggestRegression, 'Arrays', 'Arrays has the biggest negative change');
  });

  it('should populate monthly data with at least one entry per month', () => {
    insertHistory('BFS', [40, 55, 65, 72]);
    const engine = new ProgressEngine(db);
    const result = engine.analyzeProgress(userId);

    const bfs = result.topicProgress.find(t => t.topic === 'BFS');
    assert.ok(bfs, 'BFS should be in progress');
    assert.ok(bfs!.monthlyData.length >= 1, 'Should have monthly data entries');
  });
});
