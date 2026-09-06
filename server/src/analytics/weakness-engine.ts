import type Database from 'better-sqlite3';

interface WeaknessData {
  topic: string;
  score: number;
  failureCount: number;
  totalCount: number;
  avgAttempts: number;
}

export interface TopicWeakness {
  topic: string;
  weaknessScore: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  skillScore: number;
  failureRate: number;
  avgAttempts: number;
  problemCount: number;
}

export class WeaknessEngine {
  constructor(private db: Database.Database) {}

  computeWeaknesses(userId: string): TopicWeakness[] {
    const weaknessData = this.getWeaknessData(userId);
    
    const weaknesses = weaknessData.map(data => this.calculateWeakness(data));

    weaknesses.sort((a, b) => b.weaknessScore - a.weaknessScore);

    return weaknesses;
  }

  private getWeaknessData(userId: string): WeaknessData[] {
    const query = `
      SELECT 
        pt.topic,
        COALESCE(ss.score, 0) as score,
        COUNT(CASE WHEN s.verdict != 'Accepted' AND s.verdict != 'AC' THEN 1 END) as failureCount,
        COUNT(*) as totalCount,
        AVG(s.attempt_number) as avgAttempts
      FROM submissions s
      JOIN problems p ON s.problem_id = p.id
      INNER JOIN problem_topics pt ON p.id = pt.problem_id
      JOIN platform_accounts pa ON s.platform_account_id = pa.id
      LEFT JOIN skill_scores ss ON ss.user_id = pa.user_id AND ss.topic = pt.topic
      WHERE pa.user_id = ?
      GROUP BY pt.topic
      HAVING COUNT(*) >= 3
    `;

    return this.db.prepare(query).all(userId) as WeaknessData[];
  }

  private calculateWeakness(data: WeaknessData): TopicWeakness {
    const failureRate = data.failureCount / data.totalCount;
    
    const skillPenalty = Math.max(0, (50 - data.score) / 50);
    
    const attemptPenalty = Math.min(1, (data.avgAttempts - 1) / 3);

    const weaknessScore = 
      (failureRate * 40) +
      (skillPenalty * 40) +
      (attemptPenalty * 20);

    const severity = this.determineSeverity(weaknessScore);

    return {
      topic: data.topic,
      weaknessScore: Math.round(weaknessScore * 100) / 100,
      severity,
      skillScore: Math.round(data.score),
      failureRate: Math.round(failureRate * 100) / 100,
      avgAttempts: Math.round(data.avgAttempts * 10) / 10,
      problemCount: data.totalCount
    };
  }

  private determineSeverity(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }
}
