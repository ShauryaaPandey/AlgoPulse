import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  mapUserToProfile,
  mapSubmissionToplatformSubmission,
  mapVerdict,
  mapLanguage,
  mapProblemToPlatformProblem
} from '../../src/adapters/leetcode/mapper.js';
import type { LeetCodeUserProfileData, LeetCodeRecentSubmission } from '../../src/adapters/leetcode/types.js';

const FIXTURE_PROFILE: LeetCodeUserProfileData = {
  matchedUser: {
    username: 'torvalds',
    profile: {
      realName: 'Linus Torvalds',
      userAvatar: 'https://assets.leetcode.com/users/torvalds/avatar.png',
      ranking: 42
    },
    submitStats: {
      acSubmissionNum: [
        { difficulty: 'All', count: 350, submissions: 420 },
        { difficulty: 'Easy', count: 150, submissions: 160 },
        { difficulty: 'Medium', count: 160, submissions: 200 },
        { difficulty: 'Hard', count: 40, submissions: 60 }
      ],
      totalSubmissionNum: [
        { difficulty: 'All', count: 500, submissions: 600 },
        { difficulty: 'Easy', count: 200, submissions: 210 },
        { difficulty: 'Medium', count: 230, submissions: 300 },
        { difficulty: 'Hard', count: 70, submissions: 90 }
      ]
    }
  }
};

const FIXTURE_SUBMISSION: LeetCodeRecentSubmission = {
  id: '1234567',
  title: 'Two Sum',
  titleSlug: 'two-sum',
  timestamp: '1704067200',
  statusDisplay: 'Accepted',
  lang: 'python3'
};

describe('LeetCode Mapper', () => {
  describe('mapUserToProfile', () => {
    it('should map a full profile correctly', () => {
      const result = mapUserToProfile(FIXTURE_PROFILE);

      assert.strictEqual(result.platform, 'leetcode');
      assert.strictEqual(result.username, 'torvalds');
      assert.strictEqual(result.name, 'Linus Torvalds');
      assert.strictEqual(result.avatarUrl, 'https://assets.leetcode.com/users/torvalds/avatar.png');
      assert.strictEqual(result.globalRank, 42);
      assert.strictEqual(result.solvedCount, 350);
      assert.strictEqual(result.rating, null);
    });

    it('should handle null matchedUser gracefully', () => {
      const result = mapUserToProfile({ matchedUser: null });
      assert.strictEqual(result.username, '');
      assert.strictEqual(result.name, null);
      assert.strictEqual(result.solvedCount, null);
    });

    it('should return null name when realName is empty', () => {
      const fixture = {
        matchedUser: {
          ...FIXTURE_PROFILE.matchedUser!,
          profile: { ...FIXTURE_PROFILE.matchedUser!.profile, realName: '' }
        }
      };
      const result = mapUserToProfile(fixture);
      assert.strictEqual(result.name, null);
    });
  });

  describe('mapSubmissionToplatformSubmission', () => {
    it('should map a submission correctly', () => {
      const result = mapSubmissionToplatformSubmission(FIXTURE_SUBMISSION, 'torvalds');

      assert.strictEqual(result.platform, 'leetcode');
      assert.strictEqual(result.username, 'torvalds');
      assert.strictEqual(result.external_submission_id, '1234567');
      assert.strictEqual(result.problem_external_id, 'two-sum');
      assert.strictEqual(result.problem_title, 'Two Sum');
      assert.strictEqual(result.verdict, 'Accepted');
      assert.strictEqual(result.language, 'Python 3');
      assert.strictEqual(result.submitted_at, new Date(1704067200 * 1000).toISOString());
    });

    it('should map language codes correctly', () => {
      const cases: [string, string][] = [
        ['cpp', 'C++'],
        ['java', 'Java'],
        ['python', 'Python 2'],
        ['python3', 'Python 3'],
        ['javascript', 'JavaScript'],
        ['golang', 'Go'],
        ['rust', 'Rust']
      ];

      for (const [input, expected] of cases) {
        const sub: LeetCodeRecentSubmission = { ...FIXTURE_SUBMISSION, lang: input };
        const result = mapSubmissionToplatformSubmission(sub, 'u');
        assert.strictEqual(result.language, expected, `lang '${input}' should map to '${expected}'`);
      }
    });
  });

  describe('mapVerdict', () => {
    it('should map known verdict strings', () => {
      assert.strictEqual(mapVerdict('Accepted'), 'Accepted');
      assert.strictEqual(mapVerdict('Wrong Answer'), 'Wrong Answer');
      assert.strictEqual(mapVerdict('Time Limit Exceeded'), 'Time Limit Exceeded');
      assert.strictEqual(mapVerdict('Memory Limit Exceeded'), 'Memory Limit Exceeded');
      assert.strictEqual(mapVerdict('Runtime Error'), 'Runtime Error');
      assert.strictEqual(mapVerdict('Compile Error'), 'Compilation Error');
    });

    it('should pass through unknown verdicts unchanged', () => {
      assert.strictEqual(mapVerdict('Pending'), 'Pending');
    });
  });

  describe('mapLanguage', () => {
    it('should map cpp to C++', () => {
      assert.strictEqual(mapLanguage('cpp'), 'C++');
    });

    it('should return the original string for unknown languages', () => {
      assert.strictEqual(mapLanguage('brainfuck'), 'brainfuck');
    });
  });

  describe('mapProblemToPlatformProblem', () => {
    it('should map problem data correctly', () => {
      const result = mapProblemToPlatformProblem({
        questionId: '1',
        title: 'Two Sum',
        titleSlug: 'two-sum',
        difficulty: 'Easy',
        topicTags: [{ name: 'Array', slug: 'array' }, { name: 'Hash Table', slug: 'hash-table' }]
      });

      assert.strictEqual(result.platform, 'leetcode');
      assert.strictEqual(result.external_id, 'two-sum');
      assert.strictEqual(result.title, 'Two Sum');
      assert.strictEqual(result.url, 'https://leetcode.com/problems/two-sum/');
      assert.strictEqual(result.difficulty, 'Easy');
      assert.strictEqual(result.rating, 1000);
      assert.deepStrictEqual(result.topics, ['Array', 'Hash Table']);
    });

    it('should assign correct rating for each difficulty', () => {
      const cases: ['Easy' | 'Medium' | 'Hard', number][] = [
        ['Easy', 1000],
        ['Medium', 1500],
        ['Hard', 2000]
      ];
      for (const [difficulty, expectedRating] of cases) {
        const result = mapProblemToPlatformProblem({
          questionId: '1', title: 'X', titleSlug: 'x', difficulty, topicTags: []
        });
        assert.strictEqual(result.rating, expectedRating);
      }
    });
  });
});
