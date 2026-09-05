import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Submission } from '../../types/submission.js';

export class SubmissionsRepository {
  constructor(private db: Database.Database) {}

  findByPlatformAccountAndExternalId(
    platformAccountId: string,
    externalSubmissionId: string
  ): Submission | undefined {
    return this.db
      .prepare('SELECT * FROM submissions WHERE platform_account_id = ? AND external_submission_id = ?')
      .get(platformAccountId, externalSubmissionId) as Submission | undefined;
  }

  findByProblemId(problemId: string): Submission[] {
    return this.db
      .prepare('SELECT * FROM submissions WHERE problem_id = ? ORDER BY submitted_at DESC')
      .all(problemId) as Submission[];
  }

  findByPlatformAccountId(platformAccountId: string, limit = 100): Submission[] {
    return this.db
      .prepare('SELECT * FROM submissions WHERE platform_account_id = ? ORDER BY submitted_at DESC LIMIT ?')
      .all(platformAccountId, limit) as Submission[];
  }

  insert(submission: Omit<Submission, 'id'>): Submission {
    const id = randomUUID();

    this.db.prepare(`
      INSERT INTO submissions (
        id, problem_id, platform_account_id, external_submission_id,
        submitted_at, language, verdict, attempt_number,
        execution_time, memory_used
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      submission.problem_id,
      submission.platform_account_id,
      submission.external_submission_id,
      submission.submitted_at,
      submission.language,
      submission.verdict,
      submission.attempt_number,
      submission.execution_time,
      submission.memory_used
    );

    return { id, ...submission };
  }

  upsert(submission: Omit<Submission, 'id'>): Submission {
    const existing = this.findByPlatformAccountAndExternalId(
      submission.platform_account_id,
      submission.external_submission_id
    );

    if (existing) {
      this.db.prepare(`
        UPDATE submissions
        SET verdict = ?, execution_time = ?, memory_used = ?
        WHERE id = ?
      `).run(
        submission.verdict,
        submission.execution_time,
        submission.memory_used,
        existing.id
      );
      return { ...existing, ...submission };
    }

    return this.insert(submission);
  }

  countByPlatformAccountId(platformAccountId: string): number {
    const result = this.db
      .prepare('SELECT COUNT(*) as count FROM submissions WHERE platform_account_id = ?')
      .get(platformAccountId) as { count: number };
    return result.count;
  }

  getLatestSubmissionTime(platformAccountId: string): string | null {
    const result = this.db
      .prepare('SELECT MAX(submitted_at) as latest FROM submissions WHERE platform_account_id = ?')
      .get(platformAccountId) as { latest: string | null };
    return result.latest;
  }
}
