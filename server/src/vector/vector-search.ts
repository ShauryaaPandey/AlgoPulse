import type Database from 'better-sqlite3';
import { getProblemsCollection, isMongoConfigured } from './mongo.js';
import { embedText, isEmbeddingConfigured } from './embeddings.js';
import { indexSingleProblem } from './problem-indexer.js';
import { logger } from '../utils/logger.js';

export interface VectorSearchFilters {
  topic?: string;
  platform?: string;
  minRating?: number;
  maxRating?: number;
  difficulty?: string;
}

export interface SearchResult {
  problemId: string;
  platform: string;
  title: string;
  topics: string[];
  difficulty: string | null;
  rating: number | null;
  score: number;
  url: string | null;
}

const ATLAS_INDEX_NAME = 'problems_vector_index';

export async function vectorSearch(
  queryText: string,
  db: Database.Database,
  userId: string,
  filters: VectorSearchFilters = {},
  limit = 20
): Promise<SearchResult[]> {
  if (!isMongoConfigured() || !isEmbeddingConfigured()) {
    return [];
  }

  try {
    const queryEmbedding = await embedText(queryText);
    const solvedIds = getSolvedProblemIds(db, userId);
    const collection = await getProblemsCollection();

    const vectorStage: Record<string, unknown> = {
      index: ATLAS_INDEX_NAME,
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: limit * 10,
      limit: limit * 2
    };

    const filterClauses: Record<string, unknown>[] = [];
    if (filters.topic) filterClauses.push({ topics: filters.topic });
    if (filters.platform) filterClauses.push({ platform: filters.platform });
    if (filters.difficulty) filterClauses.push({ difficulty: filters.difficulty });
    if (filters.minRating !== undefined || filters.maxRating !== undefined) {
      const rf: Record<string, number> = {};
      if (filters.minRating !== undefined) rf['$gte'] = filters.minRating;
      if (filters.maxRating !== undefined) rf['$lte'] = filters.maxRating;
      filterClauses.push({ rating: rf });
    }

    if (filterClauses.length > 0) {
      vectorStage['filter'] = filterClauses.length === 1 ? filterClauses[0] : { $and: filterClauses };
    }

    const pipeline = [
      { $vectorSearch: vectorStage },
      { $addFields: { score: { $meta: 'vectorSearchScore' } } },
      { $project: { _id: 0, problemId: 1, platform: 1, title: 1, topics: 1, difficulty: 1, rating: 1, score: 1 } }
    ];

    const rawResults = await collection.aggregate<{
      problemId: string; platform: string; title: string;
      topics: string[]; difficulty: string | null; rating: number | null; score: number;
    }>(pipeline).toArray();

    const solvedSet = new Set(solvedIds);
    return rawResults
      .filter(r => !solvedSet.has(r.problemId))
      .slice(0, limit)
      .map(r => ({ ...r, url: buildProblemUrl(r.platform, r.problemId) }));
  } catch (error) {
    logger.warn('Vector search unavailable:', (error as Error).message);
    return [];
  }
}

export async function findSimilarProblems(
  problemId: string,
  db: Database.Database,
  userId: string,
  limit = 10
): Promise<SearchResult[]> {
  if (!isMongoConfigured() || !isEmbeddingConfigured()) {
    return [];
  }

  try {
    const collection = await getProblemsCollection();

    let doc = await collection.findOne({ problemId });

    if (!doc) {
      await indexSingleProblem(db, problemId);
      doc = await collection.findOne({ problemId });
    }

    if (!doc) return [];

    const queryEmbedding = doc.embedding;
    const solvedIds = getSolvedProblemIds(db, userId);

    const pipeline = [
      {
        $vectorSearch: {
          index: ATLAS_INDEX_NAME,
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: (limit + 1) * 10,
          limit: limit + 1
        }
      },
      { $addFields: { score: { $meta: 'vectorSearchScore' } } },
      { $project: { _id: 0, problemId: 1, platform: 1, title: 1, topics: 1, difficulty: 1, rating: 1, score: 1 } }
    ];

    const rawResults = await collection.aggregate<{
      problemId: string; platform: string; title: string;
      topics: string[]; difficulty: string | null; rating: number | null; score: number;
    }>(pipeline).toArray();

    const solvedSet = new Set(solvedIds);
    return rawResults
      .filter(r => r.problemId !== problemId && !solvedSet.has(r.problemId))
      .slice(0, limit)
      .map(r => ({ ...r, url: buildProblemUrl(r.platform, r.problemId) }));
  } catch (error) {
    logger.warn('Find similar unavailable:', (error as Error).message);
    return [];
  }
}

function getSolvedProblemIds(db: Database.Database, userId: string): string[] {
  const rows = db
    .prepare(`
      SELECT DISTINCT s.problem_id
      FROM submissions s
      JOIN platform_accounts pa ON s.platform_account_id = pa.id
      WHERE pa.user_id = ? AND (s.verdict = 'Accepted' OR s.verdict = 'AC')
    `)
    .all(userId) as { problem_id: string }[];
  return rows.map(r => r.problem_id);
}

function buildProblemUrl(platform: string, problemId: string): string | null {
  if (platform === 'codeforces') {
    const match = problemId.match(/^(\d+)([A-Z].*)$/);
    if (match) return `https://codeforces.com/problemset/problem/${match[1]}/${match[2]}`;
    return null;
  }
  if (platform === 'leetcode') {
    return `https://leetcode.com/problems/${problemId}/`;
  }
  if (platform === 'codechef') {
    return `https://www.codechef.com/problems/${problemId}`;
  }
  return null;
}
