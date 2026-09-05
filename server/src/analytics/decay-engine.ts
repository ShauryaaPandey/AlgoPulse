import type Database from 'better-sqlite3';

interface SkillDecayData {
  topic: string;
  currentScore: number;
  historicalBestScore: number;
  daysSinceLastPractice: number;
  lastPracticeDate: string;
}

export interface DecayingSkill {
  topic: string;
  currentScore: number;
  historicalBestScore: number;
  scoreDrop: number;
  dropPercent: number;
  daysSinceLastPractice: number;
  lastPracticeDate: string;
  decaySeverity: 'critical' | 'high' | 'medium' | 'low';
  recommendAction: string;
}

export class DecayEngine {
  constructor(private db: Database.Database) {}

  detectDecayingSkills(userId: string): DecayingSkill[] {
    const decayData = this.getDecayData(userId);
    
    const decayingSkills = decayData
      .map(data => this.analyzeDecay(data))
      .filter(skill => skill !== null) as DecayingSkill[];

    decayingSkills.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.decaySeverity] - severityOrder[b.decaySeverity];
    });

    return decayingSkills;
  }

  private getDecayData(userId: string): SkillDecayData[] {
    const query = `
      SELECT * FROM (
        SELECT 
          ss.topic,
          ss.score as currentScore,
          (
            SELECT MAX(sh.score)
            FROM skill_history sh
            WHERE sh.user_id = ss.user_id AND sh.topic = ss.topic
          ) as historicalBestScore,
          CAST((julianday('now') - julianday(
            (
              SELECT MAX(s.submitted_at)
              FROM submissions s
              JOIN problems p ON s.problem_id = p.id
              JOIN problem_topics pt ON p.id = pt.problem_id
              JOIN platform_accounts pa ON s.platform_account_id = pa.id
              WHERE pa.user_id = ss.user_id AND pt.topic = ss.topic
            )
          )) AS INTEGER) as daysSinceLastPractice,
          (
            SELECT MAX(s.submitted_at)
            FROM submissions s
            JOIN problems p ON s.problem_id = p.id
            JOIN problem_topics pt ON p.id = pt.problem_id
            JOIN platform_accounts pa ON s.platform_account_id = pa.id
            WHERE pa.user_id = ss.user_id AND pt.topic = ss.topic
          ) as lastPracticeDate
        FROM skill_scores ss
        WHERE ss.user_id = ?
      ) sub
      WHERE sub.daysSinceLastPractice IS NOT NULL
    `;

    return this.db.prepare(query).all(userId) as SkillDecayData[];
  }

  private analyzeDecay(data: SkillDecayData): DecayingSkill | null {
    const scoreDrop = data.historicalBestScore - data.currentScore;
    const dropPercent = data.historicalBestScore > 0 
      ? (scoreDrop / data.historicalBestScore) * 100 
      : 0;

    const dayThreshold = 30;
    const scoreThreshold = 10;

    if (data.daysSinceLastPractice < dayThreshold && scoreDrop < scoreThreshold) {
      return null;
    }

    const decaySeverity = this.calculateDecaySeverity(
      scoreDrop,
      dropPercent,
      data.daysSinceLastPractice,
      data.currentScore
    );

    const recommendAction = this.generateRecommendation(
      decaySeverity,
      data.daysSinceLastPractice,
      data.currentScore
    );

    return {
      topic: data.topic,
      currentScore: Math.round(data.currentScore),
      historicalBestScore: Math.round(data.historicalBestScore),
      scoreDrop: Math.round(scoreDrop * 10) / 10,
      dropPercent: Math.round(dropPercent * 10) / 10,
      daysSinceLastPractice: data.daysSinceLastPractice,
      lastPracticeDate: data.lastPracticeDate,
      decaySeverity,
      recommendAction
    };
  }

  private calculateDecaySeverity(
    scoreDrop: number,
    dropPercent: number,
    daysSince: number,
    currentScore: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    let severityScore = 0;

    if (scoreDrop >= 20) severityScore += 3;
    else if (scoreDrop >= 15) severityScore += 2;
    else if (scoreDrop >= 10) severityScore += 1;

    if (dropPercent >= 30) severityScore += 3;
    else if (dropPercent >= 20) severityScore += 2;
    else if (dropPercent >= 10) severityScore += 1;

    if (daysSince >= 90) severityScore += 3;
    else if (daysSince >= 60) severityScore += 2;
    else if (daysSince >= 30) severityScore += 1;

    if (currentScore < 40) severityScore += 2;
    else if (currentScore < 60) severityScore += 1;

    if (severityScore >= 8) return 'critical';
    if (severityScore >= 5) return 'high';
    if (severityScore >= 3) return 'medium';
    return 'low';
  }

  private generateRecommendation(
    severity: 'critical' | 'high' | 'medium' | 'low',
    daysSince: number,
    currentScore: number
  ): string {
    if (severity === 'critical') {
      return `Urgent: Practice ${daysSince >= 90 ? 'immediately' : 'this week'} to regain proficiency. Start with easier problems.`;
    }

    if (severity === 'high') {
      return `High priority: Schedule practice sessions soon. ${currentScore < 50 ? 'Focus on fundamentals.' : 'Review key concepts.'}`;
    }

    if (severity === 'medium') {
      return `Moderate priority: Add to weekly practice rotation to maintain skill level.`;
    }

    return `Low priority: Keep on radar. Practice occasionally to prevent further decay.`;
  }
}
