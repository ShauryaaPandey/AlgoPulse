import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { WeaknessEngine } from '../analytics/weakness-engine.js';
import { FailureEngine } from '../analytics/failure-engine.js';
import { DecayEngine } from '../analytics/decay-engine.js';
import { DifficultyEngine } from '../analytics/difficulty-engine.js';
import { ProblemSelector, type CandidateProblem } from './problem-selector.js';

export interface Recommendation {
  id: string;
  problemId: string;
  problem: CandidateProblem;
  reason: string;
  priority: number;
  createdAt: string;
  completedAt: string | null;
  source: 'weakness' | 'failure' | 'decay' | 'new-topic';
}

interface DbRecommendation {
  id: string;
  user_id: string;
  problem_id: string;
  reason: string;
  priority: number;
  created_at: string;
  completed_at: string | null;
}

interface DbProblem {
  id: string;
  platform: string;
  external_id: string;
  title: string;
  url: string | null;
  difficulty: string | null;
  rating: number | null;
  topics: string | null;
}

export class RecommendationEngine {
  private selector: ProblemSelector;

  constructor(private db: Database.Database) {
    this.selector = new ProblemSelector(db);
  }

  generateRecommendations(userId: string, maxPerSource = 5): Recommendation[] {
    const weaknessEngine = new WeaknessEngine(this.db);
    const failureEngine = new FailureEngine(this.db);
    const decayEngine = new DecayEngine(this.db);
    const difficultyEngine = new DifficultyEngine(this.db);

    const weaknesses = weaknessEngine.computeWeaknesses(userId);
    const { patterns } = failureEngine.analyzeFailures(userId);
    const decayingSkills = decayEngine.detectDecayingSkills(userId);
    const ceilings = difficultyEngine.computeDifficultyCeilings(userId);

    const ceilingMap = new Map(ceilings.map(c => [c.topic, c]));

    const scored: Array<{
      problem: CandidateProblem;
      reason: string;
      priority: number;
      source: Recommendation['source'];
    }> = [];

    const addedProblemIds = new Set<string>();

    for (const weakness of weaknesses.slice(0, 6)) {
      const ceiling = ceilingMap.get(weakness.topic);
      const consistentRating = ceiling?.consistentRating ?? 1200;

      const candidates = this.selector.selectCandidatesForTopic(
        userId,
        weakness.topic,
        consistentRating,
        maxPerSource
      );

      for (const problem of candidates) {
        if (addedProblemIds.has(problem.id)) continue;
        addedProblemIds.add(problem.id);

        const priority = this.computeWeaknessPriority(weakness.weaknessScore, weakness.severity);
        const daysSince = this.getDaysSinceLastAttempt(userId, weakness.topic);
        const reason = this.buildWeaknessReason(weakness, daysSince);

        scored.push({ problem, reason, priority, source: 'weakness' });
      }
    }

    for (const pattern of patterns.slice(0, 4)) {
      const ceiling = ceilingMap.get(pattern.topic);
      const consistentRating = ceiling?.consistentRating ?? 1200;

      const candidates = this.selector.selectCandidatesForTopic(
        userId,
        pattern.topic,
        consistentRating,
        maxPerSource
      );

      for (const problem of candidates) {
        if (addedProblemIds.has(problem.id)) continue;
        addedProblemIds.add(problem.id);

        const priority = this.computeFailurePriority(pattern.severity, pattern.frequency);
        const reason = this.buildFailureReason(pattern);

        scored.push({ problem, reason, priority, source: 'failure' });
      }
    }

    for (const skill of decayingSkills.slice(0, 4)) {
      const ceiling = ceilingMap.get(skill.topic);
      const consistentRating = ceiling?.consistentRating ?? skill.currentScore * 20;

      const minRating = Math.max(800, consistentRating - 200);
      const maxRating = consistentRating + 100;

      const candidates = this.selector.selectCandidates(
        userId,
        [skill.topic],
        minRating,
        maxRating,
        maxPerSource
      );

      for (const problem of candidates) {
        if (addedProblemIds.has(problem.id)) continue;
        addedProblemIds.add(problem.id);

        const priority = this.computeDecayPriority(skill.decaySeverity);
        const reason = this.buildDecayReason(skill);

        scored.push({ problem, reason, priority, source: 'decay' });
      }
    }

    scored.sort((a, b) => b.priority - a.priority);

    const now = new Date().toISOString();
    const persisted: Recommendation[] = [];

    this.db.transaction(() => {
      for (const item of scored) {
        const existing = this.db
          .prepare('SELECT id FROM recommendations WHERE user_id = ? AND problem_id = ? AND completed_at IS NULL')
          .get(userId, item.problem.id) as { id: string } | undefined;

        if (existing) {
          this.db
            .prepare('UPDATE recommendations SET reason = ?, priority = ? WHERE id = ?')
            .run(item.reason, item.priority, existing.id);

          persisted.push({
            id: existing.id,
            problemId: item.problem.id,
            problem: item.problem,
            reason: item.reason,
            priority: item.priority,
            createdAt: now,
            completedAt: null,
            source: item.source
          });
        } else {
          const id = uuidv4();
          this.db
            .prepare(`
              INSERT INTO recommendations (id, user_id, problem_id, reason, priority, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `)
            .run(id, userId, item.problem.id, item.reason, item.priority, now);

          persisted.push({
            id,
            problemId: item.problem.id,
            problem: item.problem,
            reason: item.reason,
            priority: item.priority,
            createdAt: now,
            completedAt: null,
            source: item.source
          });
        }
      }
    })();

    return persisted.sort((a, b) => b.priority - a.priority);
  }

