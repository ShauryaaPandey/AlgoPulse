import type { PlatformAdapter, SubmissionFetchOptions } from '../interface.js';
import type { PlatformProfile, PlatformContest } from '../../types/platform.js';
import type { PlatformSubmission } from '../../types/submission.js';
import type { PlatformProblem } from '../../types/problem.js';
import { CodeChefClient } from './client.js';
import {
  mapUserToProfile,
  mapSubmissionToPlatformSubmission,
  mapProblemToPlatformProblem
} from './mapper.js';

export class CodeChefAdapter implements PlatformAdapter {
  private client: CodeChefClient;
  private username: string;

  constructor(username: string) {
    this.username = username;
    this.client = new CodeChefClient();
  }

  async connect(): Promise<void> {
    return Promise.resolve();
  }

  async verifyProfile(username: string): Promise<boolean> {
    try {
      const data = await this.client.getProfilePageData(username);
      return data.profile.username.toLowerCase() === username.toLowerCase();
    } catch {
      return false;
    }
  }

  async getProfile(): Promise<PlatformProfile> {
    const data = await this.client.getProfilePageData(this.username);
    return mapUserToProfile(data.profile);
  }

  async getSubmissions(_options?: SubmissionFetchOptions): Promise<PlatformSubmission[]> {
    const data = await this.client.getProfilePageData(this.username);
    return data.recentSubmissions.map(sub =>
      mapSubmissionToPlatformSubmission(sub, this.username)
    );
  }

  async getContests(): Promise<PlatformContest[]> {
    return [];
  }

  async getProblems(): Promise<PlatformProblem[]> {
    const data = await this.client.getProfilePageData(this.username);
    const seen = new Set<string>();
    const problems: ReturnType<typeof mapProblemToPlatformProblem>[] = [];

    for (const sub of data.recentSubmissions) {
      if (sub.problemCode && !seen.has(sub.problemCode)) {
        seen.add(sub.problemCode);
        problems.push(mapProblemToPlatformProblem(sub.problemCode, sub.problemName));
      }
    }

    return problems;
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }
}
