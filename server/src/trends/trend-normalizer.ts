import type { CompanyProfile, CompanyTopicWeight } from './interview-data.js';
import type { TopicWeakness } from '../analytics/weakness-engine.js';

export interface NormalizedTopic {
  topic: string;
  trendWeight: number;
  userSkillScore: number;
  gapScore: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export function normalizeTrendData(
  companyProfile: CompanyProfile,
  userSkillScores: Record<string, number>
): NormalizedTopic[] {
  return companyProfile.topicWeights.map(tw => {
    const userScore = userSkillScores[tw.topic] ?? 0;
    const gap = tw.weight - (userScore / 100) * tw.weight;
    const gapScore = Math.round(gap * 100) / 100;

    return {
      topic: tw.topic,
      trendWeight: tw.weight,
      userSkillScore: userScore,
      gapScore,
      priority: classifyPriority(gapScore, tw.weight)
    };
  });
}

export function computeTopicCoverage(
  companyWeights: CompanyTopicWeight[],
  userSkillScores: Record<string, number>,
  coverageThreshold = 50
): number {
  if (companyWeights.length === 0) return 0;

  const covered = companyWeights.filter(tw => {
    const score = userSkillScores[tw.topic] ?? 0;
    return score >= coverageThreshold;
  }).length;

  return Math.round((covered / companyWeights.length) * 100);
}

export function computeDifficultyCoverage(
  companyRange: { min: number; max: number },
  userSolvedRatings: number[]
): number {
  if (userSolvedRatings.length === 0) return 0;

  const inRange = userSolvedRatings.filter(
    r => r >= companyRange.min && r <= companyRange.max
  ).length;

  const ratio = inRange / userSolvedRatings.length;
  const total = Math.min(1, userSolvedRatings.length / 30);
  return Math.round(ratio * total * 100);
}

export function computeWeightedTopicAlignment(
  companyWeights: CompanyTopicWeight[],
  userSkillScores: Record<string, number>
): number {
  if (companyWeights.length === 0) return 0;

  let weightedScore = 0;
  let totalWeight = 0;

  for (const tw of companyWeights) {
    const score = Math.min(100, userSkillScores[tw.topic] ?? 0);
    weightedScore += (score / 100) * tw.weight;
    totalWeight += tw.weight;
  }

  return totalWeight === 0 ? 0 : Math.round((weightedScore / totalWeight) * 100);
}

function classifyPriority(gapScore: number, trendWeight: number): 'critical' | 'high' | 'medium' | 'low' {
  const urgency = gapScore * trendWeight;
  if (urgency >= 0.6) return 'critical';
  if (urgency >= 0.4) return 'high';
  if (urgency >= 0.2) return 'medium';
  return 'low';
}

export function rankPreparationAreas(
  companyProfile: CompanyProfile,
  weaknesses: TopicWeakness[],
  userSkillScores: Record<string, number>
): NormalizedTopic[] {
  const normalized = normalizeTrendData(companyProfile, userSkillScores);

  const weaknessMap = new Map(weaknesses.map(w => [w.topic, w]));

  const scored = normalized.map(nt => {
    const weakness = weaknessMap.get(nt.topic);
    let adjustedGap = nt.gapScore;

    if (weakness) {
      adjustedGap += weakness.weaknessScore / 100 * 0.3;
    }

    return { ...nt, gapScore: Math.round(adjustedGap * 100) / 100 };
  });

  scored.sort((a, b) => b.gapScore - a.gapScore);

  return scored;
}
