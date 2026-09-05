import type Database from 'better-sqlite3';
import { WeaknessEngine, type TopicWeakness } from '../analytics/weakness-engine.js';
import { DecayEngine, type DecayingSkill } from '../analytics/decay-engine.js';
import { DifficultyEngine, type TopicDifficultyCeiling } from '../analytics/difficulty-engine.js';
import { ProblemSelector, type CandidateProblem } from './problem-selector.js';

export interface RoadmapWeek {
  weekNumber: number;
  topic: string;
  focus: string;
  targetRatingMin: number;
  targetRatingMax: number;
  problems: CandidateProblem[];
  reason: string;
  isDecayRecovery: boolean;
  currentScore: number;
  targetScore: number;
}

export interface Roadmap {
  weeks: RoadmapWeek[];
  totalTopics: number;
  estimatedWeeks: number;
  summary: string;
}

export class RoadmapEngine {
  private selector: ProblemSelector;

  constructor(private db: Database.Database) {
    this.selector = new ProblemSelector(db);
  }

  buildRoadmap(userId: string, totalWeeks = 8): Roadmap {
    const weaknessEngine = new WeaknessEngine(this.db);
    const decayEngine = new DecayEngine(this.db);
    const difficultyEngine = new DifficultyEngine(this.db);

    const weaknesses = weaknessEngine.computeWeaknesses(userId);
    const decayingSkills = decayEngine.detectDecayingSkills(userId);
    const ceilings = difficultyEngine.computeDifficultyCeilings(userId);

    const ceilingMap = new Map(ceilings.map(c => [c.topic, c]));
    const decayMap = new Map(decayingSkills.map(d => [d.topic, d]));

    const orderedTopics = this.prioritizeTopics(weaknesses, decayingSkills, ceilingMap);

    const weeks: RoadmapWeek[] = [];

    for (let i = 0; i < Math.min(orderedTopics.length, totalWeeks); i++) {
      const entry = orderedTopics[i];
      const ceiling = ceilingMap.get(entry.topic);
      const decay = decayMap.get(entry.topic);

      const consistentRating = ceiling?.consistentRating ?? 1200;

      let targetMin: number;
      let targetMax: number;

      if (decay) {
        targetMin = Math.max(800, consistentRating - 200);
        targetMax = consistentRating + 50;
      } else {
        targetMin = Math.max(800, consistentRating - 50);
        targetMax = consistentRating + 300;
      }

      const problems = this.selector.selectCandidatesForTopic(userId, entry.topic, consistentRating, 5);

      const currentScore = entry.skillScore ?? 0;
      const targetScore = Math.min(100, currentScore + 15);

      weeks.push({
        weekNumber: i + 1,
        topic: entry.topic,
        focus: this.buildFocusLabel(entry, decay),
        targetRatingMin: targetMin,
        targetRatingMax: targetMax,
        problems,
        reason: entry.reason,
        isDecayRecovery: !!decay,
        currentScore,
        targetScore
      });
    }

    const totalTopics = orderedTopics.length;
    const estimatedWeeks = Math.ceil(totalTopics * 1.2);

    const summary = this.buildSummary(weeks, weaknesses, decayingSkills);

    return { weeks, totalTopics, estimatedWeeks, summary };
  }

  private prioritizeTopics(
    weaknesses: TopicWeakness[],
    decayingSkills: DecayingSkill[],
    ceilingMap: Map<string, TopicDifficultyCeiling>
  ): Array<{ topic: string; skillScore: number; reason: string; urgencyScore: number }> {
    const topicMap = new Map<string, { topic: string; skillScore: number; reason: string; urgencyScore: number }>();

    for (const decay of decayingSkills) {
      const urgency =
        decay.decaySeverity === 'critical' ? 900 :
        decay.decaySeverity === 'high' ? 750 :
        decay.decaySeverity === 'medium' ? 550 : 350;

      const existing = topicMap.get(decay.topic);
      if (!existing || urgency > existing.urgencyScore) {
        topicMap.set(decay.topic, {
          topic: decay.topic,
          skillScore: decay.currentScore,
          reason: `Skill decaying — ${decay.scoreDrop} pt drop over ${decay.daysSinceLastPractice} days`,
          urgencyScore: urgency
        });
      }
    }

    for (const weakness of weaknesses) {
      const severityBonus =
        weakness.severity === 'critical' ? 400 :
        weakness.severity === 'high' ? 300 :
        weakness.severity === 'medium' ? 200 : 100;

      const urgency = Math.round(weakness.weaknessScore * 5) + severityBonus;

      const existing = topicMap.get(weakness.topic);
      if (!existing || urgency > existing.urgencyScore) {
        topicMap.set(weakness.topic, {
          topic: weakness.topic,
          skillScore: weakness.skillScore,
          reason: `${weakness.severity} weakness — ${Math.round(weakness.failureRate * 100)}% failure rate, skill score ${weakness.skillScore}`,
          urgencyScore: urgency
        });
      }
    }

    const topics = Array.from(topicMap.values());
    topics.sort((a, b) => b.urgencyScore - a.urgencyScore);
    return topics;
  }

  private buildFocusLabel(
    entry: { topic: string; skillScore: number; urgencyScore: number },
    decay: DecayingSkill | undefined
  ): string {
    if (decay) {
      if (decay.decaySeverity === 'critical') return 'Urgent Revision';
      if (decay.decaySeverity === 'high') return 'Skill Recovery';
      return 'Refresher Practice';
    }
    if (entry.skillScore < 30) return 'Foundation Building';
    if (entry.skillScore < 55) return 'Core Strengthening';
    return 'Skill Advancement';
  }

  private buildSummary(
    weeks: RoadmapWeek[],
    weaknesses: TopicWeakness[],
    decayingSkills: DecayingSkill[]
  ): string {
    const criticalCount = weaknesses.filter(w => w.severity === 'critical').length;
    const decayCount = decayingSkills.filter(d => d.decaySeverity === 'critical' || d.decaySeverity === 'high').length;
    const parts: string[] = [];

    if (decayCount > 0) parts.push(`${decayCount} skill${decayCount > 1 ? 's' : ''} need immediate revision`);
    if (criticalCount > 0) parts.push(`${criticalCount} critical weakness${criticalCount > 1 ? 'es' : ''} to address`);

    parts.push(`${weeks.length}-week focused practice plan across ${weeks.length} topics`);
    return parts.join(' · ');
  }
}
