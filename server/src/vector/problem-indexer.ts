import type Database from 'better-sqlite3';
import { getProblemsCollection, isMongoConfigured } from './mongo.js';
import { embedManyProblems, isEmbeddingConfigured } from './embeddings.js';
import { logger } from '../utils/logger.js';

interface SqliteProblem {
  id: string;
  platform: string;
  title: string;
  difficulty: string | null;
  rating: number | null;
  description: string | null;
  topics: string | null;
}

const BATCH_SIZE = 50;

export async function indexProblems(db: Database.Database): Promise<{ indexed: number; skipped: number }> {
  if (!isMongoConfigured() || !isEmbeddingConfigured()) {
    logger.info('Vector indexing skipped: MONGODB_URI or GEMINI_API_KEY not configured');
    return { indexed: 0, skipped: 0 };
  }

  let collection: Awaited<ReturnType<typeof getProblemsCollection>>;
  try {
    collection = await getProblemsCollection();
  } catch (error) {
    logger.warn('Vector indexing skipped: could not connect to MongoDB:', (error as Error).message);
    return { indexed: 0, skipped: 0 };
  }

  const allProblems = getUnindexedProblems(db);

  let indexed = 0;
  let skipped = 0;

  for (let i = 0; i < allProblems.length; i += BATCH_SIZE) {
    const batch = allProblems.slice(i, i + BATCH_SIZE);

    const existingIds = await collection
      .find({ problemId: { $in: batch.map(p => p.id) } }, { projection: { problemId: 1 } })
      .toArray();
    const existingSet = new Set(existingIds.map(d => d.problemId));

    const toIndex = batch.filter(p => !existingSet.has(p.id));
    skipped += batch.length - toIndex.length;

    if (toIndex.length === 0) continue;

    const topics = toIndex.map(p => p.topics ? p.topics.split('|').filter(Boolean) : []);
    const embeddings = await embedManyProblems(
      toIndex.map((p, idx) => ({
        title: p.title,
        topics: topics[idx]!,
        difficulty: p.difficulty,
        description: p.description
      }))
    );

    const docs = toIndex.map((p, idx) => ({
      problemId: p.id,
      platform: p.platform,
      title: p.title,
      topics: topics[idx]!,
      difficulty: p.difficulty,
      rating: p.rating,
      embedding: embeddings[idx]!,
      indexedAt: new Date().toISOString()
    }));

    await collection.insertMany(docs, { ordered: false });
    indexed += docs.length;
    logger.info(`Indexed batch: ${indexed} problems so far`);
  }

  return { indexed, skipped };
}

export async function indexSingleProblem(db: Database.Database, problemId: string): Promise<boolean> {
  if (!isMongoConfigured() || !isEmbeddingConfigured()) return false;

  const row = db
    .prepare(`
      SELECT p.id, p.platform, p.title, p.difficulty, p.rating, p.description,
             GROUP_CONCAT(pt.topic, '|') as topics
      FROM problems p
      LEFT JOIN problem_topics pt ON p.id = pt.problem_id
      WHERE p.id = ?
      GROUP BY p.id
    `)
    .get(problemId) as SqliteProblem | undefined;

  if (!row) return false;

  const collection = await getProblemsCollection();
  const existing = await collection.findOne({ problemId: row.id });
  if (existing) return false;

  const topics = row.topics ? row.topics.split('|').filter(Boolean) : [];
  const [embedding] = await embedManyProblems([{ title: row.title, topics, difficulty: row.difficulty, description: row.description }]);

  await collection.insertOne({
    problemId: row.id,
    platform: row.platform,
    title: row.title,
    topics,
    difficulty: row.difficulty,
    rating: row.rating,
    embedding: embedding!,
    indexedAt: new Date().toISOString()
  });

  return true;
}

function getUnindexedProblems(db: Database.Database): SqliteProblem[] {
  return db
    .prepare(`
      SELECT p.id, p.platform, p.title, p.difficulty, p.rating, p.description,
             GROUP_CONCAT(pt.topic, '|') as topics
      FROM problems p
      LEFT JOIN problem_topics pt ON p.id = pt.problem_id
      GROUP BY p.id
    `)
    .all() as SqliteProblem[];
}
