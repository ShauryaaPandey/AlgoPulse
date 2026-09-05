import type Database from 'better-sqlite3';

interface SkillHistoryEntry {
  topic: string;
  score: number;
  timestamp: string;
}

export interface TopicProgress {
  topic: string;
  currentScore: number;
  previousScore: number;
  change: number;
  changePercent: number;
  trend: 'improving' | 'stable' | 'regressing';
  monthlyData: MonthlyScore[];
}

export interface MonthlyScore {
  month: string;
  score: number;
}

export interface ProgressSummary {
  topicProgress: TopicProgress[];
  biggestImprovement: string | null;
  biggestRegression: string | null;
  mostStable: string | null;
  slowImprovement: string[];
}

export class ProgressEngine {
  constructor(private db: Database.Database) {}

  analyzeProgress(userId: string): ProgressSummary {
    const history = this.getSkillHistory(userId);
    const topicMap = this.groupByTopic(history);

    const topicProgress = this.calculateTopicProgress(topicMap);

    const biggestImprovement = this.findBiggestImprovement(topicProgress);
    const biggestRegression = this.findBiggestRegression(topicProgress);
    const mostStable = this.findMostStable(topicProgress);
    const slowImprovement = this.findSlowImprovement(topicProgress);

    return {
      topicProgress,
      biggestImprovement,
      biggestRegression,
      mostStable,
      slowImprovement
    };
  }

  private getSkillHistory(userId: string): SkillHistoryEntry[] {
    const query = `
      SELECT topic, score, timestamp
      FROM skill_history
      WHERE user_id = ?
      ORDER BY timestamp ASC
    `;

    return this.db.prepare(query).all(userId) as SkillHistoryEntry[];
  }

  private groupByTopic(history: SkillHistoryEntry[]): Map<string, SkillHistoryEntry[]> {
    const topicMap = new Map<string, SkillHistoryEntry[]>();

    for (const entry of history) {
      if (!topicMap.has(entry.topic)) {
        topicMap.set(entry.topic, []);
      }
      topicMap.get(entry.topic)!.push(entry);
    }

    return topicMap;
  }

  private calculateTopicProgress(topicMap: Map<string, SkillHistoryEntry[]>): TopicProgress[] {
    const progress: TopicProgress[] = [];

    for (const [topic, entries] of topicMap.entries()) {
      if (entries.length < 2) continue;

      const monthlyData = this.aggregateMonthly(entries);
      const currentScore = entries[entries.length - 1].score;
      const previousScore = entries[0].score;
      const change = currentScore - previousScore;
      const changePercent = previousScore > 0 ? (change / previousScore) * 100 : 0;

      const trend = this.determineTrend(entries);

      progress.push({
        topic,
        currentScore: Math.round(currentScore),
        previousScore: Math.round(previousScore),
        change: Math.round(change * 10) / 10,
        changePercent: Math.round(changePercent * 10) / 10,
        trend,
        monthlyData
      });
    }

    return progress;
  }

  private aggregateMonthly(entries: SkillHistoryEntry[]): MonthlyScore[] {
    const monthlyMap = new Map<string, number[]>();

    for (const entry of entries) {
      const date = new Date(entry.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, []);
      }
      monthlyMap.get(monthKey)!.push(entry.score);
    }

    const monthly: MonthlyScore[] = [];
    for (const [month, scores] of monthlyMap.entries()) {
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      monthly.push({
        month,
        score: Math.round(avgScore)
      });
    }

    monthly.sort((a, b) => a.month.localeCompare(b.month));

    return monthly;
  }

  private determineTrend(entries: SkillHistoryEntry[]): 'improving' | 'stable' | 'regressing' {
    if (entries.length < 3) return 'stable';

    const recentCount = Math.min(5, Math.ceil(entries.length / 3));
    const recent = entries.slice(-recentCount);
    const older = entries.slice(0, Math.min(5, entries.length - recentCount));

    const recentAvg = recent.reduce((sum, e) => sum + e.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, e) => sum + e.score, 0) / older.length;

    const diff = recentAvg - olderAvg;

    if (diff > 5) return 'improving';
    if (diff < -5) return 'regressing';
    return 'stable';
  }

  private findBiggestImprovement(progress: TopicProgress[]): string | null {
    if (progress.length === 0) return null;

    const improving = progress.filter(p => p.change > 0);
    if (improving.length === 0) return null;

    improving.sort((a, b) => b.change - a.change);
    return improving[0].topic;
  }

  private findBiggestRegression(progress: TopicProgress[]): string | null {
    if (progress.length === 0) return null;

    const regressing = progress.filter(p => p.change < 0);
    if (regressing.length === 0) return null;

    regressing.sort((a, b) => a.change - b.change);
    return regressing[0].topic;
  }

  private findMostStable(progress: TopicProgress[]): string | null {
    if (progress.length === 0) return null;

    const stable = progress.filter(p => p.trend === 'stable');
    if (stable.length === 0) return null;

    stable.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
    return stable[0].topic;
  }

  private findSlowImprovement(progress: TopicProgress[]): string[] {
    const slow = progress.filter(p => {
      return p.change > 0 && p.change < 10 && p.monthlyData.length >= 3;
    });

    slow.sort((a, b) => a.change - b.change);

    return slow.slice(0, 5).map(p => p.topic);
  }
}
