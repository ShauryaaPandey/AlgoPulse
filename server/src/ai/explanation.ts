import { generateObject } from 'ai';
import { z } from 'zod';
import { getGenerativeModel, isAiConfigured } from './client.js';
import {
  InsightSchema,
  WeaknessInsightSchema,
  FailureInsightSchema,
  ProgressInsightSchema,
  RoadmapInsightSchema,
  type Insight,
  type WeaknessInsight,
  type FailureInsight,
  type ProgressInsight,
  type RoadmapInsight
} from './schemas.js';
import {
  buildWeaknessPrompt,
  buildFailurePrompt,
  buildProgressPrompt,
  buildRoadmapPrompt,
  buildGeneralInsightPrompt
} from './prompts.js';
import type { TopicWeakness } from '../analytics/weakness-engine.js';
import type { FailureBreakdown } from '../analytics/failure-engine.js';
import type { ProgressSummary } from '../analytics/progress-engine.js';

function requireAi(): void {
  if (!isAiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to your .env to enable AI explanations.');
  }
}

async function callAi<T>(schema: z.ZodType<T>, prompt: string): Promise<T> {
  const model = getGenerativeModel();
  const { object } = await generateObject({ model, schema, prompt });
  return object;
}

export async function explainWeaknesses(weaknesses: TopicWeakness[]): Promise<WeaknessInsight> {
  requireAi();

  if (weaknesses.length === 0) {
    return {
      summary: 'No weaknesses detected yet. Keep practicing to get personalised insights.',
      keyReasons: ['Not enough submission data to detect patterns'],
      recommendations: ['Sync your profiles and solve more problems across different topics'],
      topWeakTopics: []
    };
  }

  const prompt = buildWeaknessPrompt(weaknesses);
  const base = await callAi(WeaknessInsightSchema, prompt);

  return {
    ...base,
    topWeakTopics: weaknesses.slice(0, 5).map(w => w.topic)
  };
}

export async function explainFailures(breakdown: FailureBreakdown): Promise<FailureInsight> {
  requireAi();

  const totalFailures = Object.values(breakdown.verdictDistribution).reduce((a, b) => a + b, 0);

  if (totalFailures === 0) {
    return {
      summary: 'No failures recorded yet. Sync your profiles to start tracking failure patterns.',
      keyReasons: ['No failure data available'],
      recommendations: ['Sync your profiles and attempt more problems to see failure analysis'],
      dominantFailureType: null
    };
  }

  const prompt = buildFailurePrompt(breakdown);
  const base = await callAi(FailureInsightSchema, prompt);

  const dominantPattern = breakdown.patterns.length > 0
    ? breakdown.patterns.sort((a, b) => b.severity - a.severity)[0]!.failureType
    : null;

  return { ...base, dominantFailureType: dominantPattern };
}

export async function explainProgress(progress: ProgressSummary): Promise<ProgressInsight> {
  requireAi();

  if (progress.topicProgress.length === 0) {
    return {
      summary: 'No progress history yet. Sync regularly to track skill improvement over time.',
      keyReasons: ['Not enough history to compute trends'],
      recommendations: ['Sync your profiles multiple times over weeks to build progress history'],
      overallTrend: 'stable'
    };
  }

  const prompt = buildProgressPrompt(progress);
  const base = await callAi(ProgressInsightSchema, prompt);

  const trends = progress.topicProgress.map(t => t.trend);
  const improving = trends.filter(t => t === 'improving').length;
  const regressing = trends.filter(t => t === 'regressing').length;
  const overallTrend: 'improving' | 'stable' | 'declining' =
    improving > regressing * 2 ? 'improving' :
    regressing > improving * 2 ? 'declining' :
    'stable';

  return { ...base, overallTrend };
}

export async function explainRoadmap(
  weaknesses: TopicWeakness[],
  progress: ProgressSummary
): Promise<RoadmapInsight> {
  requireAi();

  const urgentCount = weaknesses.filter(w => w.severity === 'critical' || w.severity === 'high').length;

  if (urgentCount === 0 && progress.topicProgress.length === 0) {
    return {
      summary: 'No roadmap data available yet. Sync your profiles to generate a personalised roadmap.',
      keyReasons: ['No analytics data available'],
      recommendations: ['Sync your competitive programming profiles to get started'],
      estimatedWeeks: 4
    };
  }

  const prompt = buildRoadmapPrompt(weaknesses, progress);
  const base = await callAi(RoadmapInsightSchema, prompt);

  const estimatedWeeks = Math.max(2, Math.min(16, urgentCount * 2 + progress.slowImprovement.length));

  return { ...base, estimatedWeeks };
}

export async function explainGeneral(skillSummary: string): Promise<Insight> {
  requireAi();
  const prompt = buildGeneralInsightPrompt(skillSummary);
  return callAi(InsightSchema, prompt);
}
