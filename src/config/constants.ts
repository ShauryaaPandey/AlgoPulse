export enum Platform {
  CODEFORCES = 'codeforces',
  LEETCODE = 'leetcode',
  CODECHEF = 'codechef',
}

export const PLATFORMS = [
  Platform.CODEFORCES,
  Platform.LEETCODE,
  Platform.CODECHEF,
] as const;

export enum Verdict {
  ACCEPTED = 'Accepted',
  WRONG_ANSWER = 'Wrong Answer',
  TIME_LIMIT_EXCEEDED = 'Time Limit Exceeded',
  RUNTIME_ERROR = 'Runtime Error',
  MEMORY_LIMIT_EXCEEDED = 'Memory Limit Exceeded',
  COMPILATION_ERROR = 'Compilation Error',
}

export const VERDICTS = [
  Verdict.ACCEPTED,
  Verdict.WRONG_ANSWER,
  Verdict.TIME_LIMIT_EXCEEDED,
  Verdict.RUNTIME_ERROR,
  Verdict.MEMORY_LIMIT_EXCEEDED,
  Verdict.COMPILATION_ERROR,
] as const;

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  minIntervalMs: number;
}

export const DEFAULT_RATE_LIMITS: Record<Platform | 'default', RateLimitConfig> = {
  [Platform.CODEFORCES]: {
    maxRequests: 1,
    windowMs: 2000,
    minIntervalMs: 2000,
  },
  [Platform.LEETCODE]: {
    maxRequests: 10,
    windowMs: 10000,
    minIntervalMs: 1000,
  },
  [Platform.CODECHEF]: {
    maxRequests: 10,
    windowMs: 10000,
    minIntervalMs: 1000,
  },
  default: {
    maxRequests: 10,
    windowMs: 10000,
    minIntervalMs: 1000,
  },
};
