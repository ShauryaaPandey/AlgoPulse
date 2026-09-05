import type Database from 'better-sqlite3';
import { findCompanyProfile, KNOWN_COMPANIES } from './interview-data.js';
import {
  rankPreparationAreas,
  computeTopicCoverage,
  computeDifficultyCoverage,
  computeWeightedTopicAlignment,
  type NormalizedTopic
} from './trend-normalizer.js';
import { WeaknessEngine } from '../analytics/weakness-engine.js';
import { SkillEngine } from '../analytics/skill-engine.js';

export interface PrepArea {
  topic: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  trendWeight: number;
  userSkillScore: number;
  gapScore: number;
}

export interface ReadinessScore {
  total: number;
  breakdown: {
    topicCoverage: number;
    difficultyCoverage: number;
    recentConsistency: number;
    weaknessSeverity: number;
    failureRate: number;
    trendAlignment: number;
  };
}

export interface InterviewPrepResult {
  company: string;
  companyNotes: string;
  preparationAreas: PrepArea[];
  readiness: ReadinessScore;
  knownCompanies: string[];
  disclaimer: string;
}

export function computeInterviewPrep(db: Database.Database, userId: string, companyName = 'Generic'): InterviewPrepResult {
  const skillEngine = new SkillEngine(db);
  const weaknessEngine = new WeaknessEngine(db);

  const skillScores = skillEngine.computeSkillScores(userId);
  const weaknesses = weaknessEngine.computeWeaknesses(userId);

  const skillMap: Record<string, number> = {};
  for (const s of skillScores) skillMap[s.topic] = s.score;

  const company = findCompanyProfile(companyName);

  const prepTopics = rankPreparationAreas(company, weaknesses, skillMap);

  const preparationAreas: PrepArea[] = prepTopics.map(t => ({
    topic: t.topic,
    priority: t.priority,
    trendWeight: t.trendWeight,
    userSkillScore: t.userSkillScore,
    gapScore: t.gapScore
  }));

  const readiness = computeReadiness(db, userId, company, skillMap, weaknesses);

  return {
    company: company.name,
    companyNotes: company.notes,
    preparationAreas,
    readiness,
    knownCompanies: KNOWN_COMPANIES,
    disclaimer: 'This score is a preparation guide only and is not affiliated with, endorsed by, or predictive of actual hiring decisions at any company.'
  };
}

function computeReadiness(
  db: Database.Database,
  userId: string,
  company: ReturnType<typeof findCompanyProfile>,
  skillMap: Record<string, number>,
  weaknesses: ReturnType<InstanceType<typeof WeaknessEngine>['computeWeaknesses']>
): ReadinessScore {
  const topicCoverage = computeTopicCoverage(company.topicWeights, skillMap, 40);

  const solvedRatings = getSolvedRatings(db, userId);
  const difficultyCoverage = computeDifficultyCoverage(company.preferredDifficultyRange, solvedRatings);

  const recentConsistency = computeRecentConsistency(db, userId);

  const criticalCount = weaknesses.filter(w => w.severity === 'critical').length;
  const highCount = weaknesses.filter(w => w.severity === 'high').length;
  const weaknessSeverity = Math.max(0, 100 - criticalCount * 20 - highCount * 10);

  const totalFailures = weaknesses.reduce((sum, w) => sum + w.failureRate, 0);
  const avgFailureRate = weaknesses.length > 0 ? totalFailures / weaknesses.length : 0;
  const failureRate = Math.round(Math.max(0, (1 - avgFailureRate) * 100));

  const trendAlignment = computeWeightedTopicAlignment(company.topicWeights, skillMap);

  const weights = {
    topicCoverage: 0.25,
    difficultyCoverage: 0.15,
    recentConsistency: 0.15,
    weaknessSeverity: 0.20,
    failureRate: 0.10,
    trendAlignment: 0.15
  };

  const total = Math.round(
    topicCoverage * weights.topicCoverage +
    difficultyCoverage * weights.difficultyCoverage +
    recentConsistency * weights.recentConsistency +
    weaknessSeverity * weights.weaknessSeverity +
    failureRate * weights.failureRate +
    trendAlignment * weights.trendAlignment
  );

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown: {
      topicCoverage,
      difficultyCoverage,
      recentConsistency,
      weaknessSeverity,
      failureRate,
      trendAlignment
    }
  };
}

function getSolvedRatings(db: Database.Database, userId: string): number[] {
  const rows = db
    .prepare(`
      SELECT DISTINCT p.rating
      FROM submissions s
      JOIN problems p ON s.problem_id = p.id
      JOIN platform_accounts pa ON s.platform_account_id = pa.id
      WHERE pa.user_id = ?
        AND (s.verdict = 'Accepted' OR s.verdict = 'AC')
        AND p.rating IS NOT NULL
    `)
    .all(userId) as { rating: number }[];
  return rows.map(r => r.rating);
}

function computeRecentConsistency(db: Database.Database, userId: string): number {
  const thirtyDays = db
    .prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN s.verdict = 'Accepted' OR s.verdict = 'AC' THEN 1 ELSE 0 END) as accepted
      FROM submissions s
      JOIN platform_accounts pa ON s.platform_account_id = pa.id
      WHERE pa.user_id = ?
        AND s.submitted_at >= datetime('now', '-30 days')
    `)
    .get(userId) as { total: number; accepted: number };

  if (!thirtyDays || thirtyDays.total === 0) return 0;

  const acceptRate = thirtyDays.accepted / thirtyDays.total;
  const volumeScore = Math.min(1, thirtyDays.total / 20);
  return Math.round(acceptRate * volumeScore * 100);
}
