import { Platform } from '../../config/constants.js';
import { PlatformError } from '../../utils/errors.js';
import { retry } from '../../utils/retry.js';
import {
  CodeforcesApiResponse,
  CodeforcesUser,
  CodeforcesSubmission,
  CodeforcesContest,
  CodeforcesProblem,
  CodeforcesProblemStatistics,
  CodeforcesRatingChange,
} from './types.js';

export class CodeforcesClient {
  private readonly baseUrl = 'https://codeforces.com/api';
  private lastRequestTime = 0;
  private readonly minIntervalMs = 2000;

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    if (elapsed < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    await this.waitForRateLimit();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    return retry(
      async () => {
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new PlatformError(
            Platform.CODEFORCES,
            `HTTP ${response.status}: ${response.statusText}`,
            undefined,
            response.status
          );
        }

        const data = await response.json() as CodeforcesApiResponse<T>;
        
        if (data.status === 'FAILED') {
          throw new PlatformError(
            Platform.CODEFORCES,
            data.comment || 'API request failed',
            data
          );
        }

        if (!data.result) {
          throw new PlatformError(
            Platform.CODEFORCES,
            'No result in API response',
            data
          );
        }

        return data.result;
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffFactor: 2,
        shouldRetry: (error) => {
          if (error instanceof PlatformError) {
            const status = error.statusCode;
            return status === 429 || status >= 500;
          }
          return true;
        },
      }
    );
  }

  async getUserInfo(handle: string): Promise<CodeforcesUser[]> {
    return this.request<CodeforcesUser[]>('/user.info', { handles: handle });
  }

  async getUserStatus(handle: string, from?: number, count?: number): Promise<CodeforcesSubmission[]> {
    const params: Record<string, string> = { handle };
    if (from !== undefined) params.from = from.toString();
    if (count !== undefined) params.count = count.toString();
    
    return this.request<CodeforcesSubmission[]>('/user.status', params);
  }

  async getUserRating(handle: string): Promise<CodeforcesRatingChange[]> {
    return this.request<CodeforcesRatingChange[]>('/user.rating', { handle });
  }

  async getContestList(gym?: boolean): Promise<CodeforcesContest[]> {
    const params: Record<string, string> = {};
    if (gym !== undefined) params.gym = gym.toString();
    
    return this.request<CodeforcesContest[]>('/contest.list', params);
  }

  async getProblemsetProblems(): Promise<{
    problems: CodeforcesProblem[];
    problemStatistics: CodeforcesProblemStatistics[];
  }> {
    return this.request<{
      problems: CodeforcesProblem[];
      problemStatistics: CodeforcesProblemStatistics[];
    }>('/problemset.problems');
  }
}
