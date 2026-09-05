import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/sqlite.js';
import { findSimilarProblems } from '../vector/vector-search.js';
import { isMongoConfigured } from '../vector/mongo.js';
import { isEmbeddingConfigured } from '../vector/embeddings.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

router.use(requireAuth);

router.get('/:id/similar', async (req: AuthRequest, res) => {
  const id = typeof req.params['id'] === 'string' ? req.params['id'] : '';

  if (!id) {
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

  const results = await findSimilarProblems(id, db, req.userId!, limit);
  res.json({ results, problemId: id });
});

export { router as problemsRouter };
