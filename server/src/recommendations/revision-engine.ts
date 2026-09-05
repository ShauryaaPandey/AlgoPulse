import type Database from 'better-sqlite3';
import { FailureEngine, type FailurePattern } from '../analytics/failure-engine.js';
import { ProblemSelector, type CandidateProblem } from './problem-selector.js';

export interface RevisionItem {
  problem: CandidateProblem;
  topic: string;
  failureType: string;
  failureDescription: string;
  failureSeverity: number;
  lastFailedAt: string;
  failureCount: number;
  daysSinceLastAttempt: number;
  recommendedBecause: string;
  wasRecommendedBefore: boolean;
  lastRecommendedAt: string | null;
}

export interface RevisionGroup {
  topic: string;
  failureType: string;
  failureDescription: string;
  items: RevisionItem[];
}

export interface RevisionPlan {
  groups: RevisionGroup[];
  totalItems: number;
}

interface FailedProblemRow {
  problem_id: string;
  last_failed_at: string;
  failure_count: number;
  verdict: string;
}

interface RecommendationHistoryRow {
  problem_id: string;
  created_at: string;
}

export class RevisionEngine {
  private selector: ProblemSelector;

  constructor(private db: Database.Database) {
    this.selector = new ProblemSelector(db);
  }

  buildRevisionPlan(userId: string): RevisionPlan {
    const { patterns } = new FailureEngine(this.db).analyzeFailures(userId);

    if (patterns.length === 0) {
      return { groups: [], totalItems: 0 };
    }

    const topics = [...new Set(patterns.map(p => p.topic))];
    const failedProblems = this.selector.selectFailedProblemsForRevision(userId, topics);

    if (failedProblems.length === 0) {
      return { groups: [], totalItems: 0 };
    }

    const failureStatsMap = this.getFailureStats(userId, failedProblems.map(p => p.id));
    const recommendationHistoryMap = this.getRecommendationHistory(userId, failedProblems.map(p => p.id));
    const now = new Date();

    const patternByTopic = new Map<string, FailurePattern>();
    for (const pattern of patterns) {
      const existing = patternByTopic.get(pattern.topic);
      if (!existing || pattern.severity > existing.severity) {
        patternByTopic.set(pattern.topic, pattern);
      }
    }

    const items: RevisionItem[] = [];

    for (const problem of failedProblems) {
      const matchingTopics = problem.topics.filter(t => patternByTopic.has(t));
      if (matchingTopics.length === 0) continue;

      const primaryTopic = matchingTopics.reduce((best, t) => {
        const bSev = patternByTopic.get(best)?.severity ?? 0;
        const tSev = patternByTopic.get(t)?.severity ?? 0;
        return tSev > bSev ? t : best;
      });

      const pattern = patternByTopic.get(primaryTopic)!;
      const stats = failureStatsMap.get(problem.id);
      const historyEntry = recommendationHistoryMap.get(problem.id);

      if (!stats) continue;

      const lastFailed = new Date(stats.last_failed_at);
      const daysSince = Math.floor((now.getTime() - lastFailed.getTime()) / (1000 * 60 * 60 * 24));

      const reason = this.buildRevisionReason(pattern, stats, daysSince);

      items.push({
        problem,
        topic: primaryTopic,
        failureType: pattern.failureType,
        failureDescription: pattern.description,
        failureSeverity: pattern.severity,
        lastFailedAt: stats.last_failed_at,
        failureCount: stats.failure_count,
        daysSinceLastAttempt: daysSince,
        recommendedBecause: reason,
        wasRecommendedBefore: !!historyEntry,
        lastRecommendedAt: historyEntry?.created_at ?? null
      });
    }

    items.sort((a, b) => b.failureSeverity - a.failureSeverity || b.failureCount - a.failureCount);

    const groups = this.groupByTopicAndFailureType(items, patternByTopic);

    return { groups, totalItems: items.length };
  }

  private getFailureStats(userId: string, problemIds: string[]): Map<string, FailedProblemRow> {
    if (problemIds.length === 0) return new Map();

    const placeholders = problemIds.map(() => '?').join(', ');

    const rows = this.db
      .prepare(`
        SELECT
          s.problem_id,
          MAX(s.submitted_at) as last_failed_at,
          COUNT(*) as failure_count,
          s.verdict
        FROM submissions s
        JOIN platform_accounts pa ON s.platform_account_id = pa.id
        WHERE pa.user_id = ?
          AND s.problem_id IN (${placeholders})
          AND s.verdict != 'Accepted'
          AND s.verdict != 'AC'
        GROUP BY s.problem_id
      `)
      .all(userId, ...problemIds) as FailedProblemRow[];

    return new Map(rows.map(r => [r.problem_id, r]));
  }

  private getRecommendationHistory(
    userId: string,
    problemIds: string[]
  ): Map<string, RecommendationHistoryRow> {
    if (problemIds.length === 0) return new Map();

    const placeholders = problemIds.map(() => '?').join(', ');

    const rows = this.db
      .prepare(`
        SELECT problem_id, MAX(created_at) as created_at
        FROM recommendations
        WHERE user_id = ? AND problem_id IN (${placeholders})
        GROUP BY problem_id
      `)
      .all(userId, ...problemIds) as RecommendationHistoryRow[];

    return new Map(rows.map(r => [r.problem_id, r]));
  }

  private buildRevisionReason(
    pattern: FailurePattern,
    stats: FailedProblemRow,
    daysSince: number
  ): string {
    const parts: string[] = [];
    parts.push(`Failed ${stats.failure_count}x (${pattern.failureType.replace(/-/g, ' ')})`);
    if (daysSince > 0) {
      parts.push(`last attempted ${daysSince} day${daysSince !== 1 ? 's' : ''} ago`);
    }
    return parts.join(', ');
  }

  private groupByTopicAndFailureType(
    items: RevisionItem[],
    patternByTopic: Map<string, FailurePattern>
  ): RevisionGroup[] {
    const groupMap = new Map<string, RevisionGroup>();

    for (const item of items) {
      const key = `${item.topic}::${item.failureType}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          topic: item.topic,
          failureType: item.failureType,
          failureDescription: item.failureDescription,
          items: []
        });
      }
      groupMap.get(key)!.items.push(item);
    }

    const groups = Array.from(groupMap.values());

    groups.sort((a, b) => {
      const aSev = patternByTopic.get(a.topic)?.severity ?? 0;
      const bSev = patternByTopic.get(b.topic)?.severity ?? 0;
      return bSev - aSev;
    });

    return groups;
  }
}
