import type Database from 'better-sqlite3';

interface ContestSubmissionData {
  problemIndex: string;
  verdict: string;
  contestId: string;
  contestDate: string;
  executionTime: number | null;
  attemptNumber: number;
}

export interface ProblemIndexStats {
  index: string;
  totalAttempts: number;
  solvedCount: number;
  solveRate: number;
  avgAttempts: number;
  avgTime: number | null;
}

export interface ContestPerformance {
  indexStats: ProblemIndexStats[];
  totalContests: number;
  overallSolveRate: number;
  strengths: string[];
  weaknesses: string[];
  recentTrend: 'improving' | 'stable' | 'declining';
}

export class ContestEngine {
  constructor(private db: Database.Database) {}

  analyzeContestPerformance(userId: string): ContestPerformance {
    const submissions = this.getContestSubmissions(userId);
    
    const indexStats = this.calculateIndexStats(submissions);
    const totalContests = this.countTotalContests(userId);
    const overallSolveRate = this.calculateOverallSolveRate(submissions);
    const strengths = this.identifyStrengths(indexStats);
    const weaknesses = this.identifyWeaknesses(indexStats);
    const recentTrend = this.calculateRecentTrend(submissions);

    return {
      indexStats,
      totalContests,
      overallSolveRate,
      strengths,
      weaknesses,
      recentTrend
    };
  }

  private getContestSubmissions(userId: string): ContestSubmissionData[] {
    const query = `
      SELECT 
        cp.problem_index as problemIndex,
        s.verdict,
        s.execution_time as executionTime,
        s.attempt_number as attemptNumber,
        c.id as contestId,
        c.date as contestDate
      FROM contest_submissions cs
      JOIN submissions s ON cs.submission_id = s.id
      JOIN contests c ON cs.contest_id = c.id
      JOIN contest_problems cp ON c.id = cp.contest_id AND s.problem_id = cp.problem_id
      JOIN platform_accounts pa ON s.platform_account_id = pa.id
      WHERE pa.user_id = ?
      ORDER BY c.date ASC
    `;

    return this.db.prepare(query).all(userId) as ContestSubmissionData[];
  }

  private countTotalContests(userId: string): number {
    const query = `
      SELECT COUNT(DISTINCT c.id) as count
      FROM contests c
      JOIN contest_submissions cs ON c.id = cs.contest_id
      JOIN submissions s ON cs.submission_id = s.id
      JOIN platform_accounts pa ON s.platform_account_id = pa.id
      WHERE pa.user_id = ?
    `;

    const result = this.db.prepare(query).get(userId) as { count: number };
    return result.count;
  }

  private calculateIndexStats(submissions: ContestSubmissionData[]): ProblemIndexStats[] {
    const indexMap = new Map<string, ContestSubmissionData[]>();

    for (const sub of submissions) {
      if (!indexMap.has(sub.problemIndex)) {
        indexMap.set(sub.problemIndex, []);
      }
      indexMap.get(sub.problemIndex)!.push(sub);
    }

    const stats: ProblemIndexStats[] = [];

    for (const [index, subs] of indexMap.entries()) {
      const totalAttempts = subs.length;
      const solvedCount = subs.filter(s => s.verdict === 'Accepted' || s.verdict === 'AC').length;
      const solveRate = totalAttempts > 0 ? (solvedCount / totalAttempts) * 100 : 0;

      const contestGroups = this.groupByContest(subs);
      const avgAttempts = contestGroups.reduce((sum, group) => sum + group.length, 0) / contestGroups.length;

      const timeSubs = subs.filter(s => s.executionTime !== null && (s.verdict === 'Accepted' || s.verdict === 'AC'));
      const avgTime = timeSubs.length > 0
        ? timeSubs.reduce((sum, s) => sum + s.executionTime!, 0) / timeSubs.length
        : null;

      stats.push({
        index,
        totalAttempts,
        solvedCount,
        solveRate: Math.round(solveRate * 10) / 10,
        avgAttempts: Math.round(avgAttempts * 10) / 10,
        avgTime: avgTime !== null ? Math.round(avgTime) : null
      });
    }

    stats.sort((a, b) => a.index.localeCompare(b.index));

    return stats;
  }

  private groupByContest(submissions: ContestSubmissionData[]): ContestSubmissionData[][] {
    const contestMap = new Map<string, ContestSubmissionData[]>();

    for (const sub of submissions) {
      if (!contestMap.has(sub.contestId)) {
        contestMap.set(sub.contestId, []);
      }
      contestMap.get(sub.contestId)!.push(sub);
    }

    return Array.from(contestMap.values());
  }

  private calculateOverallSolveRate(submissions: ContestSubmissionData[]): number {
    if (submissions.length === 0) return 0;

    const solved = submissions.filter(s => s.verdict === 'Accepted' || s.verdict === 'AC').length;
    return Math.round((solved / submissions.length) * 100 * 10) / 10;
  }

  private identifyStrengths(stats: ProblemIndexStats[]): string[] {
    const strengths = stats
      .filter(s => s.solveRate >= 70 && s.totalAttempts >= 3)
      .sort((a, b) => b.solveRate - a.solveRate)
      .slice(0, 3)
      .map(s => `Problem ${s.index}`);

    return strengths;
  }

  private identifyWeaknesses(stats: ProblemIndexStats[]): string[] {
    const weaknesses = stats
      .filter(s => s.solveRate < 40 && s.totalAttempts >= 3)
      .sort((a, b) => a.solveRate - b.solveRate)
      .slice(0, 3)
      .map(s => `Problem ${s.index}`);

    return weaknesses;
  }

  private calculateRecentTrend(submissions: ContestSubmissionData[]): 'improving' | 'stable' | 'declining' {
    if (submissions.length < 10) return 'stable';

    const midPoint = Math.floor(submissions.length / 2);
    const older = submissions.slice(0, midPoint);
    const recent = submissions.slice(midPoint);

    const olderSolveRate = older.filter(s => s.verdict === 'Accepted' || s.verdict === 'AC').length / older.length;
    const recentSolveRate = recent.filter(s => s.verdict === 'Accepted' || s.verdict === 'AC').length / recent.length;

    const diff = recentSolveRate - olderSolveRate;

    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }
}
