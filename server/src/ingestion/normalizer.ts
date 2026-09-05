import type { PlatformSubmission } from '../types/submission.js';
import type { PlatformProblem } from '../types/problem.js';
import type { PlatformContest } from '../types/platform.js';
import type { Problem } from '../types/problem.js';
import type { Submission } from '../types/submission.js';

export interface NormalizedProblem {
  platform: string;
  external_id: string;
  title: string;
  url: string | null;
  difficulty: string | null;
  rating: number | null;
  description: string | null;
  created_at: string;
  topics: string[];
}

export interface NormalizedSubmission {
  problem_id: string;
  platform_account_id: string;
  external_submission_id: string;
  submitted_at: string;
  language: string;
  verdict: string;
  attempt_number: number;
  execution_time: number | null;
  memory_used: number | null;
}

export interface NormalizedContest {
  platform: string;
  external_id: string;
  name: string;
  date: string;
  rating_change: number | null;
  rank: number | null;
}

export class Normalizer {
  normalizeProblem(platformProblem: PlatformProblem): NormalizedProblem {
    return {
      platform: platformProblem.platform,
      external_id: platformProblem.external_id,
      title: platformProblem.title,
      url: platformProblem.url ?? null,
      difficulty: platformProblem.difficulty ?? null,
      rating: platformProblem.rating ?? null,
      description: platformProblem.description ?? null,
      created_at: new Date().toISOString(),
      topics: platformProblem.topics || []
    };
  }

  normalizeSubmission(
    platformSubmission: PlatformSubmission,
    problemId: string,
    platformAccountId: string
  ): NormalizedSubmission {
    const existingAttempts = 1;

    return {
      problem_id: problemId,
      platform_account_id: platformAccountId,
      external_submission_id: platformSubmission.external_submission_id,
      submitted_at: platformSubmission.submitted_at,
      language: platformSubmission.language,
      verdict: platformSubmission.verdict,
      attempt_number: existingAttempts,
      execution_time: platformSubmission.execution_time ?? null,
      memory_used: platformSubmission.memory_used ?? null
    };
  }

  normalizeContest(platformContest: PlatformContest): NormalizedContest {
    return {
      platform: platformContest.platform,
      external_id: platformContest.external_id,
      name: platformContest.name,
      date: platformContest.date,
      rating_change: platformContest.rating_change,
      rank: platformContest.rank
    };
  }
}
