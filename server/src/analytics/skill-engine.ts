import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

interface SubmissionData {
  verdict: string;
  difficulty: string | null;
  rating: number | null;
  submitted_at: string;
  execution_time: number | null;
  attempt_number: number;
  topic: string;
  problem_index: string | null;
}

interface TopicSkillScore {
  topic: string;
  score: number;
  confidence: number;
}

export class SkillEngine {
  constructor(private db: Database.Database) {}

  computeSkillScores(userId: string): TopicSkillScore[] {
    const submissions = this.getSubmissionsByTopic(userId);
    const topicMap = new Map<string, SubmissionData[]>();

    for (const sub of submissions) {
      if (!sub.topic) continue;
      if (!topicMap.has(sub.topic)) {
        topicMap.set(sub.topic, []);
      }
      topicMap.get(sub.topic)!.push(sub);
    }

    const scores: TopicSkillScore[] = [];

    for (const [topic, subs] of topicMap.entries()) {
      const score = this.calculateTopicScore(subs);
      scores.push({ topic, score: score.score, confidence: score.confidence });
    }

    this.saveSkillScores(userId, scores);

    return scores;
  }

  private getSubmissionsByTopic(userId: string): SubmissionData[] {
    const query = `
      SELECT 
        s.verdict,
        s.submitted_at,
        s.execution_time,
        s.attempt_number,
        p.difficulty,
        p.rating,
        pt.topic,
        cp.problem_index
      FROM submissions s
      JOIN problems p ON s.problem_id = p.id
      INNER JOIN problem_topics pt ON p.id = pt.problem_id
      LEFT JOIN platform_accounts pa ON s.platform_account_id = pa.id
      LEFT JOIN contest_submissions cs ON s.id = cs.submission_id
      LEFT JOIN contest_problems cp ON cs.contest_id = cp.contest_id AND s.problem_id = cp.problem_id
      WHERE pa.user_id = ?
      ORDER BY s.submitted_at ASC
    `;

    return this.db.prepare(query).all(userId) as SubmissionData[];
  }

  private calculateTopicScore(submissions: SubmissionData[]): { score: number; confidence: number } {
    if (submissions.length === 0) {
      return { score: 0, confidence: 0 };
    }

    const acceptedSubs = submissions.filter(s => s.verdict === 'Accepted' || s.verdict === 'AC');
    const successRate = acceptedSubs.length / submissions.length;

    const difficultyWeight = this.calculateDifficultyWeight(acceptedSubs);
    
    const recentPerformance = this.calculateRecentPerformance(submissions);
    
    const contestPerformance = this.calculateContestPerformance(submissions);
    
    const consistency = this.calculateConsistency(submissions);
    
    const timeEfficiency = this.calculateTimeEfficiency(acceptedSubs);
    
    const failurePenalty = this.calculateFailurePenalty(submissions);

    const score = Math.max(0, Math.min(100,
      (successRate * 20) +
      (difficultyWeight * 25) +
      (recentPerformance * 15) +
      (contestPerformance * 15) +
      (consistency * 15) +
      (timeEfficiency * 10) -
      (failurePenalty * 10)
    ));

    const confidence = Math.min(1.0, submissions.length / 20);

    return { score, confidence };
  }

  private calculateDifficultyWeight(acceptedSubmissions: SubmissionData[]): number {
    if (acceptedSubmissions.length === 0) return 0;

    const ratingSum = acceptedSubmissions.reduce((sum, sub) => {
      if (sub.rating) return sum + sub.rating;
      if (sub.difficulty === 'Easy' || sub.difficulty === 'easy') return sum + 1000;
      if (sub.difficulty === 'Medium' || sub.difficulty === 'medium') return sum + 1500;
      if (sub.difficulty === 'Hard' || sub.difficulty === 'hard') return sum + 2000;
      return sum + 1200;
    }, 0);

    const avgRating = ratingSum / acceptedSubmissions.length;
    return Math.min(1.0, avgRating / 2500);
  }

  private calculateRecentPerformance(submissions: SubmissionData[]): number {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentSubs = submissions.filter(s => new Date(s.submitted_at) >= thirtyDaysAgo);
    
    if (recentSubs.length === 0) return 0;

    const recentAccepted = recentSubs.filter(s => s.verdict === 'Accepted' || s.verdict === 'AC');
    return recentAccepted.length / recentSubs.length;
  }

  private calculateContestPerformance(submissions: SubmissionData[]): number {
    const contestSubs = submissions.filter(s => s.problem_index !== null);
    
    if (contestSubs.length === 0) return 0.5;

    const contestAccepted = contestSubs.filter(s => s.verdict === 'Accepted' || s.verdict === 'AC');
    return contestAccepted.length / contestSubs.length;
  }

  private calculateConsistency(submissions: SubmissionData[]): number {
    if (submissions.length < 5) return 0;

    const chunks = [];
    const chunkSize = Math.ceil(submissions.length / 5);
    
    for (let i = 0; i < submissions.length; i += chunkSize) {
      chunks.push(submissions.slice(i, i + chunkSize));
    }

    const chunkRates = chunks.map(chunk => {
      const accepted = chunk.filter(s => s.verdict === 'Accepted' || s.verdict === 'AC').length;
      return accepted / chunk.length;
    });

    const mean = chunkRates.reduce((sum, rate) => sum + rate, 0) / chunkRates.length;
    const variance = chunkRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / chunkRates.length;
    const stdDev = Math.sqrt(variance);

    return Math.max(0, 1 - stdDev);
  }

  private calculateTimeEfficiency(acceptedSubmissions: SubmissionData[]): number {
    const withTime = acceptedSubmissions.filter(s => s.execution_time !== null && s.execution_time > 0);
    
    if (withTime.length === 0) return 0.5;

    const avgTime = withTime.reduce((sum, s) => sum + s.execution_time!, 0) / withTime.length;
    
    return Math.max(0, Math.min(1, 1 - (avgTime / 5000)));
  }

  private calculateFailurePenalty(submissions: SubmissionData[]): number {
    const failedSubs = submissions.filter(s => s.verdict !== 'Accepted' && s.verdict !== 'AC');
    
    if (failedSubs.length === 0) return 0;

    const failureRate = failedSubs.length / submissions.length;
    
    const multipleAttempts = submissions.filter(s => s.attempt_number > 3).length;
    const multipleAttemptPenalty = Math.min(0.3, (multipleAttempts / submissions.length) * 0.5);

    return Math.min(1.0, failureRate * 0.7 + multipleAttemptPenalty);
  }

  private saveSkillScores(userId: string, scores: TopicSkillScore[]): void {
    const timestamp = new Date().toISOString();

    this.db.transaction(() => {
      const upsertStmt = this.db.prepare(`
        INSERT INTO skill_scores (id, user_id, topic, score, confidence, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, topic) 
        DO UPDATE SET score = excluded.score, confidence = excluded.confidence, updated_at = excluded.updated_at
      `);

      const historyStmt = this.db.prepare(`
        INSERT INTO skill_history (id, user_id, topic, score, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const { topic, score, confidence } of scores) {
        upsertStmt.run(uuidv4(), userId, topic, score, confidence, timestamp);
        historyStmt.run(uuidv4(), userId, topic, score, timestamp);
      }
    })();
  }
}
