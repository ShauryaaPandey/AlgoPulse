import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/sqlite.js';
import { SkillEngine } from '../analytics/skill-engine.js';
import { DifficultyEngine } from '../analytics/difficulty-engine.js';
import { WeaknessEngine } from '../analytics/weakness-engine.js';
import { FailureEngine } from '../analytics/failure-engine.js';
import { ProgressEngine } from '../analytics/progress-engine.js';
import { DecayEngine } from '../analytics/decay-engine.js';
import { ContestEngine } from '../analytics/contest-engine.js';

const router = Router();

router.use(requireAuth);

router.get('/skills', (req: AuthRequest, res) => {
  const db = getDb();
  const skillEngine = new SkillEngine(db);
  const difficultyEngine = new DifficultyEngine(db);

  const skills = skillEngine.computeSkillScores(req.userId!);
  const ceilings = difficultyEngine.computeDifficultyCeilings(req.userId!);

  const combined = skills.map(skill => {
    const ceiling = ceilings.find(c => c.topic === skill.topic);
    return {
      ...skill,
      maxRating: ceiling?.maxRating || 0,
      maxDifficulty: ceiling?.maxDifficulty || 'None',
      consistentRating: ceiling?.consistentRating || 0,
      recentTrend: ceiling?.recentTrend || 'stable'
    };
  });

  res.json({ skills: combined });
});

router.get('/weaknesses', (req: AuthRequest, res) => {
  const db = getDb();
  const weaknessEngine = new WeaknessEngine(db);

  const weaknesses = weaknessEngine.computeWeaknesses(req.userId!);

  res.json({ weaknesses });
});

router.get('/failures', (req: AuthRequest, res) => {
  const db = getDb();
  const failureEngine = new FailureEngine(db);

  const analysis = failureEngine.analyzeFailures(req.userId!);

  res.json(analysis);
});

router.get('/progress', (req: AuthRequest, res) => {
  const db = getDb();
  const progressEngine = new ProgressEngine(db);

  const progress = progressEngine.analyzeProgress(req.userId!);

  res.json(progress);
});

router.get('/contests', (req: AuthRequest, res) => {
  const db = getDb();
  const contestEngine = new ContestEngine(db);
  const decayEngine = new DecayEngine(db);

  const performance = contestEngine.analyzeContestPerformance(req.userId!);
  const decayingSkills = decayEngine.detectDecayingSkills(req.userId!);

  res.json({
    ...performance,
    decayWarnings: decayingSkills.filter(d => d.decaySeverity === 'critical' || d.decaySeverity === 'high')
  });
});

export { router as analyticsRouter };
