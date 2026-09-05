import { Platform } from '../../config/constants.js';
import { PlatformError, RateLimitError } from '../../utils/errors.js';
import { retry } from '../../utils/retry.js';
import type {
  LeetCodeGraphQLResponse,
  LeetCodeUserProfileData,
  LeetCodeRecentSubmissionData,
  LeetCodeAllProblemsData,
} from './types.js';

const GRAPHQL_URL = 'https://leetcode.com/graphql';

const USER_PROFILE_QUERY = `
  query getUserPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        realName
        userAvatar
        ranking
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
        totalSubmissionNum {
          difficulty
          count
          submissions
        }
      }
    }
  }
`;

const RECENT_SUBMISSIONS_QUERY = `
  query getRecentSubmissions($username: String!, $limit: Int) {
    recentSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }
`;

const PROBLEMSET_QUERY = `
  query problemsetQuestionList($limit: Int, $skip: Int) {
    problemsetQuestionList: questionList(
      categorySlug: ""
      limit: $limit
      skip: $skip
      filters: {}
    ) {
      total: totalNum
      questions: data {
        questionId: frontendQuestionId
        title
        titleSlug
        difficulty
        topicTags {
          name
          slug
        }
      }
    }
  }
`;

export class LeetCodeClient {
  private lastRequestTime = 0;
  private readonly minIntervalMs = 1000;

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, this.minIntervalMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    await this.waitForRateLimit();

    return retry(
      async () => {
        const response = await fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Referer': 'https://leetcode.com',
            'Origin': 'https://leetcode.com',
            'User-Agent': 'Mozilla/5.0 (compatible; AlgoPulse/1.0)'
          },
          body: JSON.stringify({ query, variables })
        });

        if (response.status === 429) {
          throw new RateLimitError('LeetCode rate limit hit', 30000);
        }

        if (!response.ok) {
          throw new PlatformError(Platform.LEETCODE, `HTTP ${response.status}: ${response.statusText}`, undefined, response.status);
        }

        const json = await response.json() as LeetCodeGraphQLResponse<T>;

        if (json.errors && json.errors.length > 0) {
          throw new PlatformError(Platform.LEETCODE, json.errors[0]!.message, json.errors);
        }

        return json.data;
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffFactor: 2,
        shouldRetry: (error) => {
          if (error instanceof RateLimitError) return true;
          if (error instanceof PlatformError) return error.statusCode >= 500;
          return true;
        }
      }
    );
  }

  async getUserProfile(username: string): Promise<LeetCodeUserProfileData> {
    return this.graphql<LeetCodeUserProfileData>(USER_PROFILE_QUERY, { username });
  }

  async getRecentSubmissions(username: string, limit = 20): Promise<LeetCodeRecentSubmissionData> {
    return this.graphql<LeetCodeRecentSubmissionData>(RECENT_SUBMISSIONS_QUERY, { username, limit });
  }

  async getProblemset(limit = 100, skip = 0): Promise<LeetCodeAllProblemsData> {
    return this.graphql<LeetCodeAllProblemsData>(PROBLEMSET_QUERY, { limit, skip });
  }
}
