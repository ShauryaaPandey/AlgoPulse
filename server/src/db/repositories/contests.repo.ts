import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { PlatformContest, ContestProblem } from '../../types/platform.js';

export class ContestsRepository {
  constructor(private db: Database.Database) {}

  findByPlatformAndExternalId(platform: string, externalId: string): PlatformContest | undefined {
    return this.db
      .prepare('SELECT * FROM contests WHERE platform = ? AND external_id = ?')
      .get(platform, externalId) as PlatformContest | undefined;
  }

  insert(contest: Omit<PlatformContest, 'id'>): PlatformContest {
    const id = randomUUID();

    this.db.prepare(`
      INSERT INTO contests (id, platform, external_id, name, date, rating_change, rank)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      contest.platform,
      contest.external_id,
      contest.name,
      contest.date,
      contest.rating_change,
      contest.rank
    );

    return { id, ...contest };
  }

  upsert(contest: Omit<PlatformContest, 'id'>): PlatformContest {
    const existing = this.findByPlatformAndExternalId(contest.platform, contest.external_id);

    if (existing) {
      this.db.prepare(`
        UPDATE contests
        SET name = ?, date = ?, rating_change = ?, rank = ?
        WHERE id = ?
      `).run(
        contest.name,
        contest.date,
        contest.rating_change,
        contest.rank,
        existing.id
      );
      return { ...existing, ...contest };
    }

    return this.insert(contest);
  }

  linkProblem(contestId: string, problemId: string, problemIndex: string): void {
    const existing = this.db
      .prepare('SELECT id FROM contest_problems WHERE contest_id = ? AND problem_id = ?')
      .get(contestId, problemId);

    if (!existing) {
      this.db.prepare(`
        INSERT INTO contest_problems (id, contest_id, problem_id, problem_index)
        VALUES (?, ?, ?, ?)
      `).run(randomUUID(), contestId, problemId, problemIndex);
    }
  }

  linkSubmission(contestId: string, submissionId: string): void {
    const existing = this.db
      .prepare('SELECT id FROM contest_submissions WHERE contest_id = ? AND submission_id = ?')
      .get(contestId, submissionId);

    if (!existing) {
      this.db.prepare(`
        INSERT INTO contest_submissions (id, contest_id, submission_id)
        VALUES (?, ?, ?)
      `).run(randomUUID(), contestId, submissionId);
    }
  }
}
