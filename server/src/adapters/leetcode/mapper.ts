import { Platform } from '../../config/constants.js';
import type { PlatformProfile, PlatformContest } from '../../types/platform.js';
import type { PlatformSubmission } from '../../types/submission.js';
import type { PlatformProblem } from '../../types/problem.js';
import type {
  LeetCodeUserProfileData,
  LeetCodeRecentSubmission,
} from './types.js';

export function mapUserToProfile(data: LeetCodeUserProfileData): PlatformProfile {
  const user = data.matchedUser;

  const allAccepted = user?.submitStats.acSubmissionNum.find(s => s.difficulty === 'All');
  const solvedCount = allAccepted?.count ?? null;

  return {
    platform: Platform.LEETCODE,
    username: user?.username ?? '',
    name: user?.profile.realName || null,
    avatarUrl: user?.profile.userAvatar || null,
    rating: null,
    maxRating: null,
    rank: user?.profile.ranking ? `#${user.profile.ranking}` : null,
    solvedCount,
    globalRank: user?.profile.ranking ?? null,
    contributionPoints: null
  };
}

export function mapSubmissionToplatformSubmission(
  submission: LeetCodeRecentSubmission,
  username: string
): PlatformSubmission {
  return {
    external_submission_id: submission.id,
    platform: Platform.LEETCODE,
    username,
    problem_external_id: submission.titleSlug,
    problem_title: submission.title,
    submitted_at: new Date(Number(submission.timestamp) * 1000).toISOString(),
    language: mapLanguage(submission.lang),
    verdict: mapVerdict(submission.statusDisplay),
    execution_time: null,
    memory_used: null
  };
}

export function mapVerdict(status: string): string {
  const map: Record<string, string> = {
    'Accepted': 'Accepted',
    'Wrong Answer': 'Wrong Answer',
    'Time Limit Exceeded': 'Time Limit Exceeded',
    'Memory Limit Exceeded': 'Memory Limit Exceeded',
    'Runtime Error': 'Runtime Error',
    'Compile Error': 'Compilation Error',
    'Output Limit Exceeded': 'Wrong Answer',
    'Presentation Error': 'Wrong Answer',
    'Time limit exceeded': 'Time Limit Exceeded',
    'Memory limit exceeded': 'Memory Limit Exceeded'
  };
  return map[status] ?? status;
}

export function mapLanguage(lang: string): string {
  const map: Record<string, string> = {
    'cpp': 'C++',
    'java': 'Java',
    'python': 'Python 2',
    'python3': 'Python 3',
    'c': 'C',
    'csharp': 'C#',
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'php': 'PHP',
    'swift': 'Swift',
    'kotlin': 'Kotlin',
    'dart': 'Dart',
    'golang': 'Go',
    'ruby': 'Ruby',
    'scala': 'Scala',
    'rust': 'Rust',
    'racket': 'Racket',
    'erlang': 'Erlang',
    'elixir': 'Elixir',
    'mysql': 'MySQL',
    'mssql': 'MS SQL Server',
    'oraclesql': 'Oracle SQL',
    'pythondata': 'Pandas'
  };
  return map[lang] ?? lang;
}

export function mapProblemToPlatformProblem(problem: {
  questionFrontendId?: string;
  questionId?: string;
  title: string;
  titleSlug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'Easy' | 'Medium' | 'Hard';
  topicTags: Array<{ name: string; slug: string }>;
}): PlatformProblem {
  const normalizedDifficulty = normalizeDifficulty(problem.difficulty);
  return {
    platform: Platform.LEETCODE,
    external_id: problem.titleSlug,
    title: problem.title,
    url: `https://leetcode.com/problems/${problem.titleSlug}/`,
    difficulty: normalizedDifficulty,
    rating: difficultyToRating(normalizedDifficulty),
    description: null,
    topics: problem.topicTags.map(t => t.name)
  };
}

export function mapContests(): PlatformContest[] {
  return [];
}

function normalizeDifficulty(difficulty: string): 'Easy' | 'Medium' | 'Hard' {
  const upper = difficulty.toUpperCase();
  if (upper === 'EASY' || upper === 'Easy') return 'Easy';
  if (upper === 'MEDIUM' || upper === 'Medium') return 'Medium';
  return 'Hard';
}

function difficultyToRating(difficulty: 'Easy' | 'Medium' | 'Hard'): number {
  if (difficulty === 'Easy') return 1000;
  if (difficulty === 'Medium') return 1500;
  return 2000;
}
