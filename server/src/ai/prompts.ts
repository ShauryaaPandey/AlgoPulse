import type { TopicWeakness } from '../analytics/weakness-engine.js';
import type { FailureBreakdown } from '../analytics/failure-engine.js';
import type { ProgressSummary } from '../analytics/progress-engine.js';

const SYSTEM_BASE = `You are an expert competitive programming coach analyzing a student's performance data.
You ONLY explain and interpret pre-computed analytics results provided to you.
You NEVER recalculate scores, invent data, or make up statistics.
Be concise, specific, and actionable. Reference actual topic names and numbers from the data.`;

export function buildWeaknessPrompt(weaknesses: TopicWeakness[]): string {
  const top = weaknesses.slice(0, 8);
  const lines = top.map(w =>
    `- ${w.topic}: weaknessScore=${w.weaknessScore}/100, skillScore=${w.skillScore}/100, failureRate=${Math.round(w.failureRate * 100)}%, severity=${w.severity}`
  );

  return `${SYSTEM_BASE}

WEAKNESS ANALYSIS DATA (pre-computed by AlgoPulse analytics engine):
${lines.join('\n')}

Explain what these weakness scores reveal about this student's skill gaps.
Identify the most urgent areas, explain why they are weak based on the failure rates and skill scores provided,
and suggest specific practice strategies for the top weak topics.`;
}

export function buildFailurePrompt(breakdown: FailureBreakdown): string {
  const totalFailures = Object.values(breakdown.verdictDistribution).reduce((a, b) => a + b, 0);
  const verdictLines = Object.entries(breakdown.verdictDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([verdict, count]) => `  ${verdict}: ${count} (${Math.round((count / totalFailures) * 100)}%)`)
    .join('\n');

  const patternLines = breakdown.patterns.slice(0, 6).map(p =>
    `  [${p.topic}] ${p.failureType} — severity ${p.severity.toFixed(1)}/10, frequency ${p.frequency}x: ${p.description}`
  ).join('\n');

  const topicLines = Object.entries(breakdown.topicFailures)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => `  ${topic}: ${count} failures`)
    .join('\n');

  return `${SYSTEM_BASE}

FAILURE ANALYSIS DATA (pre-computed by AlgoPulse analytics engine):
Total failures: ${totalFailures}

Verdict distribution:
${verdictLines || '  (none)'}

Recurring failure patterns detected:
${patternLines || '  (none detected yet — need more submissions)'}

Top failing topics:
${topicLines || '  (no topic data)'}

Interpret this failure profile. Identify what the recurring patterns reveal about systematic weaknesses,
explain what the verdict distribution suggests about the student's common mistakes,
and give concrete advice to break each detected pattern.`;
}

export function buildProgressPrompt(progress: ProgressSummary): string {
  const topicLines = progress.topicProgress
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 8)
    .map(t => `  ${t.topic}: ${t.previousScore}→${t.currentScore} (${t.change > 0 ? '+' : ''}${t.change}, trend=${t.trend})`)
    .join('\n');

  return `${SYSTEM_BASE}

PROGRESS DATA (pre-computed by AlgoPulse analytics engine):
Biggest improvement: ${progress.biggestImprovement ?? 'none'}
Biggest regression: ${progress.biggestRegression ?? 'none'}
Most stable topic: ${progress.mostStable ?? 'none'}
Slow-improving topics: ${progress.slowImprovement.join(', ') || 'none'}

Per-topic score changes:
${topicLines || '  (no history yet — sync more data)'}

Interpret this progress data. Explain what the trends reveal about the student's learning trajectory,
highlight what's going well and what needs attention, and recommend how to accelerate improvement
in the regressing or slow topics based on the actual score changes shown.`;
}

export function buildRoadmapPrompt(
  weaknesses: TopicWeakness[],
  progress: ProgressSummary
): string {
  const urgentTopics = weaknesses
    .filter(w => w.severity === 'critical' || w.severity === 'high')
    .slice(0, 6)
    .map(w => `  ${w.topic}: severity=${w.severity}, skill=${w.skillScore}/100`);

  const regressingTopics = progress.topicProgress
    .filter(t => t.trend === 'regressing')
    .map(t => `  ${t.topic}: ${t.previousScore}→${t.currentScore}`);

  return `${SYSTEM_BASE}

ROADMAP INPUT DATA (pre-computed by AlgoPulse analytics engine):
Critical/high-severity weak topics:
${urgentTopics.join('\n') || '  (none — good overall skill level)'}

Regressing topics:
${regressingTopics.join('\n') || '  (none — no regressions detected)'}

Slow-improving topics: ${progress.slowImprovement.join(', ') || 'none'}

Explain what this roadmap data reveals about the student's priority learning path.
Suggest a realistic study schedule framing (e.g. "focus on X for 2 weeks, then Y"),
and explain why the ordering makes sense based on severity and regression data.`;
}

export function buildGeneralInsightPrompt(skillSummary: string): string {
  return `${SYSTEM_BASE}

OVERALL SKILL SUMMARY (pre-computed by AlgoPulse analytics engine):
${skillSummary}

Provide an overall assessment of this student's competitive programming profile.
Highlight their strongest areas, most urgent gaps, and one concrete next step.`;
}
