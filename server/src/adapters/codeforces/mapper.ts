import { Platform } from '../../config/constants.js';
import { PlatformProfile, PlatformContest } from '../../types/platform.js';
import { PlatformSubmission } from '../../types/submission.js';
import { PlatformProblem } from '../../types/problem.js';
import {
  CodeforcesUser,
  CodeforcesSubmission,
  CodeforcesContest,
  CodeforcesProblem,
  CodeforcesRatingChange,
} from './types.js';

export function mapUserToProfile(user: CodeforcesUser): PlatformProfile {
  return {
    platform: Platform.CODEFORCES,
    username: user.handle,
    name: user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`.trim() 
      : null,
    avatarUrl: user.avatar ? `https:${user.avatar}` : null,
    rating: user.rating ?? null,
    maxRating: user.maxRating ?? null,
    rank: user.rank ?? null,
    solvedCount: null,
    globalRank: null,
    contributionPoints: user.contribution,
  };
}

export function mapSubmissionToPlatformSubmission(
  submission: CodeforcesSubmission,
  username: string
): PlatformSubmission {
  const problemId = submission.problem.contestId
    ? `${submission.problem.contestId}${submission.problem.index}`
    : submission.problem.index;

  return {
    external_submission_id: submission.id.toString(),
    platform: Platform.CODEFORCES,
    username,
    problem_external_id: problemId,
    problem_title: submission.problem.name,
    submitted_at: new Date(submission.creationTimeSeconds * 1000).toISOString(),
    language: submission.programmingLanguage,
    verdict: mapVerdict(submission.verdict),
    execution_time: submission.timeConsumedMillis,
    memory_used: submission.memoryConsumedBytes,
  };
}

export function mapVerdict(verdict?: string): string {
  if (!verdict) return 'PENDING';
  
  const verdictMap: Record<string, string> = {
    'OK': 'Accepted',
    'WRONG_ANSWER': 'Wrong Answer',
    'TIME_LIMIT_EXCEEDED': 'Time Limit Exceeded',
    'MEMORY_LIMIT_EXCEEDED': 'Memory Limit Exceeded',
    'RUNTIME_ERROR': 'Runtime Error',
    'COMPILATION_ERROR': 'Compilation Error',
    'IDLENESS_LIMIT_EXCEEDED': 'Time Limit Exceeded',
    'SECURITY_VIOLATED': 'Runtime Error',
    'CRASHED': 'Runtime Error',
    'INPUT_PREPARATION_CRASHED': 'Runtime Error',
    'CHALLENGED': 'Wrong Answer',
    'SKIPPED': 'Skipped',
    'TESTING': 'Testing',
    'REJECTED': 'Rejected',
  };
  
  return verdictMap[verdict] || verdict;
}

export function mapProblemToPlatformProblem(problem: CodeforcesProblem): PlatformProblem {
  const problemId = problem.contestId
    ? `${problem.contestId}${problem.index}`
    : problem.index;
  
  const url = problem.contestId
    ? `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
    : null;

  return {
    platform: Platform.CODEFORCES,
    external_id: problemId,
    title: problem.name,
    url,
    difficulty: null,
    rating: problem.rating ?? null,
    description: null,
    topics: problem.tags,
  };
}

export function mapRatingChangeToContest(
  ratingChange: CodeforcesRatingChange,
  contests: CodeforcesContest[]
): PlatformContest {
  const contest = contests.find(c => c.id === ratingChange.contestId);
  const contestDate = contest?.startTimeSeconds
    ? new Date(contest.startTimeSeconds * 1000).toISOString()
    : new Date(ratingChange.ratingUpdateTimeSeconds * 1000).toISOString();

  return {
    id: '',
    platform: Platform.CODEFORCES,
    external_id: ratingChange.contestId.toString(),
    name: ratingChange.contestName,
    date: contestDate,
    rating_change: ratingChange.newRating - ratingChange.oldRating,
    rank: ratingChange.rank,
  };
}
