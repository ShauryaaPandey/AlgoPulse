import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/sqlite.js';
import { computeInterviewPrep } from '../trends/trend-engine.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req: AuthRequest, res) => {
  const company = typeof req.query['company'] === 'string' && req.query['company'].trim().length > 0
    ? req.query['company'].trim()
    : 'Generic';

  const db = getDb();
  const result = computeInterviewPrep(db, req.userId!, company);
  res.json(result);
});

export { router as interviewRouter };
