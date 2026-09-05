import { Platform } from '../config/constants.js';

export interface SyncState {
  id: string;
  platform_account_id: string;
  cursor: string | null;
  last_submission_time: string | null;
  last_sync: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  problem_id: string;
  reason: string;
  priority: number;
  created_at: string;
  completed_at: string | null;
}

export interface TopicStat {
  topic: string;
  totalSubmissions: number;
  acceptedSubmissions: number;
  accuracy: number;
  currentSkillScore: number;
}

export interface MonthlyActivity {
  month: string;
  submissionsCount: number;
  acceptedCount: number;
  uniqueProblemsCount: number;
}

export interface PlatformAnalytics {
  platform: Platform | string;
  username: string;
  rating: number | null;
  rank: string | null;
  problemsSolved: number;
  contestCount: number;
}

export interface UserAnalytics {
  userId: string;
  totalProblemsSolved: number;
  totalSubmissions: number;
  overallAcceptanceRate: number;
  platforms: PlatformAnalytics[];
  topStrengths: TopicStat[];
  focusAreas: TopicStat[];
  activeStreakDays: number;
  monthlyActivity: MonthlyActivity[];
}
