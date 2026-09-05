import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/sqlite.js';
import { vectorSearch, findSimilarProblems } from '../vector/vector-search.js';
import { isMongoConfigured } from '../vector/mongo.js';
import { isEmbeddingConfigured } from '../vector/embeddings.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const q = req.query['q'];

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new ValidationError('Query parameter "q" is required');
  }

  if (!isMongoConfigured() || !isEmbeddingConfigured()) {
    res.json({
      results: [],
      message: 'Vector search is not configured. Set MONGODB_URI and GEMINI_API_KEY to enable it.'
    });
    return;
  }

  const db = getDb();

  const topic = typeof req.query['topic'] === 'string' ? req.query['topic'] : undefined;
  const platform = typeof req.query['platform'] === 'string' ? req.query['platform'] : undefined;
  const difficulty = typeof req.query['difficulty'] === 'string' ? req.query['difficulty'] : undefined;
  const minRating = req.query['minRating'] ? Number(req.query['minRating']) : undefined;
  const maxRating = req.query['maxRating'] ? Number(req.query['maxRating']) : undefined;
  const limit = req.query['limit'] ? Math.min(50, Math.max(1, Number(req.query['limit']))) : 20;

  const results = await vectorSearch(q.trim(), db, req.userId!, {
    topic,
    platform,
    difficulty,
    minRating,
    maxRating
  }, limit);

  res.json({ results, query: q.trim() });
});

router.get('/similar/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const problemId = typeof id === 'string' ? id : '';

  if (!problemId) {
    throw new ValidationError('Problem ID is required');
  }

  if (!isMongoConfigured() || !isEmbeddingConfigured()) {
    res.json({
      results: [],
      message: 'Vector search is not configured. Set MONGODB_URI and GEMINI_API_KEY to enable it.'
    });
    return;
  }

  const db = getDb();
  const limit = req.query['limit'] ? Math.min(20, Math.max(1, Number(req.query['limit']))) : 10;

  const results = await findSimilarProblems(problemId, db, req.userId!, limit);

  res.json({ results, problemId });
});

export { router as searchRouter };
