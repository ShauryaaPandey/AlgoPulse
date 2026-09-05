import { Verdict } from '../config/constants.js';

export { Verdict };

export interface Submission {
  id: string;
  problem_id: string;
  platform_account_id: string;
  external_submission_id: string;
  submitted_at: string;
  language: string;
  verdict: Verdict | string;
  attempt_number: number;
  execution_time: number | null;
  memory_used: number | null;
}

export interface PlatformSubmission {
  external_submission_id: string;
  platform: string;
  username: string;
  problem_external_id: string;
  problem_title?: string;
  submitted_at: string;
  language: string;
  verdict: Verdict | string;
  execution_time?: number | null;
  memory_used?: number | null;
}

export interface SubmissionFilter {
  userId?: string;
  platformAccountId?: string;
  platform?: string;
  verdict?: Verdict | string;
  language?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface SubmissionStats {
  total: number;
  accepted: number;
  wrongAnswer: number;
  timeLimitExceeded: number;
  runtimeError: number;
  memoryLimitExceeded: number;
  compilationError: number;
  other: number;
  acceptanceRate: number;
}
