import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/sqlite.js';
import { RecommendationEngine } from '../recommendations/recommendation-engine.js';
import { RoadmapEngine } from '../recommendations/roadmap-engine.js';
import { RevisionEngine } from '../recommendations/revision-engine.js';
import { NotFoundError } from '../utils/errors.js';

const router = Router();

router.use(requireAuth);

router.get('/next', (req: AuthRequest, res) => {
  const db = getDb();
  const engine = new RecommendationEngine(db);

  engine.generateRecommendations(req.userId!);

  const recommendations = engine.getOpenRecommendations(req.userId!);

  res.json({ recommendations });
});

router.get('/roadmap', (req: AuthRequest, res) => {
  const db = getDb();
  const engine = new RoadmapEngine(db);

  const weeksParam = req.query['weeks'];
  const totalWeeks = weeksParam && !isNaN(Number(weeksParam))
    ? Math.min(16, Math.max(1, Number(weeksParam)))
    : 8;

  const roadmap = engine.buildRoadmap(req.userId!, totalWeeks);

  res.json(roadmap);
});

router.get('/revise', (req: AuthRequest, res) => {
  const db = getDb();
  const engine = new RevisionEngine(db);

  const plan = engine.buildRevisionPlan(req.userId!);

  res.json(plan);
});

router.post('/:id/dismiss', (req: AuthRequest, res) => {
  const db = getDb();
  const engine = new RecommendationEngine(db);

  const { id } = req.params;
  const dismissed = engine.dismiss(id, req.userId!);

  if (!dismissed) {
    throw new NotFoundError('Recommendation', 'Recommendation not found or already completed');
  }

  res.json({ success: true });
});

export { router as recommendationsRouter };
