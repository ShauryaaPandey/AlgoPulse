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
import { RecommendationEngine } from '../recommendations/recommendation-engine.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req: AuthRequest, res) => {
  const format = typeof req.query['format'] === 'string' ? req.query['format'] : 'json';
  if (format !== 'json' && format !== 'markdown') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'format must be json or markdown' } });
    return;
  }

  const db = getDb();
  const userId = req.userId!;

  const skills = new SkillEngine(db).computeSkillScores(userId);
  const ceilings = new DifficultyEngine(db).computeDifficultyCeilings(userId);
  const weaknesses = new WeaknessEngine(db).computeWeaknesses(userId);
  const failures = new FailureEngine(db).analyzeFailures(userId);
  const progress = new ProgressEngine(db).analyzeProgress(userId);
  const decay = new DecayEngine(db).detectDecayingSkills(userId);
  const contests = new ContestEngine(db).analyzeContestPerformance(userId);
  const recommendations = new RecommendationEngine(db).getOpenRecommendations(userId);

  const generatedAt = new Date().toISOString();

  const skillsWithCeiling = skills.map(s => {
    const c = ceilings.find(c => c.topic === s.topic);
    return { ...s, maxRating: c?.maxRating ?? 0, maxDifficulty: c?.maxDifficulty ?? 'None' };
  });

  if (format === 'json') {
    const report = {
      generatedAt,
      skills: skillsWithCeiling,
      weaknesses,
      failures,
      progress,
      decayingSkills: decay,
      contestPerformance: contests,
      recommendations: recommendations.map(r => ({
        id: r.id,
        problem: r.problem.title,
        url: r.problem.url,
        reason: r.reason,
        priority: r.priority,
        source: r.source
      }))
    };
    res.setHeader('Content-Disposition', `attachment; filename="algopulse-report-${generatedAt.slice(0, 10)}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(report);
    return;
  }

  const lines: string[] = [
    `# AlgoPulse Report`,
    `Generated: ${generatedAt}`,
    '',
    '---',
    '',
    '## Skills',
    '',
    ...skillsWithCeiling
      .sort((a, b) => b.score - a.score)
      .map(s => `- **${s.topic}**: Score ${Math.round(s.score)}/100 · MaxRating ${s.maxRating} · ${s.maxDifficulty}`),
    '',
    '---',
    '',
    '## Weaknesses',
    '',
    weaknesses.length === 0
      ? '_No weaknesses detected._'
      : weaknesses
          .slice(0, 10)
          .map(w => `- **${w.topic}** [${w.severity}]: weakness score ${w.weaknessScore}, skill ${w.skillScore}/100, failure rate ${Math.round(w.failureRate * 100)}%`)
          .join('\n'),
    '',
    '---',
    '',
    '## Failure Analysis',
    '',
    '### Verdict Distribution',
    '',
    Object.entries(failures.verdictDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([v, n]) => `- ${v}: ${n}`)
      .join('\n') || '_No failures recorded._',
    '',
    '### Recurring Patterns',
    '',
    failures.patterns.length === 0
      ? '_No patterns detected yet._'
      : failures.patterns
          .slice(0, 8)
          .map(p => `- **[${p.topic}] ${p.failureType}** (severity ${p.severity.toFixed(1)}/10, ${p.frequency}x): ${p.description}`)
          .join('\n'),
    '',
    '---',
    '',
    '## Progress',
    '',
    `- Biggest improvement: ${progress.biggestImprovement ?? 'N/A'}`,
    `- Biggest regression: ${progress.biggestRegression ?? 'N/A'}`,
    `- Most stable: ${progress.mostStable ?? 'N/A'}`,
    `- Slow improving: ${progress.slowImprovement.join(', ') || 'N/A'}`,
    '',
    ...progress.topicProgress
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 10)
      .map(t => `- **${t.topic}**: ${t.previousScore} → ${t.currentScore} (${t.change > 0 ? '+' : ''}${t.change.toFixed(1)}) · ${t.trend}`),
    '',
    '---',
    '',
    '## Decaying Skills',
    '',
    decay.length === 0
      ? '_No decaying skills detected._'
      : decay
          .slice(0, 8)
          .map(d => `- **${d.topic}** [${d.decaySeverity}]: score dropped ${d.scoreDrop} pts, ${d.daysSinceLastPractice} days without practice`)
          .join('\n'),
    '',
    '---',
    '',
    '## Contest Performance',
    '',
    `- Total contests: ${contests.totalContests}`,
    `- Overall solve rate: ${contests.overallSolveRate}%`,
    `- Recent trend: ${contests.recentTrend}`,
    '',
    ...contests.indexStats.map(s => `- Problem **${s.index}**: ${s.solveRate}% solve rate (${s.solvedCount}/${s.totalAttempts})`),
    '',
    '---',
    '',
    '## Open Recommendations',
    '',
    recommendations.length === 0
      ? '_No open recommendations._'
      : recommendations
          .slice(0, 15)
          .map(r => `- **[P${r.priority}]** [${r.problem.title}](${r.problem.url ?? '#'}) — ${r.reason}`)
          .join('\n'),
    ''
  ];

  const markdown = lines.join('\n');
  res.setHeader('Content-Disposition', `attachment; filename="algopulse-report-${generatedAt.slice(0, 10)}.md"`);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(markdown);
});

export { router as reportRouter };
