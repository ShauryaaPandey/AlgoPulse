import { Platform } from '../../config/constants.js';
import type { PlatformProfile, PlatformContest } from '../../types/platform.js';
import type { PlatformSubmission } from '../../types/submission.js';
import type { PlatformProblem } from '../../types/problem.js';
import type { CodeChefUserProfile, CodeChefSubmission } from './types.js';

export function mapUserToProfile(profile: CodeChefUserProfile): PlatformProfile {
  return {
    platform: Platform.CODECHEF,
    username: profile.username,
    name: profile.name || null,
    avatarUrl: null,
    rating: profile.currentRating,
    maxRating: profile.highestRating,
    rank: profile.stars ? `${profile.stars}★` : null,
    solvedCount: null,
    globalRank: profile.globalRank,
    contributionPoints: null
  };
}

export function mapSubmissionToPlatformSubmission(
  submission: CodeChefSubmission,
  username: string
): PlatformSubmission {
  return {
    external_submission_id: submission.id,
    platform: Platform.CODECHEF,
    username,
    problem_external_id: submission.problemCode,
    problem_title: submission.problemName || submission.problemCode,
    submitted_at: parseDate(submission.date),
    language: mapLanguage(submission.language),
    verdict: mapVerdict(submission.result),
    execution_time: null,
    memory_used: null
  };
}

export function mapVerdict(result: string): string {
  const r = result.trim().toLowerCase();
  if (r === 'ac' || r === 'accepted' || r === 'correct answer') return 'Accepted';
  if (r === 'wa' || r === 'wrong answer') return 'Wrong Answer';
  if (r === 'tle' || r === 'time limit exceeded') return 'Time Limit Exceeded';
  if (r === 'mle' || r === 'memory limit exceeded') return 'Memory Limit Exceeded';
  if (r === 're' || r === 'runtime error') return 'Runtime Error';
  if (r === 'ce' || r === 'compile error' || r === 'compilation error') return 'Compilation Error';
  return result || 'Unknown';
}

export function mapLanguage(lang: string): string {
  const l = lang.trim().toLowerCase();
  if (l.includes('c++') || l === 'cpp' || l === 'cpp17' || l === 'cpp14') return 'C++';
  if (l === 'c') return 'C';
  if (l.includes('java')) return 'Java';
  if (l.includes('python')) return lang.includes('3') ? 'Python 3' : 'Python 2';
  if (l.includes('javascript') || l === 'js' || l === 'nodejs') return 'JavaScript';
  return lang;
}

export function mapProblemToPlatformProblem(code: string, name: string): PlatformProblem {
  return {
    platform: Platform.CODECHEF,
    external_id: code,
    title: name || code,
    url: `https://www.codechef.com/problems/${code}`,
    difficulty: null,
    rating: null,
    description: null,
    topics: []
  };
}

export function mapContests(): PlatformContest[] {
  return [];
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();

  const cleaned = dateStr.trim();

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();

  const slashMatch = cleaned.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return new Date(`${year}-${month}-${day}`).toISOString();
  }

  return new Date().toISOString();
}
