import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

interface FailureData {
  verdict: string;
  topic: string;
  difficulty: string | null;
  rating: number | null;
  language: string;
  attempt_number: number;
  submitted_at: string;
}

export interface FailurePattern {
  topic: string;
  failureType: string;
  frequency: number;
  severity: number;
  description: string;
  firstDetected: string;
  lastDetected: string;
}

export interface FailureBreakdown {
  verdictDistribution: Record<string, number>;
  patterns: FailurePattern[];
  topicFailures: Record<string, number>;
}

export class FailureEngine {
  constructor(private db: Database.Database) {}

  analyzeFailures(userId: string): FailureBreakdown {
    const failures = this.getFailureData(userId);

    const verdictDistribution = this.calculateVerdictDistribution(failures);
    const topicFailures = this.calculateTopicFailures(failures);
    const patterns = this.detectPatterns(failures);

    this.saveFailurePatterns(userId, patterns);

    return {
      verdictDistribution,
      patterns,
      topicFailures
    };
  }

  private getFailureData(userId: string): FailureData[] {
    const query = `
      SELECT 
        s.verdict,
        s.language,
        s.attempt_number,
        s.submitted_at,
        p.difficulty,
        p.rating,
        pt.topic
      FROM submissions s
      JOIN problems p ON s.problem_id = p.id
      LEFT JOIN problem_topics pt ON p.id = pt.problem_id
      JOIN platform_accounts pa ON s.platform_account_id = pa.id
      WHERE pa.user_id = ? AND s.verdict != 'Accepted' AND s.verdict != 'AC'
      ORDER BY s.submitted_at ASC
    `;

    return this.db.prepare(query).all(userId) as FailureData[];
  }

  private calculateVerdictDistribution(failures: FailureData[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const failure of failures) {
      distribution[failure.verdict] = (distribution[failure.verdict] || 0) + 1;
    }

    return distribution;
  }

  private calculateTopicFailures(failures: FailureData[]): Record<string, number> {
    const topicFailures: Record<string, number> = {};

    for (const failure of failures) {
      if (failure.topic) {
        topicFailures[failure.topic] = (topicFailures[failure.topic] || 0) + 1;
      }
    }

    return topicFailures;
  }

  private detectPatterns(failures: FailureData[]): FailurePattern[] {
    const patterns: FailurePattern[] = [];

    const topicVerdictMap = new Map<string, Map<string, FailureData[]>>();

    for (const failure of failures) {
      if (!failure.topic) continue;

      if (!topicVerdictMap.has(failure.topic)) {
        topicVerdictMap.set(failure.topic, new Map());
      }

      const verdictMap = topicVerdictMap.get(failure.topic)!;
      if (!verdictMap.has(failure.verdict)) {
        verdictMap.set(failure.verdict, []);
      }

      verdictMap.get(failure.verdict)!.push(failure);
    }

    for (const [topic, verdictMap] of topicVerdictMap.entries()) {
      for (const [verdict, failureList] of verdictMap.entries()) {
        if (failureList.length >= 3) {
          const pattern = this.classifyPattern(topic, verdict, failureList);
          if (pattern) {
            patterns.push(pattern);
          }
        }
      }
    }

    patterns.sort((a, b) => b.severity - a.severity);

    return patterns;
  }

  private classifyPattern(topic: string, verdict: string, failures: FailureData[]): FailurePattern | null {
    const frequency = failures.length;
    const firstDetected = failures[0]!.submitted_at;
    const lastDetected = failures[failures.length - 1]!.submitted_at;

    let failureType = verdict;
    let description = '';
    let severity = frequency / 10;

    const topicLower = topic.toLowerCase();

    if (verdict === 'Wrong Answer' || verdict === 'WA') {
      if (topicLower.includes('binary') || topicLower.includes('search')) {
        failureType = 'boundary-errors';
        description = 'Incorrect boundaries or off-by-one errors in binary search';
        severity *= 1.5;
      } else if (topicLower.includes('dynamic') || topicLower.includes('dp')) {
        failureType = 'dp-state-errors';
        description = 'Incorrect DP state transitions or base cases';
        severity *= 1.3;
      } else if (topicLower.includes('graph') || topicLower.includes('tree')) {
        failureType = 'graph-logic-errors';
        description = 'Graph traversal or edge case handling issues';
        severity *= 1.2;
      } else {
        failureType = 'logic-errors';
        description = 'General logic or algorithm implementation errors';
      }
    } else if (verdict === 'Runtime Error' || verdict === 'RE') {
      if (topicLower.includes('array') || topicLower.includes('string')) {
        failureType = 'array-bounds';
        description = 'Out-of-bounds array/string access';
        severity *= 1.4;
      } else if (topicLower.includes('pointer') || topicLower.includes('tree') || topicLower.includes('graph')) {
        failureType = 'null-pointer';
        description = 'Null/undefined pointer dereference';
        severity *= 1.3;
      } else {
        failureType = 'runtime-error';
        description = 'Runtime crashes or invalid operations';
      }
    } else if (verdict === 'Time Limit Exceeded' || verdict === 'TLE') {
      const avgRating = failures.reduce((sum, f) => {
        const rating = f.rating || (f.difficulty === 'Easy' ? 1000 : f.difficulty === 'Medium' ? 1500 : 2000);
        return sum + rating;
      }, 0) / failures.length;

      if (avgRating < 1500) {
        failureType = 'inefficient-algorithm';
        description = 'Using O(N²) or higher complexity when O(N log N) or O(N) is required';
        severity *= 1.6;
      } else {
        failureType = 'optimization-needed';
        description = 'Algorithm needs optimization or better data structures';
        severity *= 1.2;
      }
    } else if (verdict === 'Memory Limit Exceeded' || verdict === 'MLE') {
      failureType = 'memory-inefficient';
      description = 'Excessive memory usage or memory leaks';
      severity *= 1.3;
    } else if (verdict === 'Compilation Error' || verdict === 'CE') {
      failureType = 'syntax-errors';
      description = 'Syntax errors or language-specific issues';
      severity *= 0.8;
    }

    severity = Math.min(10, severity);

    return {
      topic,
      failureType,
      frequency,
      severity: Math.round(severity * 100) / 100,
      description,
      firstDetected,
      lastDetected
    };
  }

  private saveFailurePatterns(userId: string, patterns: FailurePattern[]): void {
    this.db.transaction(() => {
      const deleteStmt = this.db.prepare('DELETE FROM failure_patterns WHERE user_id = ?');
      deleteStmt.run(userId);

      const insertStmt = this.db.prepare(`
        INSERT INTO failure_patterns (id, user_id, topic, failure_type, frequency, severity, first_detected, last_detected)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const pattern of patterns) {
        insertStmt.run(
          uuidv4(),
          userId,
          pattern.topic,
          pattern.failureType,
          pattern.frequency,
          pattern.severity,
          pattern.firstDetected,
          pattern.lastDetected
        );
      }
    })();
  }
}
