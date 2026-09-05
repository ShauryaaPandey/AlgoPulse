import { PlatformAdapter, SubmissionFetchOptions } from '../interface.js';
import { PlatformProfile, PlatformContest } from '../../types/platform.js';
import { PlatformSubmission } from '../../types/submission.js';
import { PlatformProblem } from '../../types/problem.js';
import { CodeforcesClient } from './client.js';
import {
  mapUserToProfile,
  mapSubmissionToPlatformSubmission,
  mapProblemToPlatformProblem,
  mapRatingChangeToContest,
} from './mapper.js';

export class CodeforcesAdapter implements PlatformAdapter {
  private client: CodeforcesClient;
  private username: string;

  constructor(username: string) {
    this.username = username;
    this.client = new CodeforcesClient();
  }

  async connect(): Promise<void> {
    return Promise.resolve();
  }

  async verifyProfile(username: string): Promise<boolean> {
    try {
      const users = await this.client.getUserInfo(username);
      return users.length > 0 && users[0]!.handle.toLowerCase() === username.toLowerCase();
    } catch {
      return false;
    }
  }

  async getProfile(): Promise<PlatformProfile> {
    const users = await this.client.getUserInfo(this.username);
    
    if (users.length === 0 || !users[0]) {
      throw new Error(`User ${this.username} not found`);
    }
    
    return mapUserToProfile(users[0]);
  }

  async getSubmissions(options?: SubmissionFetchOptions): Promise<PlatformSubmission[]> {
    const submissions = await this.client.getUserStatus(
      this.username,
      options?.from,
      options?.count
    );
    
    return submissions.map(sub => 
      mapSubmissionToPlatformSubmission(sub, this.username)
    );
  }

  async getContests(): Promise<PlatformContest[]> {
    const [ratingChanges, allContests] = await Promise.all([
      this.client.getUserRating(this.username),
      this.client.getContestList(false),
    ]);
    
    return ratingChanges.map(change => 
      mapRatingChangeToContest(change, allContests)
    );
  }

  async getProblems(): Promise<PlatformProblem[]> {
    const result = await this.client.getProblemsetProblems();
    return result.problems.map(mapProblemToPlatformProblem);
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }
}
