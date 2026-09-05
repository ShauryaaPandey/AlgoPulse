import { PlatformProfile, PlatformContest } from '../types/platform.js';
import { PlatformSubmission } from '../types/submission.js';
import { PlatformProblem } from '../types/problem.js';

export interface SubmissionFetchOptions {
  from?: number;
  count?: number;
  fromTime?: number;
}

export interface PlatformAdapter {
  connect(): Promise<void>;
  verifyProfile(username: string): Promise<boolean>;
  getProfile(): Promise<PlatformProfile>;
  getSubmissions(options?: SubmissionFetchOptions): Promise<PlatformSubmission[]>;
  getContests(): Promise<PlatformContest[]>;
  getProblems(): Promise<PlatformProblem[]>;
  disconnect(): Promise<void>;
}
