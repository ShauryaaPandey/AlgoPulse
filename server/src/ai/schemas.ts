import { z } from 'zod';

export const InsightSchema = z.object({
  summary: z.string().describe('2-3 sentence plain-English summary of the analytics result'),
  keyReasons: z.array(z.string()).min(1).max(6).describe('Bullet-point reasons drawn directly from the analytics data'),
  recommendations: z.array(z.string()).min(1).max(6).describe('Actionable next steps based on the analytics data')
});

export type Insight = z.infer<typeof InsightSchema>;

export const WeaknessInsightSchema = InsightSchema.extend({
  topWeakTopics: z.array(z.string()).max(5).describe('Top weak topics by weakness score')
});

export const FailureInsightSchema = InsightSchema.extend({
  dominantFailureType: z.string().nullable().describe('Most frequent failure pattern type, or null if none')
});

export const ProgressInsightSchema = InsightSchema.extend({
  overallTrend: z.enum(['improving', 'stable', 'declining']).describe('Overall skill trajectory')
});

export const RoadmapInsightSchema = InsightSchema.extend({
  estimatedWeeks: z.number().int().min(1).describe('Estimated weeks to meaningful improvement')
});

export type WeaknessInsight = z.infer<typeof WeaknessInsightSchema>;
export type FailureInsight = z.infer<typeof FailureInsightSchema>;
export type ProgressInsight = z.infer<typeof ProgressInsightSchema>;
export type RoadmapInsight = z.infer<typeof RoadmapInsightSchema>;
