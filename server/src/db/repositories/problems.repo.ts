import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Problem } from '../../types/problem.js';

export class ProblemsRepository {
  constructor(private db: Database.Database) {}

  findByPlatformAndExternalId(platform: string, externalId: string): Problem | undefined {
    return this.db
      .prepare('SELECT * FROM problems WHERE platform = ? AND external_id = ?')
      .get(platform, externalId) as Problem | undefined;
  }

  findById(id: string): Problem | undefined {
    return this.db
      .prepare('SELECT * FROM problems WHERE id = ?')
      .get(id) as Problem | undefined;
  }

  insert(problem: Omit<Problem, 'id'>): Problem {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO problems (id, platform, external_id, title, url, difficulty, rating, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      problem.platform,
      problem.external_id,
      problem.title,
      problem.url,
      problem.difficulty,
      problem.rating,
      problem.description,
      now
    );

    return { id, ...problem, created_at: now };
  }

  upsert(problem: Omit<Problem, 'id' | 'created_at'>): Problem {
    const existing = this.findByPlatformAndExternalId(problem.platform, problem.external_id);

    if (existing) {
      this.db.prepare(`
        UPDATE problems 
        SET title = ?, url = ?, difficulty = ?, rating = ?, description = ?
        WHERE id = ?
      `).run(
        problem.title,
        problem.url,
        problem.difficulty,
        problem.rating,
        problem.description,
        existing.id
      );
      return { ...existing, ...problem };
    }

    return this.insert({ ...problem, created_at: new Date().toISOString() });
  }

  insertTopics(problemId: string, topics: string[]): void {
    for (const topic of topics) {
      const existing = this.db
        .prepare('SELECT id FROM problem_topics WHERE problem_id = ? AND topic = ?')
        .get(problemId, topic);

      if (!existing) {
        this.db.prepare(`
          INSERT INTO problem_topics (id, problem_id, topic, confidence)
          VALUES (?, ?, ?, ?)
        `).run(randomUUID(), problemId, topic, 1.0);
      }
    }
  }
}