  getOpenRecommendations(userId: string): Recommendation[] {
    const rows = this.db
      .prepare(`
        SELECT r.id, r.user_id, r.problem_id, r.reason, r.priority, r.created_at, r.completed_at,
               p.id as p_id, p.platform, p.external_id, p.title, p.url, p.difficulty, p.rating,
               GROUP_CONCAT(pt.topic, '|') as topics
        FROM recommendations r
        JOIN problems p ON r.problem_id = p.id
        LEFT JOIN problem_topics pt ON p.id = pt.problem_id
        WHERE r.user_id = ? AND r.completed_at IS NULL
        GROUP BY r.id
        ORDER BY r.priority DESC, r.created_at DESC
      `)
      .all(userId) as (DbRecommendation & {
        p_id: string; platform: string; external_id: string;
        title: string; url: string | null; difficulty: string | null;
        rating: number | null; topics: string | null;
      })[];

    return rows.map(row => ({
      id: row.id,
      problemId: row.problem_id,
      problem: {
        id: row.p_id,
        platform: row.platform,
        external_id: row.external_id,
        title: row.title,
        url: row.url,
        difficulty: row.difficulty,
        rating: row.rating,
        topics: row.topics ? [...new Set(row.topics.split('|'))] : []
      },
      reason: row.reason,
      priority: row.priority,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      source: this.inferSource(row.reason)
    }));
  }

  dismiss(recommendationId: string, userId: string): boolean {
    const result = this.db
      .prepare(`
        UPDATE recommendations SET completed_at = ?
        WHERE id = ? AND user_id = ? AND completed_at IS NULL
      `)
      .run(new Date().toISOString(), recommendationId, userId);
    return result.changes > 0;
  }

  autoCompleteForSolvedProblems(userId: string, solvedProblemIds: string[]): number {
    if (solvedProblemIds.length === 0) return 0;
    const now = new Date().toISOString();
    let count = 0;

    for (const problemId of solvedProblemIds) {
      const result = this.db
        .prepare(`
          UPDATE recommendations SET completed_at = ?
          WHERE user_id = ? AND problem_id = ? AND completed_at IS NULL
        `)
        .run(now, userId, problemId);
      count += result.changes;
    }

    return count;
  }

  private computeWeaknessPriority(weaknessScore: number, severity: string): number {
    const base = Math.round(weaknessScore * 10);
    const bump = severity === 'critical' ? 30 : severity === 'high' ? 20 : severity === 'medium' ? 10 : 0;
    return Math.min(1000, base + bump);
  }

  private computeFailurePriority(severity: number, frequency: number): number {
    return Math.min(1000, Math.round(severity * 60 + frequency * 5));
  }

  private computeDecayPriority(severity: string): number {
    if (severity === 'critical') return 800;
    if (severity === 'high') return 650;
    if (severity === 'medium') return 450;
    return 300;
  }

  private getDaysSinceLastAttempt(userId: string, topic: string): number {
    const row = this.db
      .prepare(`
        SELECT CAST((julianday('now') - julianday(MAX(s.submitted_at))) AS INTEGER) as days
        FROM submissions s
        JOIN problems p ON s.problem_id = p.id
        JOIN problem_topics pt ON p.id = pt.problem_id
        JOIN platform_accounts pa ON s.platform_account_id = pa.id
        WHERE pa.user_id = ? AND pt.topic = ?
      `)
      .get(userId, topic) as { days: number | null };
    return row?.days ?? 0;
  }

  private buildWeaknessReason(
    weakness: { topic: string; weaknessScore: number; skillScore: number; failureRate: number },
    daysSince: number
  ): string {
    const parts: string[] = [];

    if (weakness.failureRate >= 0.5) {
      parts.push(`${Math.round(weakness.failureRate * 100)}% failure rate on ${weakness.topic}`);
    } else if (weakness.skillScore < 40) {
      parts.push(`Low skill score (${weakness.skillScore}/100) in ${weakness.topic}`);
    } else {
      parts.push(`Weak area: ${weakness.topic}`);
    }

    if (daysSince > 0) {
      parts.push(`no practice for ${daysSince} day${daysSince !== 1 ? 's' : ''}`);
    }

    return parts.join(', ');
  }

  private buildFailureReason(pattern: { topic: string; failureType: string; frequency: number; description: string }): string {
    return `Recurring ${pattern.failureType.replace(/-/g, ' ')} on ${pattern.topic} (${pattern.frequency}x) — ${pattern.description}`;
  }

  private buildDecayReason(skill: { topic: string; scoreDrop: number; daysSinceLastPractice: number; decaySeverity: string }): string {
    return `${skill.topic} skill decaying — score dropped ${skill.scoreDrop} pts, ${skill.daysSinceLastPractice} days without practice`;
  }

  private inferSource(reason: string): Recommendation['source'] {
    if (reason.includes('decaying') || reason.includes('days without practice')) return 'decay';
    if (reason.includes('failure rate') || reason.includes('Recurring')) return 'failure';
    return 'weakness';
  }
}
