import type { PlatformSubmission } from '../types/submission.js';
import type { PlatformProblem } from '../types/problem.js';
import type { PlatformContest } from '../types/platform.js';

export class Deduplicator {
  deduplicateProblems(problems: PlatformProblem[]): PlatformProblem[] {
    const seen = new Set<string>();
    const unique: PlatformProblem[] = [];

    for (const problem of problems) {
      const key = `${problem.platform}:${problem.external_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(problem);
      }
    }

    return unique;
  }

  deduplicateSubmissions(submissions: PlatformSubmission[]): PlatformSubmission[] {
    const seen = new Set<string>();
    const unique: PlatformSubmission[] = [];

    for (const submission of submissions) {
      const key = `${submission.platform}:${submission.external_submission_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(submission);
      }
    }

    return unique;
  }

  deduplicateContests(contests: PlatformContest[]): PlatformContest[] {
    const seen = new Set<string>();
    const unique: PlatformContest[] = [];

    for (const contest of contests) {
      const key = `${contest.platform}:${contest.external_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(contest);
      }
    }

    return unique;
  }
}
