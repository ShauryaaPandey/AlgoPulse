import type { PlatformAdapter, SubmissionFetchOptions } from '../adapters/interface.js';
import type { PlatformSubmission } from '../types/submission.js';
import type { PlatformProblem } from '../types/problem.js';
import type { PlatformContest } from '../types/platform.js';
import { logger } from '../utils/logger.js';

export interface FetchResult {
  submissions: PlatformSubmission[];
  problems: PlatformProblem[];
  contests: PlatformContest[];
}

export class Fetcher {
  async fetchAll(adapter: PlatformAdapter, options?: SubmissionFetchOptions): Promise<FetchResult> {
    logger.info('Fetching data from adapter');

    await adapter.connect();

    try {
      const [submissions, problems, contests] = await Promise.all([
        adapter.getSubmissions(options),
        adapter.getProblems().catch(err => {
          logger.warn('Failed to fetch problems:', err);
          return [];
        }),
        adapter.getContests().catch(err => {
          logger.warn('Failed to fetch contests:', err);
          return [];
        })
      ]);

      logger.info(`Fetched ${submissions.length} submissions, ${problems.length} problems, ${contests.length} contests`);

      return { submissions, problems, contests };
    } finally {
      await adapter.disconnect();
    }
  }

  async fetchSubmissions(adapter: PlatformAdapter, options?: SubmissionFetchOptions): Promise<PlatformSubmission[]> {
    await adapter.connect();
    try {
      return await adapter.getSubmissions(options);
    } finally {
      await adapter.disconnect();
    }
  }
}
