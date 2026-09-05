import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/sqlite.js';
import { WeaknessEngine } from '../analytics/weakness-engine.js';
import { FailureEngine } from '../analytics/failure-engine.js';
import { ProgressEngine } from '../analytics/progress-engine.js';
import { SkillEngine } from '../analytics/skill-engine.js';
import { explainWeaknesses, explainFailures, explainProgress, explainRoadmap, explainGeneral } from '../ai/explanation.js';
import { isAiConfigured } from '../ai/client.js';

const router = Router();

router.use(requireAuth);

function notConfiguredResponse() {
  return {
    error: 'AI explanations are not configured. Add GEMINI_API_KEY to your .env to enable this feature.'
  };
}

router.get('/', async (req: AuthRequest, res) => {
  if (!isAiConfigured()) {
    res.status(503).json(notConfiguredResponse());
    return;
  }

  const db = getDb();
  const skillEngine = new SkillEngine(db);
  const skills = skillEngine.computeSkillScores(req.userId!);

  const topSkills = skills
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => `${s.topic}: ${Math.round(s.score)}/100`)
    .join(', ');

  const summary = topSkills.length > 0
    ? `Top skills: ${topSkills}`
    : 'No skill data available yet. Sync profiles to compute skills.';

  const insight = await explainGeneral(summary);
  res.json(insight);
});

router.get('/weaknesses', async (req: AuthRequest, res) => {
  if (!isAiConfigured()) {
    res.status(503).json(notConfiguredResponse());
    return;
  }

  const db = getDb();
  const weaknessEngine = new WeaknessEngine(db);
  const weaknesses = weaknessEngine.computeWeaknesses(req.userId!);

  const insight = await explainWeaknesses(weaknesses);
  res.json(insight);
});

router.get('/failures', async (req: AuthRequest, res) => {
  if (!isAiConfigured()) {
    res.status(503).json(notConfiguredResponse());
    return;
  }

  const db = getDb();
  const failureEngine = new FailureEngine(db);
  const breakdown = failureEngine.analyzeFailures(req.userId!);

  const insight = await explainFailures(breakdown);
  res.json(insight);
});

router.get('/progress', async (req: AuthRequest, res) => {
  if (!isAiConfigured()) {
    res.status(503).json(notConfiguredResponse());
    return;
  }

  const db = getDb();
  const progressEngine = new ProgressEngine(db);
  const progress = progressEngine.analyzeProgress(req.userId!);

  const insight = await explainProgress(progress);
  res.json(insight);
});

router.get('/roadmap', async (req: AuthRequest, res) => {
  if (!isAiConfigured()) {
    res.status(503).json(notConfiguredResponse());
    return;
  }

  const db = getDb();
  const weaknessEngine = new WeaknessEngine(db);
  const progressEngine = new ProgressEngine(db);

  const weaknesses = weaknessEngine.computeWeaknesses(req.userId!);
  const progress = progressEngine.analyzeProgress(req.userId!);

  const insight = await explainRoadmap(weaknesses, progress);
  res.json(insight);
});

export { router as explainRouter };
