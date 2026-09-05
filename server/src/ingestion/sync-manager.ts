import type Database from 'better-sqlite3';
import type { PlatformAdapter } from '../adapters/interface.js';
import type { PlatformAccount } from '../types/platform.js';
import { ProblemsRepository } from '../db/repositories/problems.repo.js';
import { SubmissionsRepository } from '../db/repositories/submissions.repo.js';
import { ContestsRepository } from '../db/repositories/contests.repo.js';
import { SyncStateRepository } from '../db/repositories/sync-state.repo.js';
import { PlatformAccountsRepository } from '../db/repositories/platform-accounts.repo.js';
import { Normalizer } from './normalizer.js';
import { Deduplicator } from './deduplicator.js';
import { Fetcher } from './fetcher.js';
import { logger } from '../utils/logger.js';
import { Platform } from '../config/constants.js';
import { CodeforcesAdapter } from '../adapters/codeforces/adapter.js';

export interface SyncResult {
  platform: string;
  newSubmissions: number;
  newProblems: number;
  newContests: number;
  syncedAt: string;
}

export class SyncManager {
  private normalizer: Normalizer;
  private deduplicator: Deduplicator;
  private fetcher: Fetcher;

  constructor(private db: Database.Database) {
    this.normalizer = new Normalizer();
    this.deduplicator = new Deduplicator();
    this.fetcher = new Fetcher();
  }

  private getAdapter(platform: string, username: string): PlatformAdapter | null {
    switch (platform) {
      case Platform.CODEFORCES:
        return new CodeforcesAdapter(username);
      default:
        return null;
    }
  }

  async syncPlatformAccount(
    platformAccount: PlatformAccount,
    fullSync = false
  ): Promise<SyncResult> {
    logger.info(`Starting sync for ${platformAccount.platform} account: ${platformAccount.username}`);

    const adapter = this.getAdapter(platformAccount.platform, platformAccount.username);
    if (!adapter) {
      throw new Error(`No adapter available for platform: ${platformAccount.platform}`);
    }

    const syncStateRepo = new SyncStateRepository(this.db);
    const syncState = syncStateRepo.findByPlatformAccountId(platformAccount.id);

    const options = fullSync || !syncState ? undefined : {
      from: syncState.cursor ? parseInt(syncState.cursor) : undefined
    };

    const fetchResult = await this.fetcher.fetchAll(adapter, options);

    const uniqueSubmissions = this.deduplicator.deduplicateSubmissions(fetchResult.submissions);
    const uniqueProblems = this.deduplicator.deduplicateProblems(fetchResult.problems);
    const uniqueContests = this.deduplicator.deduplicateContests(fetchResult.contests);

    const syncedAt = new Date().toISOString();

    const result = this.db.transaction(() => {
      const problemsRepo = new ProblemsRepository(this.db);
      const submissionsRepo = new SubmissionsRepository(this.db);
      const contestsRepo = new ContestsRepository(this.db);
      const platformAccountsRepo = new PlatformAccountsRepository(this.db);

      let newProblems = 0;
      let newSubmissions = 0;
      let newContests = 0;

      const problemMap = new Map<string, string>();

      for (const platformProblem of uniqueProblems) {
        const normalized = this.normalizer.normalizeProblem(platformProblem);
        const existing = problemsRepo.findByPlatformAndExternalId(normalized.platform, normalized.external_id);

        if (!existing) {
          const inserted = problemsRepo.insert(normalized);
          problemMap.set(normalized.external_id, inserted.id);
          if (normalized.topics.length > 0) {
            problemsRepo.insertTopics(inserted.id, normalized.topics);
          }
          newProblems++;
        } else {
          problemMap.set(normalized.external_id, existing.id);
        }
      }

      for (const platformSubmission of uniqueSubmissions) {
        let problemId = problemMap.get(platformSubmission.problem_external_id);

        if (!problemId) {
          const existingProblem = problemsRepo.findByPlatformAndExternalId(
            platformSubmission.platform,
            platformSubmission.problem_external_id
          );

          if (existingProblem) {
            problemId = existingProblem.id;
          } else {
            const newProblem = problemsRepo.insert({
              platform: platformSubmission.platform,
              external_id: platformSubmission.problem_external_id,
              title: platformSubmission.problem_title || platformSubmission.problem_external_id,
              url: null,
              difficulty: null,
              rating: null,
              description: null,
              created_at: syncedAt
            });
            problemId = newProblem.id;
            newProblems++;
          }

          problemMap.set(platformSubmission.problem_external_id, problemId);
        }

        const normalized = this.normalizer.normalizeSubmission(
          platformSubmission,
          problemId,
          platformAccount.id
        );

        const existing = submissionsRepo.findByPlatformAccountAndExternalId(
          platformAccount.id,
          platformSubmission.external_submission_id
        );

        if (!existing) {
          submissionsRepo.insert(normalized);
          newSubmissions++;
        }
      }

      for (const platformContest of uniqueContests) {
        const normalized = this.normalizer.normalizeContest(platformContest);
        const existing = contestsRepo.findByPlatformAndExternalId(normalized.platform, normalized.external_id);

        if (!existing) {
          contestsRepo.insert(normalized);
          newContests++;
        }
      }

      const latestSubmissionTime = submissionsRepo.getLatestSubmissionTime(platformAccount.id);

      syncStateRepo.upsert({
        platform_account_id: platformAccount.id,
        cursor: uniqueSubmissions.length > 0 ? uniqueSubmissions.length.toString() : syncState?.cursor || null,
        last_submission_time: latestSubmissionTime,
        last_sync: syncedAt
      });

      platformAccountsRepo.updateLastSynced(platformAccount.id, syncedAt);

      return {
        platform: platformAccount.platform,
        newSubmissions,
        newProblems,
        newContests,
        syncedAt
      };
    })();

    logger.info(`Sync completed for ${platformAccount.platform}: ${result.newSubmissions} submissions, ${result.newProblems} problems, ${result.newContests} contests`);

    return result;
  }

  async syncAllForUser(userId: string, fullSync = false): Promise<SyncResult[]> {
    const platformAccountsRepo = new PlatformAccountsRepository(this.db);
    const accounts = platformAccountsRepo.findByUserId(userId);

    const results: SyncResult[] = [];

    for (const account of accounts) {
      try {
        const result = await this.syncPlatformAccount(account, fullSync);
        results.push(result);
      } catch (error) {
        logger.error(`Sync failed for ${account.platform}:`, error);
        results.push({
          platform: account.platform,
          newSubmissions: 0,
          newProblems: 0,
          newContests: 0,
          syncedAt: new Date().toISOString()
        });
      }
    }

    return results;
  }

  async syncPlatformForUser(userId: string, platform: string, fullSync = false): Promise<SyncResult> {
    const platformAccountsRepo = new PlatformAccountsRepository(this.db);
    const account = platformAccountsRepo.findByUserIdAndPlatform(userId, platform);

    if (!account) {
      throw new Error(`No ${platform} account connected for user`);
    }

    return this.syncPlatformAccount(account, fullSync);
  }
}
