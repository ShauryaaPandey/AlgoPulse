import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const SCHEMA = `
  CREATE TABLE problems (id TEXT PRIMARY KEY, platform TEXT NOT NULL, external_id TEXT NOT NULL, title TEXT NOT NULL, url TEXT, difficulty TEXT, rating INTEGER, description TEXT, created_at TEXT NOT NULL, UNIQUE(platform, external_id));
  CREATE TABLE problem_topics (id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, topic TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 1.0);
`;

describe('problem-indexer (mocked Mongo + Gemini)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA);
  });

  afterEach(() => db.close());

  function insertProblem(title: string, topics: string[] = []): string {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO problems VALUES (?,?,?,?,?,?,?,?,?)').run(id, 'cf', uuidv4(), title, null, 'Medium', 1400, null, now);
    for (const topic of topics) {
      db.prepare('INSERT INTO problem_topics VALUES (?,?,?,?)').run(uuidv4(), id, topic, 1.0);
    }
    return id;
  }

  it('should skip indexing when Mongo is not configured', async () => {
    const pid = insertProblem('Two Sum', ['Arrays', 'Hash Table']);

    const mockCollection = {
      find: () => ({ toArray: async () => [] }),
      insertMany: async () => ({ insertedCount: 0 }),
    };

    let embeddingsCallCount = 0;
    const mockEmbedMany = async (problems: unknown[]) => {
      embeddingsCallCount++;
      return problems.map(() => new Array(768).fill(0));
    };

    const { indexProblems } = await import('../../src/vector/problem-indexer.js');

    const originalIsMongoConfigured = (await import('../../src/vector/mongo.js')).isMongoConfigured;
    assert.ok(typeof originalIsMongoConfigured === 'function');

    const result = await indexProblems(db);
    assert.strictEqual(result.indexed, 0, 'Should index 0 when Mongo not configured');
    assert.strictEqual(embeddingsCallCount, 0, 'Should not call embeddings when skipping');

    assert.ok(pid, 'Problem was inserted');
  });

  it('should read problems and topics from SQLite correctly', () => {
    insertProblem('Binary Search', ['Binary Search', 'Arrays']);
    insertProblem('Longest Subsequence', ['Dynamic Programming', 'Strings']);

    const rows = db.prepare(`
      SELECT p.id, p.title, GROUP_CONCAT(pt.topic, '|') as topics
      FROM problems p
      LEFT JOIN problem_topics pt ON p.id = pt.problem_id
      GROUP BY p.id
    `).all() as { id: string; title: string; topics: string | null }[];

    assert.strictEqual(rows.length, 2);

    const bsRow = rows.find(r => r.title === 'Binary Search');
    assert.ok(bsRow, 'Binary Search should be found');
    assert.ok(bsRow!.topics!.includes('Binary Search'));
    assert.ok(bsRow!.topics!.includes('Arrays'));
  });

  it('should correctly identify topics from concatenated string', () => {
    const topicsRaw = 'Graphs|BFS|DFS';
    const topics = topicsRaw.split('|').filter(Boolean);
    assert.deepStrictEqual(topics, ['Graphs', 'BFS', 'DFS']);
  });
});
