import type Database from 'better-sqlite3';

interface DifficultyData {
  topic: string;
  rating: number | null;
  difficulty: string | null;
  verdict: string;
  submitted_at: string;
}

export interface TopicDifficultyCeiling {
  topic: string;
  maxRating: number;
  maxDifficulty: string;
  consistentRating: number;
  recentTrend: 'improving' | 'stable' | 'declining';
}

export class DifficultyEngine {
  constructor(private db: Database.Database) {}

  computeDifficultyCeilings(userId: string): TopicDifficultyCeiling[] {
    const submissions = this.getAcceptedSubmissionsByTopic(userId);
    const topicMap = new Map<string, DifficultyData[]>();

    for (const sub of submissions) {
      if (!topicMap.has(sub.topic)) {
        topicMap.set(sub.topic, []);
      }
      topicMap.get(sub.topic)!.push(sub);
    }

    const ceilings: TopicDifficultyCeiling[] = [];

    for (const [topic, subs] of topicMap.entries()) {
      const ceiling = this.calculateTopicCeiling(topic, subs);
      ceilings.push(ceiling);
    }

    return ceilings;
  }

  private getAcceptedSubmissionsByTopic(userId: string): DifficultyData[] {
    const query = `
      SELECT 
        pt.topic,
        p.rating,
        p.difficulty,
        s.verdict,
        s.submitted_at
      FROM submissions s
      JOIN problems p ON s.problem_id = p.id
      INNER JOIN problem_topics pt ON p.id = pt.problem_id
      JOIN platform_accounts pa ON s.platform_account_id = pa.id
      WHERE pa.user_id = ? AND (s.verdict = 'Accepted' OR s.verdict = 'AC')
      ORDER BY s.submitted_at ASC
    `;

    return this.db.prepare(query).all(userId) as DifficultyData[];
  }

  private calculateTopicCeiling(topic: string, submissions: DifficultyData[]): TopicDifficultyCeiling {
    if (submissions.length === 0) {
      return {
        topic,
        maxRating: 0,
        maxDifficulty: 'None',
        consistentRating: 0,
        recentTrend: 'stable'
      };
    }

    const ratings = submissions
      .map(s => this.normalizeRating(s.rating, s.difficulty))
      .filter(r => r > 0);

    const maxRating = Math.max(...ratings, 0);

    const sortedRatings = [...ratings].sort((a, b) => b - a);
    const top20Percent = Math.max(1, Math.ceil(sortedRatings.length * 0.2));
    const consistentRating = sortedRatings.slice(0, top20Percent).reduce((sum, r) => sum + r, 0) / top20Percent;

    const maxDifficulty = this.ratingToDifficulty(maxRating);

    const recentTrend = this.calculateRecentTrend(submissions);

    return {
      topic,
      maxRating: Math.round(maxRating),
      maxDifficulty,
      consistentRating: Math.round(consistentRating),
      recentTrend
    };
  }

  private normalizeRating(rating: number | null, difficulty: string | null): number {
    if (rating && rating > 0) return rating;

    if (difficulty === 'Easy' || difficulty === 'easy') return 1000;
    if (difficulty === 'Medium' || difficulty === 'medium') return 1500;
    if (difficulty === 'Hard' || difficulty === 'hard') return 2000;

    return 1200;
  }

  private ratingToDifficulty(rating: number): string {
    if (rating < 1200) return 'Easy';
    if (rating < 1600) return 'Medium';
    if (rating < 2000) return 'Hard';
    if (rating < 2400) return 'Very Hard';
    return 'Expert';
  }

  private calculateRecentTrend(submissions: DifficultyData[]): 'improving' | 'stable' | 'declining' {
    if (submissions.length < 6) return 'stable';

    const ratings = submissions.map(s => this.normalizeRating(s.rating, s.difficulty));
    
    const midPoint = Math.floor(ratings.length / 2);
    const firstHalf = ratings.slice(0, midPoint);
    const secondHalf = ratings.slice(midPoint);

    const firstAvg = firstHalf.reduce((sum, r) => sum + r, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 100) return 'improving';
    if (diff < -100) return 'declining';
    return 'stable';
  }
}
