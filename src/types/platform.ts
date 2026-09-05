import { Platform } from '../config/constants.js';

export { Platform };

export interface PlatformAccount {
  id: string;
  user_id: string;
  platform: Platform | string;
  username: string;
  profile_url: string | null;
  connected_at: string;
  last_verified_at: string | null;
  last_synced_at: string | null;
}

export interface PlatformProfile {
  platform: Platform | string;
  username: string;
  name?: string | null;
  avatarUrl?: string | null;
  rating?: number | null;
  maxRating?: number | null;
  rank?: string | null;
  solvedCount?: number | null;
  globalRank?: number | null;
  contributionPoints?: number | null;
}

export interface PlatformContest {
  id: string;
  platform: Platform | string;
  external_id: string;
  name: string;
  date: string;
  rating_change: number | null;
  rank: number | null;
}

export interface ContestProblem {
  id: string;
  contest_id: string;
  problem_id: string;
  problem_index: string;
}

export interface ContestSubmission {
  id: string;
  contest_id: string;
  submission_id: string;
}
