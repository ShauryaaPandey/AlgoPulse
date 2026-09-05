import type Database from 'better-sqlite3';

export interface CandidateProblem {
  id: string;
  platform: string;
  external_id: string;
  title: string;
  url: string | null;
  difficulty: string | null;
  rating: number | null;
  topics: string[];
}

interface ProblemRow {
  id: string;
  platform: string;
  external_id: string;
  title: string;
  url: string | null;
  difficulty: string | null;
  rating: number | null;
  topics: string | null;
}

export class ProblemSelector {
  constructor(private db: Database.Database) {}

  selectCandidates(
    userId: string,
    topics: string[],
    minRating: number,
    maxRating: number,
    limit = 50
  ): CandidateProblem[] {
    if (topics.length === 0) return [];

    const solvedProblemIds = this.getSolvedProblemIds(userId);
    const openRecommendationProblemIds = this.getOpenRecommendationProblemIds(userId);
    const excludeIds = new Set([...solvedProblemIds, ...openRecommendationProblemIds]);

    const placeholders = topics.map(() => '?').join(', ');

    const query = `
      SELECT
        p.id,
        p.platform,
        p.external_id,
        p.title,
        p.url,
        p.difficulty,
        p.rating,
        GROUP_CONCAT(pt2.topic, '|') as topics
      FROM problems p
      JOIN problem_topics pt ON p.id = pt.problem_id
      LEFT JOIN problem_topics pt2 ON p.id = pt2.problem_id
      WHERE pt.topic IN (${placeholders})
        AND (
          (p.rating IS NOT NULL AND p.rating >= ? AND p.rating <= ?)
          OR
          (p.rating IS NULL AND p.difficulty IS NOT NULL)
        )
      GROUP BY p.id
      ORDER BY p.rating ASC NULLS LAST
      LIMIT ?
    `;

    const rows = this.db
      .prepare(query)
      .all(...topics, minRating, maxRating, limit * 3) as ProblemRow[];

    const candidates: CandidateProblem[] = rows
      .filter(row => !excludeIds.has(row.id))
      .slice(0, limit)
      .map(row => ({
        id: row.id,
        platform: row.platform,
        external_id: row.external_id,
        title: row.title,
        url: row.url,
        difficulty: row.difficulty,
        rating: row.rating,
        topics: row.topics ? [...new Set(row.topics.split('|'))] : []
      }));

    return candidates;
  }

  selectCandidatesForTopic(
    userId: string,
    topic: string,
    consistentRating: number,
    limit = 10
  ): CandidateProblem[] {
    const minRating = Math.max(800, consistentRating - 100);
    const maxRating = consistentRating + 300;
    return this.selectCandidates(userId, [topic], minRating, maxRating, limit);
  }

  selectFailedProblemsForRevision(userId: string, topics: string[]): CandidateProblem[] {
    if (topics.length === 0) return [];

    const placeholders = topics.map(() => '?').join(', ');

    const query = `
      SELECT DISTINCT
        p.id,
        p.platform,
        p.external_id,
        p.title,
        p.url,
        p.difficulty,
        p.rating,
        GROUP_CONCAT(pt2.topic, '|') as topics
      FROM submissions s
      JOIN problems p ON s.problem_id = p.id
      JOIN problem_topics pt ON p.id = pt.problem_id
      LEFT JOIN problem_topics pt2 ON p.id = pt2.problem_id
      JOIN platform_accounts pa ON s.platform_account_id = pa.id
      WHERE pa.user_id = ?
        AND pt.topic IN (${placeholders})
        AND p.id NOT IN (
          SELECT DISTINCT s2.problem_id
          FROM submissions s2
          JOIN platform_accounts pa2 ON s2.platform_account_id = pa2.id
          WHERE pa2.user_id = ?
            AND (s2.verdict = 'Accepted' OR s2.verdict = 'AC')
        )
        AND EXISTS (
          SELECT 1 FROM submissions s3
          JOIN platform_accounts pa3 ON s3.platform_account_id = pa3.id
          WHERE pa3.user_id = ?
            AND s3.problem_id = p.id
            AND s3.verdict != 'Accepted'
            AND s3.verdict != 'AC'
        )
      GROUP BY p.id
      ORDER BY p.rating ASC NULLS LAST
    `;

    const rows = this.db
      .prepare(query)
      .all(userId, ...topics, userId, userId) as ProblemRow[];

    return rows.map(row => ({
      id: row.id,
      platform: row.platform,
      external_id: row.external_id,
      title: row.title,
      url: row.url,
      difficulty: row.difficulty,
      rating: row.rating,
      topics: row.topics ? [...new Set(row.topics.split('|'))] : []
    }));
  }

  private getSolvedProblemIds(userId: string): string[] {
    const rows = this.db
      .prepare(`
        SELECT DISTINCT s.problem_id
        FROM submissions s
        JOIN platform_accounts pa ON s.platform_account_id = pa.id
        WHERE pa.user_id = ? AND (s.verdict = 'Accepted' OR s.verdict = 'AC')
      `)
      .all(userId) as { problem_id: string }[];
    return rows.map(r => r.problem_id);
  }

  private getOpenRecommendationProblemIds(userId: string): string[] {
    const rows = this.db
      .prepare(`
        SELECT problem_id FROM recommendations
        WHERE user_id = ? AND completed_at IS NULL
      `)
      .all(userId) as { problem_id: string }[];
    return rows.map(r => r.problem_id);
  }
}
