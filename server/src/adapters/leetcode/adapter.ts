import type { PlatformAdapter, SubmissionFetchOptions } from '../interface.js';
import type { PlatformProfile, PlatformContest } from '../../types/platform.js';
import type { PlatformSubmission } from '../../types/submission.js';
import type { PlatformProblem } from '../../types/problem.js';
import { LeetCodeClient } from './client.js';
import {
  mapUserToProfile,
  mapSubmissionToplatformSubmission,
  mapProblemToPlatformProblem
} from './mapper.js';

export class LeetCodeAdapter implements PlatformAdapter {
  private client: LeetCodeClient;
  private username: string;

  constructor(username: string) {
    this.username = username;
    this.client = new LeetCodeClient();
  }

  async connect(): Promise<void> {
    return Promise.resolve();
  }

  async verifyProfile(username: string): Promise<boolean> {
    try {
      const data = await this.client.getUserProfile(username);
      return data.matchedUser !== null && data.matchedUser?.username.toLowerCase() === username.toLowerCase();
    } catch {
      return false;
    }
  }

  async getProfile(): Promise<PlatformProfile> {
    const data = await this.client.getUserProfile(this.username);
    return mapUserToProfile(data);
  }

  async getSubmissions(options?: SubmissionFetchOptions): Promise<PlatformSubmission[]> {
    const limit = options?.count ?? 20;
    const data = await this.client.getRecentSubmissions(this.username, limit);
    const list = data.recentSubmissionList ?? [];
    return list.map(sub => mapSubmissionToplatformSubmission(sub, this.username));
  }

  async getContests(): Promise<PlatformContest[]> {
    return [];
  }

  async getProblems(): Promise<PlatformProblem[]> {
    const data = await this.client.getProblemset(100, 0);
    const questions = data.problemsetQuestionList?.questions ?? [];
    return questions.map(mapProblemToPlatformProblem);
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }
}
